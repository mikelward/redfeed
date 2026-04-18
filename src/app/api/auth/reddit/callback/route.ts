import { cookies } from "next/headers";

const isSecureCookie = process.env.NODE_ENV === "production";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const incomingState = url.searchParams.get("state");
  const cookieStore = await cookies();

  const savedState = cookieStore.get("reddit_oauth_state")?.value;
  const codeVerifier = cookieStore.get("reddit_code_verifier")?.value;

  cookieStore.delete("reddit_oauth_state");
  cookieStore.delete("reddit_code_verifier");

  if (!incomingState || !savedState || incomingState !== savedState) {
    return new Response("Invalid OAuth state", { status: 400 });
  }

  if (!code || !codeVerifier) {
    return new Response("Missing OAuth code or verifier", { status: 400 });
  }

  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const redirectUri = process.env.REDDIT_REDIRECT_URI ?? `${url.origin}/api/auth/reddit/callback`;

  if (!clientId || !clientSecret) {
    return new Response("Missing REDDIT_CLIENT_ID or REDDIT_CLIENT_SECRET", { status: 500 });
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const tokenResponse = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "redfeed/0.1",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const payload = await tokenResponse.text();
    return new Response(`Token exchange failed: ${payload}`, { status: 502 });
  }

  const tokenPayload = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  cookieStore.set("reddit_access_token", tokenPayload.access_token, {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: "lax",
    maxAge: tokenPayload.expires_in,
    path: "/",
  });

  if (tokenPayload.refresh_token) {
    cookieStore.set("reddit_refresh_token", tokenPayload.refresh_token, {
      httpOnly: true,
      secure: isSecureCookie,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }

  return Response.redirect(new URL("/", request.url));
}
