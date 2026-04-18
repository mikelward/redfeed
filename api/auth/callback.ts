import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  STATE_COOKIE,
  accessCookie,
  clearCookie,
  parseCookies,
  refreshCookie,
  verifySignedCookie,
} from "../_cookies";
import { exchangeCode } from "../_redditAuth";

function getEnv(): {
  redirectUri: string;
  signingKey: string;
} | null {
  const redirectUri = process.env.REDDIT_REDIRECT_URI;
  const signingKey = process.env.COOKIE_SIGNING_KEY;
  if (!redirectUri || !signingKey) return null;
  return { redirectUri, signingKey };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const env = getEnv();
  if (!env) {
    res.status(500).json({ error: "OAuth not configured" });
    return;
  }

  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const errParam =
    typeof req.query.error === "string" ? req.query.error : "";

  if (errParam) {
    res
      .status(302)
      .setHeader("Location", `/?login_error=${encodeURIComponent(errParam)}`)
      .end();
    return;
  }
  if (!code || !state) {
    res.status(400).json({ error: "missing code or state" });
    return;
  }

  const cookies = parseCookies(req.headers?.cookie);
  const expectedNonce = verifySignedCookie(
    cookies[STATE_COOKIE],
    env.signingKey,
  );
  if (!expectedNonce || expectedNonce !== state) {
    res.status(400).json({ error: "state mismatch" });
    return;
  }

  try {
    const tok = await exchangeCode(code, env.redirectUri);
    if (!tok) {
      res
        .status(302)
        .setHeader("Location", "/?login_error=token_exchange_failed")
        .end();
      return;
    }
    const cookiesToSet = [
      accessCookie(tok.access_token, tok.expires_in),
      clearCookie(STATE_COOKIE),
    ];
    if (tok.refresh_token) {
      cookiesToSet.push(refreshCookie(tok.refresh_token));
    }
    res.setHeader("Set-Cookie", cookiesToSet);
    res.setHeader("Cache-Control", "no-store");
    res.status(302).setHeader("Location", "/").end();
  } catch (err) {
    console.error("oauth callback threw", err);
    res
      .status(302)
      .setHeader("Location", "/?login_error=internal")
      .end();
  }
}
