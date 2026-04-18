import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  _clearTokenCacheForTests,
  checkRedditCredentials,
  exchangeCode,
  getAppOnlyToken,
  getUserToken,
  redditFetch,
  refreshUserToken,
  revokeToken,
  userAgent,
} from "./_redditAuth";

interface FakeRes {
  _headers: Record<string, string | string[]>;
  setHeader(name: string, value: string | number | readonly string[]): FakeRes;
  status(): FakeRes;
  json(): FakeRes;
  end(): FakeRes;
}

function makeRes(): FakeRes {
  const res: FakeRes = {
    _headers: {},
    setHeader(name, value) {
      this._headers[name] = Array.isArray(value) ? (value as string[]) : String(value);
      return this;
    },
    status() { return this; },
    json() { return this; },
    end() { return this; },
  };
  return res;
}

const asRes = (r: FakeRes): VercelResponse => r as unknown as VercelResponse;

const makeReq = (cookie?: string): VercelRequest =>
  ({ headers: cookie ? { cookie } : {}, query: {} }) as unknown as VercelRequest;

const ORIGINAL_ENV = { ...process.env };

describe("userAgent", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("uses the REDDIT_USER_AGENT env var when set", () => {
    process.env.REDDIT_USER_AGENT = "custom-agent";
    expect(userAgent()).toBe("custom-agent");
  });

  it("falls back to a descriptive default", () => {
    delete process.env.REDDIT_USER_AGENT;
    expect(userAgent()).toMatch(/redfeed/);
  });
});

describe("checkRedditCredentials", () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns null in local dev (no VERCEL env) even without CLIENT_ID", () => {
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.VERCEL;
    expect(checkRedditCredentials(null)).toBeNull();
  });

  it("returns null when CLIENT_ID is set", () => {
    process.env.REDDIT_CLIENT_ID = "cid";
    process.env.VERCEL = "1";
    expect(checkRedditCredentials(null)).toBeNull();
  });

  it("returns null when a user token is supplied (writes/oauth path)", () => {
    delete process.env.REDDIT_CLIENT_ID;
    process.env.VERCEL = "1";
    expect(checkRedditCredentials("user-token")).toBeNull();
  });

  it("returns a 503 reddit_credentials_missing payload on Vercel without CLIENT_ID or user token", () => {
    delete process.env.REDDIT_CLIENT_ID;
    process.env.VERCEL = "1";
    const result = checkRedditCredentials(null);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(503);
    expect(result?.body.error).toBe("reddit_credentials_missing");
    expect(result?.body.detail).toMatch(/Reddit/i);
  });
});

describe("getAppOnlyToken", () => {
  beforeEach(() => {
    _clearTokenCacheForTests();
    process.env = { ...ORIGINAL_ENV };
  });
  afterEach(() => {
    _clearTokenCacheForTests();
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns null when REDDIT_CLIENT_ID is not set", async () => {
    delete process.env.REDDIT_CLIENT_ID;
    const token = await getAppOnlyToken(Date.now(), vi.fn());
    expect(token).toBeNull();
  });

  it("uses installed_client grant when no secret is set", async () => {
    process.env.REDDIT_CLIENT_ID = "cid";
    delete process.env.REDDIT_CLIENT_SECRET;
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ access_token: "t1", expires_in: 3600 }),
    }));
    const token = await getAppOnlyToken(
      Date.now(),
      fetchMock as unknown as typeof fetch,
    );
    expect(token).toBe("t1");
    const opts = (fetchMock.mock.calls as unknown as Array<[string, RequestInit]>)[0][1];
    expect(String(opts.body)).toContain("installed_client");
    expect(String(opts.body)).toContain("device_id");
    const authHeader = (opts.headers as Record<string, string>).Authorization;
    expect(authHeader).toMatch(/^Basic /);
  });

  it("uses client_credentials when a secret is set", async () => {
    process.env.REDDIT_CLIENT_ID = "cid";
    process.env.REDDIT_CLIENT_SECRET = "sec";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ access_token: "t2", expires_in: 3600 }),
    }));
    await getAppOnlyToken(Date.now(), fetchMock as unknown as typeof fetch);
    const opts = (fetchMock.mock.calls as unknown as Array<[string, RequestInit]>)[0][1];
    expect(String(opts.body)).toContain("grant_type=client_credentials");
  });

  it("caches the token within the expiry window", async () => {
    process.env.REDDIT_CLIENT_ID = "cid";
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ access_token: "t3", expires_in: 3600 }),
    }));
    const now = Date.now();
    const first = await getAppOnlyToken(
      now,
      fetchMock as unknown as typeof fetch,
    );
    const second = await getAppOnlyToken(
      now + 1000,
      fetchMock as unknown as typeof fetch,
    );
    expect(first).toBe("t3");
    expect(second).toBe("t3");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null when the token endpoint fails", async () => {
    process.env.REDDIT_CLIENT_ID = "cid";
    const fetchMock = vi.fn(async () => ({
      ok: false,
      json: async () => ({}),
    }));
    const token = await getAppOnlyToken(
      Date.now(),
      fetchMock as unknown as typeof fetch,
    );
    expect(token).toBeNull();
  });
});

describe("redditFetch", () => {
  beforeEach(() => {
    _clearTokenCacheForTests();
    process.env = { ...ORIGINAL_ENV };
  });
  afterEach(() => {
    _clearTokenCacheForTests();
    process.env = { ...ORIGINAL_ENV };
  });

  it("hits www.reddit.com/.json when no CLIENT_ID is configured", async () => {
    delete process.env.REDDIT_CLIENT_ID;
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    await redditFetch({
      path: "/r/popular/hot",
      query: { limit: "25" },
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
    const url = calls[0][0];
    expect(url).toContain("https://www.reddit.com/r/popular/hot.json");
    expect(url).toContain("limit=25");
    expect(url).toContain("raw_json=1");
    const opts = calls[0][1];
    expect((opts.headers as Record<string, string>).Authorization).toBeUndefined();
    expect((opts.headers as Record<string, string>)["User-Agent"]).toMatch(
      /redfeed/,
    );
  });

  it("hits oauth.reddit.com with a Bearer token when CLIENT_ID is set", async () => {
    process.env.REDDIT_CLIENT_ID = "cid";
    const fetchMock = vi.fn(async (urlArg: string) => {
      if (urlArg.includes("/api/v1/access_token")) {
        return {
          ok: true,
          json: async () => ({ access_token: "tok", expires_in: 3600 }),
        } as unknown as Response;
      }
      return new Response("{}", { status: 200 });
    });
    await redditFetch({
      path: "/r/popular/hot",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
    const dataCall = calls.find(([u]) => u.includes("/r/popular/hot"))!;
    expect(dataCall[0]).toContain("https://oauth.reddit.com/r/popular/hot");
    expect(dataCall[0]).not.toContain(".json");
    expect(
      (dataCall[1].headers as Record<string, string>).Authorization,
    ).toBe("Bearer tok");
  });
});

describe("getUserToken", () => {
  beforeEach(() => {
    _clearTokenCacheForTests();
    process.env = { ...ORIGINAL_ENV };
    process.env.REDDIT_CLIENT_ID = "cid";
    process.env.REDDIT_CLIENT_SECRET = "sec";
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it("returns the access cookie verbatim when present", async () => {
    const tok = await getUserToken(makeReq("rf_access=at"), asRes(makeRes()));
    expect(tok).toBe("at");
  });

  it("returns null when no cookies present", async () => {
    expect(await getUserToken(makeReq(), asRes(makeRes()))).toBe(null);
  });

  it("refreshes when only refresh cookie present and rewrites cookies on response", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "new-at",
        refresh_token: "new-rt",
        expires_in: 3600,
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const res = makeRes();
    const tok = await getUserToken(makeReq("rf_refresh=rt"), asRes(res));
    expect(tok).toBe("new-at");
    const cookies = res._headers["Set-Cookie"] as string[];
    expect(cookies.some((c) => c.startsWith("rf_access=new-at"))).toBe(true);
    expect(cookies.some((c) => c.startsWith("rf_refresh=new-rt"))).toBe(true);
  });

  it("returns null when refresh fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 400, json: async () => ({}) })),
    );
    const tok = await getUserToken(makeReq("rf_refresh=rt"), asRes(makeRes()));
    expect(tok).toBe(null);
  });
});

describe("redditFetch with explicit userToken", () => {
  beforeEach(() => {
    _clearTokenCacheForTests();
    process.env = { ...ORIGINAL_ENV };
    process.env.REDDIT_CLIENT_ID = "cid";
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it("uses the user token over app-only and hits oauth.reddit.com", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    await redditFetch({
      path: "/r/popular/hot",
      userToken: "user-at",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(calls[0][0]).toContain("oauth.reddit.com/r/popular/hot");
    expect((calls[0][1].headers as Record<string, string>).Authorization).toBe(
      "Bearer user-at",
    );
  });
});

describe("OAuth helper fetches", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.REDDIT_CLIENT_ID = "cid";
    process.env.REDDIT_CLIENT_SECRET = "sec";
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it("exchangeCode posts grant_type=authorization_code with Basic auth", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "at", expires_in: 3600 }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    await exchangeCode("code123", "https://x/cb");
    const [, opts] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(opts.body)).toContain("grant_type=authorization_code");
    expect(String(opts.body)).toContain("code=code123");
    expect((opts.headers as Record<string, string>).Authorization).toMatch(/^Basic /);
  });

  it("refreshUserToken posts grant_type=refresh_token", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "at", expires_in: 3600 }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    await refreshUserToken("rt");
    const [, opts] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(opts.body)).toContain("grant_type=refresh_token");
    expect(String(opts.body)).toContain("refresh_token=rt");
  });

  it("revokeToken posts to revoke_token", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await revokeToken("at", "access_token");
    const [url, opts] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("revoke_token");
    expect(String(opts.body)).toContain("token=at");
    expect(String(opts.body)).toContain("token_type_hint=access_token");
  });
});
