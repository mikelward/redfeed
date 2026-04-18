import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookie,
  parseCookies,
  refreshCookie,
} from "./_cookies";

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

export function basicAuth(user: string, pass: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(`${user}:${pass}`).toString("base64");
  }
  return btoa(`${user}:${pass}`);
}

export function clientCredentials(): { id: string; secret: string } {
  return {
    id: process.env.REDDIT_CLIENT_ID ?? "",
    secret: process.env.REDDIT_CLIENT_SECRET ?? "",
  };
}

export interface MissingCredentialsError {
  status: 503;
  body: { error: "reddit_credentials_missing"; detail: string };
}

// Anonymous reads of www.reddit.com work for local dev but are blocked from
// Vercel's serverless IPs, so in any hosted environment we require a server-side
// CLIENT_ID. A logged-in user token bypasses the check (writes/oauth.reddit.com).
export function checkRedditCredentials(
  userToken: string | null,
): MissingCredentialsError | null {
  if (process.env.REDDIT_CLIENT_ID || userToken) return null;
  if (!process.env.VERCEL) return null;
  return {
    status: 503,
    body: {
      error: "reddit_credentials_missing",
      detail:
        "Reddit API credentials are not configured on the server. " +
        "Waiting on Reddit to approve and issue an API key.",
    },
  };
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

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

export async function exchangeCode(
  code: string,
  redirectUri: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TokenResponse | null> {
  const { id, secret } = clientCredentials();
  if (!id) return null;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetchImpl("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(id, secret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent(),
    },
    body: body.toString(),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as TokenResponse;
  return data.access_token ? data : null;
}

export async function refreshUserToken(
  refresh: string,
  fetchImpl: typeof fetch = fetch,
): Promise<TokenResponse | null> {
  const { id, secret } = clientCredentials();
  if (!id) return null;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refresh,
  });
  const res = await fetchImpl("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(id, secret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent(),
    },
    body: body.toString(),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as TokenResponse;
  return data.access_token ? data : null;
}

export async function revokeToken(
  token: string,
  hint: "access_token" | "refresh_token" = "refresh_token",
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const { id, secret } = clientCredentials();
  if (!id) return;
  const body = new URLSearchParams({
    token,
    token_type_hint: hint,
  });
  await fetchImpl("https://www.reddit.com/api/v1/revoke_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(id, secret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent(),
    },
    body: body.toString(),
  });
}

export async function getUserToken(
  req: VercelRequest,
  res: VercelResponse | null,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const cookies = parseCookies(req.headers?.cookie);
  const access = cookies[ACCESS_COOKIE];
  if (access) return access;
  const refresh = cookies[REFRESH_COOKIE];
  if (!refresh) return null;
  const refreshed = await refreshUserToken(refresh, fetchImpl);
  if (!refreshed) return null;
  if (res) {
    const cookies = [accessCookie(refreshed.access_token, refreshed.expires_in)];
    if (refreshed.refresh_token) {
      cookies.push(refreshCookie(refreshed.refresh_token));
    }
    res.setHeader("Set-Cookie", cookies);
  }
  return refreshed.access_token;
}

export interface RedditFetchOptions {
  path: string;
  query?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  userToken?: string | null;
}

export async function redditFetch({
  path,
  query = {},
  fetchImpl = fetch,
  userToken,
}: RedditFetchOptions): Promise<Response> {
  const token =
    userToken ?? (await getAppOnlyToken(Date.now(), fetchImpl));

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
