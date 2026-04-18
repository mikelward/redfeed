import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearCookie,
  parseCookies,
} from "../_cookies.js";
import { revokeToken } from "../_redditAuth.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const cookies = parseCookies(req.headers?.cookie);
  const refresh = cookies[REFRESH_COOKIE];
  const access = cookies[ACCESS_COOKIE];
  try {
    if (refresh) await revokeToken(refresh, "refresh_token");
    else if (access) await revokeToken(access, "access_token");
  } catch (err) {
    console.error("revoke failed", err);
  }
  res.setHeader("Set-Cookie", [
    clearCookie(REFRESH_COOKIE),
    clearCookie(ACCESS_COOKIE),
  ]);
  res.setHeader("Cache-Control", "no-store");
  res.status(204).end();
}
