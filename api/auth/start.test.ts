import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "./start";

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

const makeReq = (): VercelRequest =>
  ({ query: {}, headers: {} }) as unknown as VercelRequest;

describe("api/auth/start", () => {
  const ORIG = { ...process.env };
  beforeEach(() => {
    process.env.REDDIT_CLIENT_ID = "cid";
    process.env.REDDIT_REDIRECT_URI = "https://redfeed.app/api/auth/callback";
    process.env.COOKIE_SIGNING_KEY = "key";
  });
  afterEach(() => {
    process.env = { ...ORIG };
  });

  it("returns 500 if env is missing", () => {
    delete process.env.COOKIE_SIGNING_KEY;
    const res = makeRes();
    handler(makeReq(), asRes(res));
    expect(res._status).toBe(500);
  });

  it("redirects to reddit with state, scopes, and duration=permanent", () => {
    const res = makeRes();
    handler(makeReq(), asRes(res));
    expect(res._status).toBe(302);
    const loc = res._headers["Location"] as string;
    expect(loc).toContain("https://www.reddit.com/api/v1/authorize");
    expect(loc).toContain("client_id=cid");
    expect(loc).toContain("redirect_uri=https%3A%2F%2Fredfeed.app%2Fapi%2Fauth%2Fcallback");
    expect(loc).toContain("duration=permanent");
    expect(loc).toMatch(/scope=identity[+%20]read/);
    expect(loc).toMatch(/state=[A-Za-z0-9_-]+/);
  });

  it("sets a signed state cookie with HttpOnly Secure SameSite=Lax", () => {
    const res = makeRes();
    handler(makeReq(), asRes(res));
    const cookie = res._headers["Set-Cookie"] as string;
    expect(cookie).toContain("rf_oauth_state=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
  });
});
