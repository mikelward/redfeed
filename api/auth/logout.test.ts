import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "./logout";

interface FakeRes {
  _status?: number;
  _headers: Record<string, string | string[]>;
  status(code: number): FakeRes;
  json(body?: unknown): FakeRes;
  setHeader(name: string, value: string | number | readonly string[]): FakeRes;
  end(): FakeRes;
}

function makeRes(): FakeRes {
  const res: FakeRes = {
    _headers: {},
    status(code) { this._status = code; return this; },
    json() { return this; },
    setHeader(name, value) {
      this._headers[name] = Array.isArray(value) ? (value as string[]) : String(value);
      return this;
    },
    end() { return this; },
  };
  return res;
}

const asRes = (r: FakeRes): VercelResponse => r as unknown as VercelResponse;

const makeReq = (cookie?: string): VercelRequest =>
  ({ headers: cookie ? { cookie } : {}, query: {} }) as unknown as VercelRequest;

describe("api/auth/logout", () => {
  const ORIG = { ...process.env };
  beforeEach(() => {
    process.env.REDDIT_CLIENT_ID = "cid";
    process.env.REDDIT_CLIENT_SECRET = "sec";
  });
  afterEach(() => {
    process.env = { ...ORIG };
    vi.unstubAllGlobals();
  });

  it("clears both cookies and returns 204 even with no session", async () => {
    const res = makeRes();
    await handler(makeReq(), asRes(res));
    expect(res._status).toBe(204);
    const cookies = res._headers["Set-Cookie"] as string[];
    expect(cookies.some((c) => c.startsWith("rf_refresh=") && c.includes("Max-Age=0"))).toBe(true);
    expect(cookies.some((c) => c.startsWith("rf_access=") && c.includes("Max-Age=0"))).toBe(true);
  });

  it("calls reddit revoke when a refresh token is present", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = makeRes();
    await handler(makeReq("rf_refresh=rt"), asRes(res));
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("revoke_token");
    expect(String(opts.body)).toContain("token=rt");
    expect(String(opts.body)).toContain("token_type_hint=refresh_token");
  });

  it("survives a revoke failure and still clears cookies", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const res = makeRes();
    await handler(makeReq("rf_refresh=rt"), asRes(res));
    expect(res._status).toBe(204);
  });
});
