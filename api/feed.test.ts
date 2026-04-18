import { describe, it, expect, afterEach, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "./feed";

function makeRes() {
  const res: Partial<VercelResponse> & {
    _status?: number;
    _body?: unknown;
    _headers: Record<string, string>;
  } = {
    _headers: {},
    status(code: number) {
      this._status = code;
      return this as VercelResponse;
    },
    json(body: unknown) {
      this._body = body;
      return this as VercelResponse;
    },
    send(body: unknown) {
      this._body = body;
      return this as VercelResponse;
    },
    setHeader(name: string, value: string | number | readonly string[]) {
      this._headers[name] = String(value);
      return this as VercelResponse;
    },
  };
  return res as VercelResponse & {
    _status?: number;
    _body?: unknown;
    _headers: Record<string, string>;
  };
}

function makeReq(query: Record<string, string>): VercelRequest {
  return { query } as unknown as VercelRequest;
}

const ORIGINAL_ENV = { ...process.env };

describe("api/feed", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...ORIGINAL_ENV };
  });

  it("rejects invalid sub", async () => {
    const res = makeRes();
    await handler(makeReq({ sub: "bad sub!" }), res);
    expect(res._status).toBe(400);
  });

  it("rejects invalid sort", async () => {
    const res = makeRes();
    await handler(makeReq({ sub: "popular", sort: "banana" }), res);
    expect(res._status).toBe(400);
  });

  it("proxies to reddit with User-Agent and returns upstream body", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '{"kind":"Listing","data":{"children":[]}}',
    }));
    vi.stubGlobal("fetch", fetchMock);

    const res = makeRes();
    await handler(makeReq({ sub: "popular", sort: "hot" }), res);

    expect(res._status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [calledUrl, opts] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(calledUrl).toContain("https://www.reddit.com/r/popular/hot.json");
    expect(calledUrl).toContain("limit=25");
    expect((opts.headers as Record<string, string>)["User-Agent"]).toMatch(/redfeed/);
    expect(res._headers["Cache-Control"]).toContain("max-age");
  });

  it("forwards upstream non-ok status", async () => {
    process.env.REDDIT_CLIENT_ID = "cid";
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/api/v1/access_token")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: "tok", expires_in: 3600 }),
        };
      }
      return { ok: false, status: 403, text: async () => "" };
    });
    vi.stubGlobal("fetch", fetchMock);
    const res = makeRes();
    await handler(makeReq({ sub: "popular" }), res);
    expect(res._status).toBe(403);
  });

  it("returns 502 on fetch error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const res = makeRes();
    await handler(makeReq({ sub: "popular" }), res);
    expect(res._status).toBe(502);
  });

  it("returns 503 reddit_credentials_missing upfront on Vercel when CLIENT_ID is unset", async () => {
    delete process.env.REDDIT_CLIENT_ID;
    process.env.VERCEL = "1";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = makeRes();
    await handler(makeReq({ sub: "popular" }), res);
    expect(res._status).toBe(503);
    expect(res._body).toMatchObject({ error: "reddit_credentials_missing" });
    expect((res._body as { detail: string }).detail).toMatch(/Reddit/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to anonymous reads in local dev when CLIENT_ID is unset", async () => {
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.VERCEL;
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '{"kind":"Listing","data":{"children":[]}}',
    }));
    vi.stubGlobal("fetch", fetchMock);
    const res = makeRes();
    await handler(makeReq({ sub: "popular" }), res);
    expect(res._status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("does not flag credentials_missing when CLIENT_ID is set", async () => {
    process.env.REDDIT_CLIENT_ID = "cid";
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/api/v1/access_token")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: "tok", expires_in: 3600 }),
        };
      }
      return { ok: false, status: 403, text: async () => "" };
    });
    vi.stubGlobal("fetch", fetchMock);
    const res = makeRes();
    await handler(makeReq({ sub: "popular" }), res);
    expect(res._status).toBe(403);
    expect((res._body as { error: string }).error).toBe("reddit 403");
  });
});
