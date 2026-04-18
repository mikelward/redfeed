interface CachedToken {
  value: string;
  expiresAt: number;
}

let cache: CachedToken | null = null;

export function _clearTokenCacheForTests(): void {
  cache = null;
}

export function userAgent(): string {
  return (
    process.env.REDDIT_USER_AGENT ??
    "web:app.redfeed:v0.1.0 (by /u/redfeed-app)"
  );
}

function basicAuth(user: string, pass: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(`${user}:${pass}`).toString("base64");
  }
  return btoa(`${user}:${pass}`);
}

export async function getAppOnlyToken(
  now: number = Date.now(),
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  if (cache && cache.expiresAt > now + 30_000) return cache.value;

  const clientId = process.env.REDDIT_CLIENT_ID;
  if (!clientId) return null;

  const secret = process.env.REDDIT_CLIENT_SECRET ?? "";
  const useInstalled = secret === "";

  const body = new URLSearchParams(
    useInstalled
      ? {
          grant_type: "https://oauth.reddit.com/grants/installed_client",
          device_id: "DO_NOT_TRACK_THIS_DEVICE_00",
        }
      : { grant_type: "client_credentials" },
  );

  const res = await fetchImpl(
    "https://www.reddit.com/api/v1/access_token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth(clientId, secret)}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgent(),
      },
      body: body.toString(),
    },
  );
  if (!res.ok) return null;

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) return null;

  cache = {
    value: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
  };
  return cache.value;
}

export interface RedditFetchOptions {
  path: string;
  query?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}

export async function redditFetch({
  path,
  query = {},
  fetchImpl = fetch,
}: RedditFetchOptions): Promise<Response> {
  const token = await getAppOnlyToken(Date.now(), fetchImpl);

  const base = token ? "https://oauth.reddit.com" : "https://www.reddit.com";
  const suffix = token ? "" : ".json";
  const url = new URL(`${base}${path}${suffix}`);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, v);
  }
  url.searchParams.set("raw_json", "1");

  const headers: Record<string, string> = {
    "User-Agent": userAgent(),
    Accept: "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  return fetchImpl(url.toString(), { headers });
}
