# Redfeed — SPEC

## Overview

**Redfeed** is a mobile-friendly, responsive web **reader for [Reddit](https://www.reddit.com)**, built with React + TypeScript and deployed on Vercel. The goal is to deliver a clean, fast, thumb-friendly reading experience for Reddit feeds, with an **RSS-reader-style scroll-to-hide** interaction: once a post has scrolled past the top of the viewport it's marked "seen" and visually de-emphasized the next time you open the feed.

"Reddit", the Reddit logo, and the alien mascot are trademarks of Reddit, Inc.; Redfeed is an unofficial third-party client and is not affiliated with or endorsed by Reddit. The app is always described as a *reader for Reddit*, never as "Reddit" itself, and does not use Reddit's logo as its own.

## Primary design problem

Reddit's own mobile web experience does three things that hurt casual reading on a phone:

1. Dense rows with many small tappable elements (vote arrows, save, share, author, subreddit, flair, comments, "…" menu) that invite mis-taps.
2. Interstitial "open in app" prompts, login walls, and promoted content that interrupt scrolling.
3. No good "I've already read this" affordance, so returning to a feed means re-scanning the same posts.

Redfeed fixes all three by keeping **few, large, well-spaced tap targets per row**, rendering a clean feed with no app-install nags, and treating the feed like an **RSS reader**: posts you've already scrolled past get dimmed so your eye goes straight to what's new.

We achieve that by:

1. **At most three tap zones per row**, always in the same positions: optional upvote on the left, main content (image or title), and a "N comments" button. No save, no share, no hide, no inline author link, no flair chip, no "…" menu, no rank number.
2. **Large, well-spaced hit areas.** Minimum 48×48px per tappable, ≥8px dead space between adjacent targets.
3. **Metadata is display-only.** Score, age, subreddit, author are plain text; only the explicit upvote arrow, main content, and "N comments" button are tappable.
4. **The comments button is a real button**, padded and outlined, not an inline text link — so it's visually obvious and easy to aim for.
5. **Seen posts dim themselves.** Scroll past a row, it's "seen"; on the next view it's faded and/or collapsed, so returning users see what's new at a glance.

## Goals

- Mobile-first responsive layout; also usable on desktop.
- Fast, minimal-JS bundle; good Lighthouse scores.
- Clean neutral look with Reddit-orange (`#ff4500`) accents, but **fewer, larger, better-spaced** tap targets than Reddit's own mobile site.
- Read public subreddit feeds (`/r/:sub`) and the Popular / All feeds.
- Native-feeling **image post rendering** — image posts show the image inline, not a link.
- RSS-style **seen/unseen** state persisted in the browser so returning readers see what's new.
- View a post's comment thread (read-only for MVP).
- Optional: log in via Reddit OAuth and vote / comment from mobile.

## Non-Goals (MVP)

- Submitting new posts.
- Modmail, moderation actions, report flows.
- Chat / PMs.
- Push notifications.
- Video playback beyond a static preview + play-badge linking out (MP4/HLS players are a stretch).
- Native app shell (PWA installability is a nice-to-have, not required).
- Syncing seen state across devices (local-only for MVP).

## Users

- Anonymous readers who just want to browse a handful of subreddits on a phone.
- Logged-in Reddit users who want to read, vote, and comment from mobile without the app.

## Feature List

### MVP (read-only + seen-tracking)

1. **Feeds**
   - `/` redirects to `/r/popular`.
   - `/r/:sub` — any public subreddit.
   - `/r/:sub/:sort` — `hot` (default), `new`, `top`, `rising`, `controversial`.
   - `/r/:sub/top/:t` — time window (`hour`, `day`, `week`, `month`, `year`, `all`).
   - Multi-subreddit: `/r/sub1+sub2+sub3` (Reddit supports this natively).
   - Infinite scroll using Reddit's `after` cursor (25 items per page).
   - Each feed item renders per the *Post row layout* rules below.

2. **Post types rendered inline**
   - **Image post** (`post_hint: "image"` or direct `i.redd.it` / `i.imgur.com` URL): render the preview image inline as the primary tap target. Tap → thread.
   - **Gallery** (`is_gallery: true`): render the first image with a "1 / N" badge overlay. Tap → thread.
   - **Video** (`post_hint: "hosted:video" | "rich:video"`): render the static preview image with a ▶ badge. Tap → thread (MVP does not play video inline).
   - **Link post** (`post_hint: "link"` or external URL): title + domain row; tap title → external URL.
   - **Self post** (`is_self: true`): title row; tap → thread. Body text is shown on the thread page, not the feed.
   - **Crosspost**: treat as the underlying post's type, with a small "crossposted from r/…" caption.

3. **Thread view**
   - Post header (title, subreddit, author, age, score).
   - Full media for image/gallery/video posts (gallery becomes a swipeable strip).
   - Self-post body rendered as sanitized HTML (Reddit returns pre-rendered HTML in `selftext_html`).
   - Nested comments with collapse/expand. "Load more" for `more` placeholders.
   - Deep-linkable: `/r/:sub/comments/:id`.

4. **Seen tracking (the RSS-style bit)**
   - As a post row scrolls off the top of the viewport, it's marked **seen** in `localStorage`, keyed by post fullname (`t3_xxxxxx`).
   - On the next feed render, seen posts are rendered at reduced opacity (~40%) with a thinner border.
   - A settings toggle: *Hide seen posts entirely* vs. *Dim seen posts* (default: dim).
   - A "Mark all as seen" button and a "Clear seen history" button in feed chrome.
   - Seen state has a TTL (30 days) to keep `localStorage` bounded.
   - MVP does **not** call Reddit's `/api/hide` endpoint — seen state is purely client-side. (Stretch: sync to Reddit's hide list for logged-in users.)

5. **Subreddit picker**
   - Simple input on the home screen: "Go to r/…".
   - A small local list of "pinned" subreddits stored in `localStorage` (add/remove from the sub header).
   - No full subreddit search UI in MVP.

6. **Navigation & Chrome**
   - Sticky header with app name and current feed (e.g. `r/popular • hot`).
   - Sort tabs (hot / new / top / rising) integrated into the header on subreddit pages.
   - Back button on thread pages.

### Stretch (behind feature flags)

7. **Login via Reddit OAuth2** — see *Auth* below.
8. **Voting** — up/down/unvote via `/api/vote` proxy.
9. **Commenting** — post top-level and reply comments via `/api/comment` proxy. MVP threads are read-only.
10. **Save / unsave** — `/api/save`, for the logged-in user's saved list.
11. **Hide sync** — send client-side "seen" hides up to Reddit's `/api/hide` on login (opt-in).
12. **Inline video player** — HLS via `hls.js` for `v.redd.it`.
13. **PWA install** — manifest + service worker for offline shell.

## Data Sources

### Read API — Reddit public JSON

Reddit exposes JSON for most pages by appending `.json`, and also has a full OAuth-scoped API at `https://oauth.reddit.com`. For **anonymous reads** in MVP we use the public endpoints with a descriptive `User-Agent`:

Base: `https://www.reddit.com`

| Endpoint | Purpose |
|---|---|
| `/r/:sub/hot.json?limit=25&after=:cursor` | Subreddit feed (sort variants: `new`, `top`, `rising`, `controversial`) |
| `/r/:sub/top.json?t=week` | Time-windowed top |
| `/r/:sub/comments/:id.json` | Post + comment tree |
| `/r/:sub/about.json` | Subreddit metadata (title, description, subscriber count, over18) |
| `/user/:name/about.json` | User profile (stretch) |

Listing shape: `{ kind: "Listing", data: { after, before, children: [{ kind: "t3", data: { ... } }] } }`.

Post fields we care about:
`id`, `name` (fullname `t3_…`), `subreddit`, `subreddit_name_prefixed`, `title`, `author`, `created_utc`, `score`, `upvote_ratio`, `num_comments`, `permalink`, `url`, `is_self`, `selftext_html`, `post_hint`, `preview.images[]`, `is_gallery`, `gallery_data`, `media_metadata`, `media`, `thumbnail`, `over_18`, `spoiler`, `stickied`, `locked`, `archived`.

Comment fields: `id`, `name` (`t1_…`), `author`, `body_html`, `score`, `created_utc`, `depth`, `replies`, plus `kind: "more"` placeholders with a `children` array of IDs to lazy-load via `/api/morechildren`.

### Write API — Reddit OAuth2

Reddit has a real write API (unlike HN), so we do not scrape HTML:

- `POST /api/vote` — `id=t3_xxx&dir=1|-1|0`
- `POST /api/comment` — `thing_id=t3_xxx&text=...`
- `POST /api/save` / `POST /api/unsave`
- `POST /api/hide` / `POST /api/unhide`
- `POST /api/morechildren` — expand a collapsed subtree
- `GET  /api/v1/me` — current user

All require an OAuth access token in `Authorization: bearer <token>`.

## Auth

Reddit OAuth2 "web app" flow, fully server-mediated:

1. User taps **Log in** → client navigates to `/api/auth/start`.
2. `/api/auth/start` (serverless) generates a `state` nonce, stores it in a short-lived signed cookie, and 302s to:
   `https://www.reddit.com/api/v1/authorize?client_id=...&response_type=code&state=...&redirect_uri=https://redfeed.app/api/auth/callback&duration=permanent&scope=identity+read+vote+submit+save+history`.
3. Reddit redirects back to `/api/auth/callback?code=...&state=...`.
4. Callback verifies `state`, POSTs to `https://www.reddit.com/api/v1/access_token` with HTTP Basic auth (`client_id:client_secret`) to exchange the code for `{ access_token, refresh_token, expires_in }`.
5. We set two **HTTP-only, Secure, SameSite=Lax** cookies on our own origin:
   - `rf_refresh` — the Reddit refresh token (long-lived).
   - `rf_access` — the current access token + expiry (short-lived, rotated on demand).
6. The client never sees either token. It discovers login state via `GET /api/me`, which returns the username (or 401).

**Token refresh:** on any `/api/*` write call, if `rf_access` is missing or within 60s of expiry, the handler refreshes via `POST /api/v1/access_token` with `grant_type=refresh_token`, writes the new access cookie, then proceeds.

**Logout:** `POST /api/auth/logout` revokes the token (`POST /api/v1/revoke_token`) and clears both cookies.

**Secrets:** `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_REDIRECT_URI`, `COOKIE_SIGNING_KEY` live in Vercel env vars.

**User-Agent:** every outbound request to Reddit (anon reads and authed writes) sends
`User-Agent: web:app.redfeed:v0.1.0 (by /u/<owner>)` per Reddit's API rules.

## Commenting

Commenting is a **stretch** feature; MVP threads are read-only.

- Client calls `POST /api/comment` with `{ parent: "t3_xxx" | "t1_yyy", text: "..." }`.
- Serverless handler:
  1. Refreshes the access token if needed.
  2. Sends `POST https://oauth.reddit.com/api/comment` with `Authorization: bearer <token>` and form body `thing_id=<parent>&text=<markdown>&api_type=json`.
  3. Parses the response: on success Reddit returns the newly created comment object; we forward it.
  4. On error (rate limit, `RATELIMIT`, `TOO_OLD`, etc.), we forward Reddit's error message to the client for display in a toast.
- UI: a simple textarea with a Submit button, placed **only** on the thread page, never on feed rows. The comment form is itself a single tap zone; it expands on focus. No inline "quick reply" on list rows.
- Rate-limit handling: if Reddit returns a `RATELIMIT` error, show the wait time and disable submit until then.
- Markdown is passed through as-is; Reddit renders it server-side when returning comment HTML.

## Architecture

```
+-----------------+       +----------------------+       +-----------------------+
|  React SPA      | <---> |  Vercel Serverless   | <---> |  reddit.com           |
|  (Vite)         |       |  Functions (/api/*)  |       |  + oauth.reddit.com   |
+-----------------+       +----------------------+       +-----------------------+
                                                          + i.redd.it, v.redd.it
                                                          + preview.redd.it (imgs)
```

- **Client**: React + TypeScript, Vite, React Router, TanStack Query for data fetching/caching. Image rendering uses native `<img>` with `loading="lazy"` and `sizes` / `srcset` from Reddit's `preview.images[0].resolutions`.
- **Read path (anonymous, MVP)**: client calls `https://www.reddit.com/r/.../.json` directly when CORS permits; falls back to `/api/r/*` proxy if Reddit blocks the origin. Preference: proxy everything through our own `/api/feed` to (a) set the required `User-Agent` and (b) keep a single cache layer.
- **Read path (logged-in)**: client calls `/api/feed?...`, which uses the user's OAuth token against `oauth.reddit.com` so subscriber-only or NSFW-gated content works.
- **Write path**: client calls `/api/vote`, `/api/comment`, `/api/save`. Serverless handlers attach the server-held OAuth token.
- **Seen store**: `localStorage` key `rf.seen.v1` = `{ [fullname]: timestamp }`. Pruned on load to drop entries older than 30 days.
- **No DB** — auth lives in cookies, seen state in `localStorage`, everything else in TanStack Query's cache.

## Post row layout

This is the single most important UI decision in the app, so it is specified in full.

### Link / self-post row

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   ▲     Story title goes here, wrapping to two lines     │
│         if needed.                                       │
│         example.com · r/subreddit · 3h                   │
│                                        ┌──────────────┐  │
│         412 points                     │ 128 comments │  │
│                                        └──────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
   ^     ^                                      ^
   |     |                                      |
  Vote  Title tap → external article         Dedicated button,
  (opt) (for self-posts, → thread)           opens comments thread.
```

### Image / gallery / video row

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   ▲     Story title (one line, truncated)                │
│         r/subreddit · 3h                                 │
│         ┌────────────────────────────────────┐           │
│         │                                    │           │
│         │            [  IMAGE  ]             │  ▶ / 1/7  │
│         │                                    │           │
│         └────────────────────────────────────┘           │
│                                        ┌──────────────┐  │
│         412 points                     │ 128 comments │  │
│                                        └──────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
   ^     ^                                      ^
   |     |                                      |
  Vote  Image tap → thread view                Dedicated button,
  (opt) (image is THE primary tap target)     opens comments thread.
```

Tap zones — there are never more than these three:

- **▲ Upvote** (only when logged in; when logged out, the column collapses and content shifts left). Min 48×48px. Stretch feature.
- **Main content** — either the title (link/self posts) or the image (image/gallery/video posts). Tapping a title on a link post opens the external URL; tapping a title on a self post opens the thread; tapping an image, gallery cover, or video preview always opens the thread. `target="_blank" rel="noopener noreferrer"` for external.
- **"N comments" button** — a real padded, outlined button on the right, not an inline text link. Tapping opens `/r/:sub/comments/:id`. Has its own 48×48px hit area and ≥12px horizontal gap from the main content. `stopPropagation` on tap.

Everything else is display-only:

- Score, age, subreddit name, author — plain text in the metadata row.
- Domain — plain text under the title, not a link.
- Flair — plain text badge, not tappable.
- NSFW / spoiler — the image is blurred with a "Tap to reveal" overlay; tap once reveals, second tap (on the unblurred image) opens the thread. This is the only exception to the "one action per tap zone" rule.

What is deliberately **not** rendered:

- Rank numbers.
- Save, share, hide, report, crosspost buttons.
- Inline author link. The author appears on the thread page, where there's room.
- "…" menus.
- Awards.

### Seen state visuals

- **Unseen**: full opacity, normal border.
- **Seen (dim mode, default)**: 40% opacity on the title and image, metadata unchanged, 1px border becomes 0.5px subtle.
- **Seen (hide mode)**: row is not rendered; a single collapsed "N seen posts" separator appears where a run of seen posts used to be, tappable to expand.

### Spacing / sizing

- Row vertical padding: 16px top and bottom. Min row height: 72px for text rows, grows with image aspect ratio for media rows (capped at `max-height: 80vh` on mobile).
- Min hit area per tap zone: 48×48px.
- Min dead space between adjacent tap zones: 8px; between main content and the comments button, ≥12px.
- Pressed state (subtle background darkening) on every tap zone so the user sees which region received their tap.

## Image handling details

Reddit image URLs are inconsistent; we normalize on the server (`src/lib/media.ts`) using this priority:

1. `preview.images[0].source.url` (HTML-entity-decoded) — preferred, respects Reddit's CDN.
2. `preview.images[0].resolutions[]` — used to build a `srcset` (320w, 640w, 960w, 1080w).
3. `url` if `post_hint === "image"` or URL ends in `.jpg|.jpeg|.png|.gif|.webp`.
4. For `is_gallery`: iterate `gallery_data.items`, resolve each `media_id` via `media_metadata[id].s.u` (entity-decoded).
5. For `v.redd.it`: use `preview.images[0].source.url` as the poster frame; MP4 playback is stretch.
6. For imgur `.gifv`, rewrite to `.mp4`; for imgur album links, MVP shows the link-post row (no inline).
7. Fallback: if `thumbnail` is a URL (not `"self"`, `"default"`, `"nsfw"`, `"spoiler"`), use it at natural size (max 140px).

All preview URLs come back HTML-entity-encoded (`&amp;` instead of `&`); we decode before rendering.

## Visual Design

- Primary accent: `#ff4500` (Reddit orange) for the upvote arrow (active) and the focused comments button outline.
- Background: `#ffffff` page, `#f7f7f8` between rows (subtle 1px rule in `#e5e5ea`).
- Text: `#1a1a1b` primary, `#7c7c83` metadata.
- Seen opacity: 0.4 on title + image, 1.0 on metadata.
- Font stack: system UI (`-apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif`).
- **Tap targets: ≥48×48px, ≥8px spacing between any two distinct targets.**
- **At most 3 tappable zones per post row** (vote + content + comments); fewer when logged out (2) or for self-posts with no external URL (same 2).
- Layout: single column, max-width ~720px, centered on desktop.
- Active/pressed state on every tappable zone.

## Routes

| Path | View |
|---|---|
| `/` | redirects to `/r/popular` |
| `/r/:sub` | subreddit feed (default sort `hot`) |
| `/r/:sub/:sort` | subreddit feed with sort |
| `/r/:sub/top/:t` | top with time window |
| `/r/:sub/comments/:id` | post + comments |
| `/r/:sub/comments/:id/:slug` | canonical Reddit permalink (same view) |
| `/u/:name` | user profile (stretch) |
| `/login` | starts OAuth (stretch) |
| `/settings` | seen-mode toggle, clear seen history, logout |

## Accessibility

- Semantic HTML (`<main>`, `<nav>`, `<article>`).
- Visible focus styles on every tap zone.
- `prefers-reduced-motion` respected for collapse animations and gallery transitions.
- Alt text from Reddit's `media_metadata[id].caption` when present; otherwise the post title is used as the image alt.
- Color contrast ≥ 4.5:1 for body text.
- NSFW blur overlay is also keyboard-activatable.

## Performance Targets

- First Contentful Paint < 1.5s on a 4G mobile profile.
- JS bundle (initial) < 180KB gzipped.
- Feed render < 100ms after data arrives.
- Images: lazy-loaded, `sizes` attribute set, `aspect-ratio` declared at render time from `preview.images[0].source.{width,height}` so the page doesn't reflow as images load.

## Error Handling

- Network / Reddit 5xx: inline retry button on the feed row / thread.
- `403 Forbidden` (private sub, banned sub, quarantined, age-gated): friendly inline card explaining the state; quarantined subs prompt login.
- Deleted / removed posts: `[removed]` / `[deleted]` placeholder, don't 500.
- Vote / comment failures: toast with Reddit's returned message when possible. Rate-limit errors show the remaining wait time.
- OAuth failures: bounce back to home with a one-line toast; never leave the user on a blank error page.

## Testing

- **Unit:** Vitest + React Testing Library for components, pure functions (time formatting, media URL normalizer, domain extractor, seen-store).
- **Integration:** MSW to mock `reddit.com` and `oauth.reddit.com` responses; test the feed and thread views end-to-end.
- **Serverless:** Vitest with direct handler calls; mock `fetch` for outbound Reddit calls. Cover the OAuth code-exchange, refresh, vote, and comment handlers.
- **Seen-store tests:** scroll simulation marks items seen; TTL pruning drops old entries; toggle between dim and hide modes re-renders correctly.
- **Smoke:** one Playwright test that loads `/r/popular` against a preview deploy (stretch).

## Deployment

- Vercel project connected to the repo. `main` → production, all branches → preview.
- Environment variables:
  - `REDDIT_CLIENT_ID`
  - `REDDIT_CLIENT_SECRET`
  - `REDDIT_REDIRECT_URI`
  - `REDDIT_USER_AGENT` (e.g. `web:app.redfeed:v0.1.0 (by /u/<owner>)`)
  - `COOKIE_SIGNING_KEY` — HMAC key for the OAuth state cookie
  - `SESSION_COOKIE_PREFIX=rf_` (optional override)

## Open Questions

- **CORS for anonymous reads.** Reddit's public JSON endpoints have historically allowed cross-origin reads, but this is not contractual. If we hit CORS failures we route all reads through `/api/feed`. *Tentative decision: proxy everything through `/api/feed` from day one for consistency and caching.*
- **Rate limiting.** Reddit's OAuth API limits to 100 QPM per OAuth client. Anonymous `.json` endpoints have looser but unpublished limits. We add a small in-memory LRU on the serverless side so rapid-fire feed reloads don't burn the budget.
- **NSFW handling.** MVP blurs NSFW thumbnails and requires a tap to reveal; we do not gate the app behind an age check. Fully NSFW-only subs remain visible to logged-in 18+ users via Reddit's own flag.
- **Quarantined subs.** Reddit requires an explicit opt-in before serving content from quarantined subs; we'll surface Reddit's own message and not attempt to bypass it.
- **Seen sync.** Do we sync the local seen list up to Reddit's server-side `/api/hide` for logged-in users? *Decision: opt-in in Settings, stretch feature.*
- **Trademark / naming.** `redfeed.app` is the working domain; confirm availability before launch.

---
