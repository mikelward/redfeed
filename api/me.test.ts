import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "./me";

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
    status(code) {
      this._status = code;
      return this;
    },
    json(body) {
      this._body = body;
      return this;
    },
    setHeader(name, value) {
      this._headers[name] = Array.isArray(value)
        ? (value as string[])
        : String(value);
      return this;
    },
    end() {
      return this;
    },
  };
  return res;
}

const asRes = (r: FakeRes): VercelResponse => r as unknown as VercelResponse;

const makeReq = (cookie?: string): VercelRequest =>
  ({ headers: cookie ? { cookie } : {}, query: {} }) as unknown as VercelRequest;

describe("api/me", () => {
  const ORIG = { ...process.env };
  beforeEach(() => {
    process.env.REDDIT_CLIENT_ID = "cid";
    process.env.REDDIT_CLIENT_SECRET = "sec";
  });
  afterEach(() => {
    process.env = { ...ORIG };
    vi.unstubAllGlobals();
  });

  it("returns 401 when no cookies present", async () => {
    const res = makeRes();
    await handler(makeReq(), asRes(res));
    expect(res._status).toBe(401);
  });

  it("returns user name when access cookie is present", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ name: "alice", total_karma: 42 }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const res = makeRes();
    await handler(makeReq("rf_access=at"), asRes(res));
    expect(res._status).toBe(200);
    const body = res._body as { name: string; total_karma: number };
    expect(body.name).toBe("alice");
    expect(body.total_karma).toBe(42);
    const [url, opts] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://oauth.reddit.com/api/v1/me?raw_json=1");
    expect((opts.headers as Record<string, string>).Authorization).toBe(
      "Bearer at",
    );
  });
});
