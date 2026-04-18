import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "./callback";
import { signedCookieValue } from "../_cookies";

interface FakeRes {
  _status?: number;
  _headers: Record<string, string | string[]>;
  _body?: unknown;
  status(code: number): FakeRes;
  json(body: unknown): FakeRes;
  setHeader(name: string, value: string | number | readonly string[]): FakeRes;
  end(): FakeRes;
}

function makeRes(): FakeRes {
  const res: FakeRes = {
    _headers: {},
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
    setHeader(name, value) {
      this._headers[name] = Array.isArray(value) ? (value as string[]) : String(value);
      return this;
    },
    end() { return this; },
  };
  return res;
}

const asRes = (r: FakeRes): VercelResponse => r as unknown as VercelResponse;

function makeReq(query: Record<string, string>, cookie?: string): VercelRequest {
  return {
    query,
    headers: cookie ? { cookie } : {},
  } as unknown as VercelRequest;
}

const KEY = "test-key";

describe("api/auth/callback", () => {
  const ORIG = { ...process.env };
  beforeEach(() => {
    process.env.REDDIT_CLIENT_ID = "cid";
    process.env.REDDIT_CLIENT_SECRET = "sec";
    process.env.REDDIT_REDIRECT_URI = "https://redfeed.app/api/auth/callback";
    process.env.COOKIE_SIGNING_KEY = KEY;
  });
  afterEach(() => {
    process.env = { ...ORIG };
    vi.unstubAllGlobals();
  });

  it("rejects when state cookie is missing", async () => {
    const res = makeRes();
    await handler(makeReq({ code: "abc", state: "nonce" }), asRes(res));
    expect(res._status).toBe(400);
  });

  it("rejects when state mismatches signed cookie payload", async () => {
    const cookie = `rf_oauth_state=${signedCookieValue("real-nonce", KEY)}`;
    const res = makeRes();
    await handler(makeReq({ code: "abc", state: "wrong-nonce" }, cookie), asRes(res));
    expect(res._status).toBe(400);
  });

  it("forwards reddit error param to /?login_error=...", async () => {
    const res = makeRes();
    await handler(makeReq({ error: "access_denied" }), asRes(res));
    expect(res._status).toBe(302);
    expect(res._headers["Location"]).toContain("login_error=access_denied");
  });

  it("on good state, exchanges code and sets refresh + access cookies", async () => {
    const cookie = `rf_oauth_state=${signedCookieValue("nonce", KEY)}`;
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "at",
        refresh_token: "rt",
        expires_in: 3600,
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const res = makeRes();
    await handler(makeReq({ code: "abc", state: "nonce" }, cookie), asRes(res));

    expect(res._status).toBe(302);
    expect(res._headers["Location"]).toBe("/");
    const cookies = res._headers["Set-Cookie"] as string[];
    expect(cookies.some((c) => c.startsWith("rf_access=at"))).toBe(true);
    expect(cookies.some((c) => c.startsWith("rf_refresh=rt"))).toBe(true);
    expect(cookies.some((c) => c.startsWith("rf_oauth_state="))).toBe(true);
  });

  it("redirects to /?login_error= when token exchange returns null", async () => {
    const cookie = `rf_oauth_state=${signedCookieValue("nonce", KEY)}`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 400, json: async () => ({}) })),
    );
    const res = makeRes();
    await handler(makeReq({ code: "abc", state: "nonce" }, cookie), asRes(res));
    expect(res._status).toBe(302);
    expect(res._headers["Location"]).toContain("login_error=token_exchange_failed");
  });
});
