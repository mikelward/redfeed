# Install & setup

This document covers running Redfeed locally and configuring the optional
Reddit OAuth integration. The minimum viable setup is just `npm install`
+ `npm run dev` — OAuth is only needed if you want users to log in,
vote, or comment from your deployment.

For the product spec, see `SPEC.md`. For agent instructions, see `AGENTS.md`.

---

## 1. Local development (no Reddit credentials needed)

```bash
npm install
npm run dev          # Vite dev server at http://localhost:5173
```

Without any environment variables the app calls the public
`https://www.reddit.com/r/.../json` endpoints directly through the
`/api/feed` and `/api/thread` proxies. From a residential IP this works
fine; only logged-in actions and rate-limited cloud IPs (Vercel) need
the OAuth credentials below.

Other commands:

```bash
npm test             # Vitest in CI mode
npm run test:watch   # Vitest in watch mode
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run build        # Production build into dist/
```

---

## 2. Register a Reddit application

OAuth requires a registered Reddit app. There are two app types and
either works for Redfeed; **web app** is recommended because it's the
type Redfeed needs for user login (vote / comment).

1. Sign in to Reddit with the account that will own the app.
2. Make sure the account's email is **verified** at
   https://www.reddit.com/settings/account. Reddit silently blocks app
   creation from unverified accounts.
3. Visit https://www.reddit.com/prefs/apps (or
   https://old.reddit.com/prefs/apps if the new UI hangs).
4. Click **create app** / **create another app** at the bottom.
5. Fill in:
   - **name**: `redfeed` (or anything)
   - **type**: **web app**
   - **description** / **about url**: optional, leave blank
   - **redirect uri**: must match `REDDIT_REDIRECT_URI` exactly. For
     production: `https://<your-vercel-domain>/api/auth/callback`. For
     local dev: `http://localhost:5173/api/auth/callback`. You can
     register two apps if you want both.
6. Click **create app**.
7. On the resulting page, note:
   - The short string under the app name → **client ID**
   - The longer **secret** field → **client secret**

If the form just re-displays the Responsible Builder Policy notice
without creating the app, the account doesn't yet meet Reddit's
silent eligibility bar. Verify the email, dismiss any pending
account banners, then try again in an incognito window or on
`old.reddit.com`.

---

## 3. Environment variables

Create a `.env.local` for local dev (Vite reads it; not committed)
and add the same variables to Vercel via **Project → Settings →
Environment Variables** for the deployed app.

| Variable                | Required for          | Example |
| :---------------------- | :-------------------- | :------ |
| `REDDIT_CLIENT_ID`      | All Reddit calls      | `aBcDeFg1234567` |
| `REDDIT_CLIENT_SECRET`  | All Reddit calls (web app type) — leave unset for installed-app type | `xYz...` |
| `REDDIT_USER_AGENT`     | All Reddit calls      | `web:app.redfeed:v0.1.0 (by /u/your-username)` |
| `REDDIT_REDIRECT_URI`   | OAuth user login      | `https://redfeed.app/api/auth/callback` |
| `COOKIE_SIGNING_KEY`    | OAuth user login      | output of `openssl rand -hex 32` |

Notes:

- **`REDDIT_CLIENT_ID`** alone is enough to use the `installed_client`
  app-only grant for read-only calls (no user login). Useful if you
  registered an "installed app" instead of a "web app".
- **`REDDIT_CLIENT_SECRET`** unlocks the `client_credentials` grant for
  app-only and is required for the user OAuth code exchange.
- **`REDDIT_USER_AGENT`** is mandatory per Reddit's API rules. Without
  a descriptive UA, Reddit will rate-limit or 403 the request. The
  `(by /u/<your-username>)` suffix should reference a real Reddit
  account.
- **`REDDIT_REDIRECT_URI`** must match the redirect URI registered on
  the Reddit app exactly (including scheme and trailing path).
- **`COOKIE_SIGNING_KEY`** signs the short-lived OAuth state cookie to
  prevent CSRF. Use a high-entropy random value:
  `openssl rand -hex 32`. Rotate it by changing the env var; in-flight
  logins will fail and need to retry.

---

## 4. OAuth flow at runtime

Once the env vars are set:

1. The header in the feed shows a **Log in** button (right side).
2. Tapping it navigates the browser to `/api/auth/start`, which:
   - generates a random nonce,
   - HMAC-signs it and stores it in a 10-minute `rf_oauth_state` cookie,
   - 302-redirects to `https://www.reddit.com/api/v1/authorize?…`
     with `duration=permanent` and the scopes
     `identity read vote submit save history`.
3. After the user approves, Reddit redirects back to
   `REDDIT_REDIRECT_URI` (`/api/auth/callback`).
4. The callback verifies the state cookie, exchanges the code for
   tokens, and sets:
   - `rf_refresh` — long-lived refresh token (HTTP-only, Secure,
     SameSite=Lax, 30 days)
   - `rf_access`  — short-lived access token (HTTP-only, Secure,
     SameSite=Lax, lifetime = `expires_in` minus 60 s)
5. The browser is redirected back to `/`. The header now shows
   `u/<your-username>` and a **Log out** button.
6. Subsequent `/api/feed` and `/api/thread` requests automatically use
   the user token (against `oauth.reddit.com`) instead of the app-only
   token, so private subscriber-only / NSFW-gated content works.
7. **Log out** calls `/api/auth/logout`, which:
   - revokes the refresh token at Reddit (`/api/v1/revoke_token`),
   - clears both `rf_refresh` and `rf_access` cookies.

The access token is auto-refreshed on demand: any `/api/*` handler
that needs a user token will use the refresh token to mint a new one
when the access cookie has expired.

---

## 5. Local OAuth testing

To exercise the full OAuth flow against `http://localhost:5173`:

1. Register a separate Reddit app of type **web app** with redirect
   URI `http://localhost:5173/api/auth/callback`.
2. In `.env.local`:

   ```bash
   REDDIT_CLIENT_ID=<dev app id>
   REDDIT_CLIENT_SECRET=<dev app secret>
   REDDIT_USER_AGENT=web:app.redfeed-dev:v0.1.0 (by /u/<your-username>)
   REDDIT_REDIRECT_URI=http://localhost:5173/api/auth/callback
   COOKIE_SIGNING_KEY=$(openssl rand -hex 32)
   ```

3. Run `vercel dev` (not `npm run dev`) so the `/api/*` handlers and
   cookies behave the same as in production. `vercel dev` automatically
   loads `.env.local`.

`vite dev` only serves the React app — the `/api/*` routes need
`vercel dev` (or a deployed preview).

---

## 6. Troubleshooting

- **Feed loads with `403`** — the app-only token failed. Check
  `REDDIT_CLIENT_ID` is set and (for a web-app type) `REDDIT_CLIENT_SECRET`
  matches the registered app.
- **Feed loads with `500`** — the function crashed before responding.
  Check the Vercel function logs; the handler now logs `console.error`
  on every upstream failure with the status and first 500 chars of
  Reddit's response body.
- **Login redirects you to `/?login_error=...`** — the callback
  rejected the response. Common causes:
  - `REDDIT_REDIRECT_URI` mismatch with what's registered on the app.
  - State cookie expired (logged in took longer than 10 minutes).
  - `COOKIE_SIGNING_KEY` rotated mid-flight.
- **Reddit's "create app" form silently fails** — verify the account
  email, dismiss pending banners, try `old.reddit.com/prefs/apps`, or
  borrow a client ID from another account. Client IDs are not secret
  for the `installed_client` grant.
