import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  _clearTokenCacheForTests,
  getAppOnlyToken,
  redditFetch,
  userAgent,
} from "./_redditAuth";

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
