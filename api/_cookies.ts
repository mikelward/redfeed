import crypto from "node:crypto";

export const REFRESH_COOKIE = "rf_refresh";
export const ACCESS_COOKIE = "rf_access";
export const STATE_COOKIE = "rf_oauth_state";

const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;
const STATE_MAX_AGE = 10 * 60;

export interface CookieJar {
  [name: string]: string;
}

export function parseCookies(header: string | undefined): CookieJar {
  if (!header) return {};
  const out: CookieJar = {};
  for (const part of header.split(/;\s*/)) {
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    if (!k) continue;
    const v = part.slice(eq + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

interface CookieOpts {
  maxAge?: number;
  expires?: Date;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  path?: string;
}

export function serializeCookie(
  name: string,
  value: string,
  opts: CookieOpts = {},
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${opts.path ?? "/"}`);
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
  if (opts.httpOnly !== false) parts.push("HttpOnly");
  if (opts.secure !== false) parts.push("Secure");
  parts.push(`SameSite=${opts.sameSite ?? "Lax"}`);
  return parts.join("; ");
}

export function clearCookie(name: string): string {
  return serializeCookie(name, "", { maxAge: 0 });
}

function hmacB64(payload: string, key: string): string {
  return crypto
    .createHmac("sha256", key)
    .update(payload)
    .digest("base64url");
}

function timingSafeStringEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function signedCookieValue(payload: string, key: string): string {
  return `${payload}.${hmacB64(payload, key)}`;
}

export function verifySignedCookie(
  cookieValue: string | undefined,
  key: string,
): string | null {
  if (!cookieValue) return null;
  const dot = cookieValue.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  const expected = hmacB64(payload, key);
  if (!timingSafeStringEq(sig, expected)) return null;
  return payload;
}

export function refreshCookie(token: string): string {
  return serializeCookie(REFRESH_COOKIE, token, { maxAge: REFRESH_MAX_AGE });
}

export function accessCookie(token: string, expiresInSec: number): string {
  const maxAge = Math.max(0, expiresInSec - 60);
  return serializeCookie(ACCESS_COOKIE, token, { maxAge });
}

export function stateCookie(value: string): string {
  return serializeCookie(STATE_COOKIE, value, { maxAge: STATE_MAX_AGE });
}
