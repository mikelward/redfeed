import { describe, it, expect, afterEach, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "./thread";

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

const makeReq = (query: Record<string, string>): VercelRequest =>
  ({ query }) as unknown as VercelRequest;

describe("api/thread", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("rejects invalid sub", async () => {
    const res = makeRes();
    await handler(makeReq({ sub: "bad!", id: "abc" }), res);
    expect(res._status).toBe(400);
  });

  it("rejects invalid id", async () => {
    const res = makeRes();
    await handler(makeReq({ sub: "pics", id: "BAD-ID" }), res);
    expect(res._status).toBe(400);
  });

  it("rejects invalid sort", async () => {
    const res = makeRes();
    await handler(makeReq({ sub: "pics", id: "abc", sort: "garbage" }), res);
    expect(res._status).toBe(400);
  });

  it("proxies to reddit comments endpoint with User-Agent", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "[{}, {}]",
    }));
    vi.stubGlobal("fetch", fetchMock);
    const res = makeRes();
    await handler(makeReq({ sub: "pics", id: "abc" }), res);
    expect(res._status).toBe(200);
    const [url, opts] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/r/pics/comments/abc.json");
    expect(url).toContain("raw_json=1");
    expect((opts.headers as Record<string, string>)["User-Agent"]).toMatch(
      /redfeed/,
    );
  });

  it("forwards upstream 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, text: async () => "" })),
    );
    const res = makeRes();
    await handler(makeReq({ sub: "pics", id: "abc" }), res);
    expect(res._status).toBe(404);
  });
});
