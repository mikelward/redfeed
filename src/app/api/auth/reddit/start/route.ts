import { cookies } from "next/headers";
import { randomBytes, createHash } from "node:crypto";

const isSecureCookie = process.env.NODE_ENV === "production";

function toBase64Url(input: Buffer): string {
  return input.toString("base64url");
}

export async function GET(request: Request): Promise<Response> {
  const cookieStore = await cookies();
  const state = toBase64Url(randomBytes(24));
  const codeVerifier = toBase64Url(randomBytes(32));
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

  const url = new URL(request.url);
  const clientId = process.env.REDDIT_CLIENT_ID;
  const redirectUri = process.env.REDDIT_REDIRECT_URI ?? `${url.origin}/api/auth/reddit/callback`;

  if (!clientId) {
    return new Response("Missing REDDIT_CLIENT_ID", { status: 500 });
  }

  cookieStore.set("reddit_oauth_state", state, {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  cookieStore.set("reddit_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  const authUrl = new URL("https://www.reddit.com/api/v1/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("duration", "permanent");
  authUrl.searchParams.set("scope", "identity history read save vote");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  return Response.redirect(authUrl);
}
