import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";
import { signedCookieValue, stateCookie } from "../_cookies.js";

const SCOPES = ["identity", "read", "vote", "submit", "save", "history"].join(" ");

function getEnv(): {
  clientId: string;
  redirectUri: string;
  signingKey: string;
} | null {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const redirectUri = process.env.REDDIT_REDIRECT_URI;
  const signingKey = process.env.COOKIE_SIGNING_KEY;
  if (!clientId || !redirectUri || !signingKey) return null;
  return { clientId, redirectUri, signingKey };
}

export default function handler(
  _req: VercelRequest,
  res: VercelResponse,
): void {
  const env = getEnv();
  if (!env) {
    res.status(500).json({
      error:
        "OAuth not configured. Set REDDIT_CLIENT_ID, REDDIT_REDIRECT_URI, COOKIE_SIGNING_KEY.",
    });
    return;
  }

  const nonce = crypto.randomBytes(24).toString("base64url");
  const signed = signedCookieValue(nonce, env.signingKey);

  const url = new URL("https://www.reddit.com/api/v1/authorize");
  url.searchParams.set("client_id", env.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", nonce);
  url.searchParams.set("redirect_uri", env.redirectUri);
  url.searchParams.set("duration", "permanent");
  url.searchParams.set("scope", SCOPES);

  res.setHeader("Set-Cookie", stateCookie(signed));
  res.setHeader("Cache-Control", "no-store");
  res.status(302).setHeader("Location", url.toString()).end();
}
