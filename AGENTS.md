# AGENTS.md

Instructions for AI coding agents (Claude Code, etc.) working in this repo.

## Project at a glance

- **Redfeed** — an unofficial mobile-friendly reader *for* Reddit. Not affiliated with Reddit, Inc. Working domain `redfeed.app`.
- Stack: **React + TypeScript + Vite**, deployed on **Vercel**.
- Stretch goals (login, voting, commenting) use **Vercel serverless functions** under `/api`.
- Read data comes from Reddit's public JSON endpoints (anonymous) or `oauth.reddit.com` (logged in). Write actions go through the real Reddit OAuth API — we do **not** scrape HTML.
- The defining UX idea beyond "fewer tap targets" is **RSS-style auto-dismiss**: a post that has been intersecting the viewport and then scrolls completely off the top is dismissed and hard-filtered out of the feed. An Undo toast covers accidental dismissals. No dim mode, no separator, no collapsed run — dismissed is dismissed.
- See `SPEC.md` for the product spec.
- Never call the app "Reddit" or use Reddit's logo/alien as the app icon. "Reddit" may be referenced in copy as the source (e.g. "a reader for Reddit").

## Golden rules

1. **Always add tests.** Every new function, hook, component, or serverless handler needs at least one test that exercises its behavior. Bug fixes get a regression test that fails before the fix.
2. **Always run tests automatically.** Before reporting a task as done, run `npm test` (and `npm run lint`, `npm run build` when relevant) and make them pass. Don't hand work back with red tests.
3. Prefer editing existing files to creating new ones. Don't create docs/README files unless asked.
4. Keep the UI mobile-first. Accent color is Reddit orange (`#ff4500`), background is neutral (`#ffffff` / `#f7f7f8`), not Reddit's own chrome.
5. **Fewer, larger tap targets.** A post row has at most three tap zones — upvote (logged-in only), main content (title *or* image), and the "N comments" button — in that left-to-right order. No inline text links in metadata rows, no save/share/hide/"…" buttons on rows. Min 48×48px per target, ≥8px between adjacent targets (≥12px between main content and the comments button). See *Post row layout* in `SPEC.md`; if a change would add another tappable element to a row, push back or flag it.
6. **Auto-dismiss is client-side only in MVP.** Don't call Reddit's `/api/hide` endpoint as part of the scroll-past behavior — that's a stretch, opt-in feature. MVP writes to `localStorage` under key `rf.dismissed.v1`. The trigger is: row was intersecting, now `isIntersecting === false` AND `boundingClientRect.bottom <= headerOffset`. Scrolling off the bottom must **not** dismiss. Don't reintroduce a dim/hide toggle — dismissed rows are filtered out entirely, matching mikelward/newshacker's behavior.
7. **Never expose OAuth tokens to the client.** Tokens live in HTTP-only cookies on our origin; only `/api/*` handlers read them.
8. Don't introduce a backend service or database — Reddit's API + serverless proxy + `localStorage` is enough.
9. Don't implement submitting new posts, moderation, modmail, chat, or reporting.
10. Always send Reddit a descriptive `User-Agent` on every outbound request (from `REDDIT_USER_AGENT` env var). Reddit will rate-limit or ban requests without one.

## Commands

```bash
npm install          # install deps
npm run dev          # local dev server (Vite)
npm test             # run Vitest in CI mode
npm run test:watch   # Vitest watch mode
npm run lint         # lint
npm run typecheck    # tsc --noEmit
npm run build        # production build
```

If a command above doesn't exist yet (early in the project), add it to `package.json` as part of your change.

## Testing expectations

- **Framework:** Vitest + React Testing Library + jsdom.
- **Network mocking:** MSW for anything that hits `reddit.com`, `oauth.reddit.com`, or Reddit's media CDNs.
- **Serverless tests:** call the handler directly with a mocked `Request`/`Response`; mock `fetch` for outbound Reddit calls. Must cover OAuth code-exchange, refresh, vote, and comment paths.
- **Dismissed-store tests:** verify `shouldDismiss()` returns true only when `!isIntersecting && wasSeen && rect.bottom <= threshold`; verify `localStorage` keys; verify 7-day TTL pruning; verify Undo restores the row.
- **Coverage floor:** 80% for files in `src/lib/` and `api/`.
- **Required runs before marking a task done:**
  1. `npm test`
  2. `npm run lint`
  3. `npm run typecheck`
  4. `npm run build` (when touching build config, routing, or deploy surface)

If any of the above fails, fix it — don't disable the check.

## Code style

- TypeScript `strict` mode on. No `any` unless justified in a comment.
- Function components + hooks; no class components.
- CSS Modules or plain CSS with variables; no heavy UI kits.
- Keep components small (< ~150 lines). Extract hooks for data fetching and for the seen-store.
- No comments that just restate the code. Comments should explain *why*.
- HTML from Reddit (`selftext_html`, `body_html`, `media_metadata` captions) is **always** sanitized with DOMPurify before rendering.

## Architecture notes

- **Read path (anonymous):** client → `/api/feed` → `https://www.reddit.com/r/.../.json`. Proxying lets us attach the required `User-Agent` and cache.
- **Read path (logged-in):** client → `/api/feed` → `https://oauth.reddit.com/...` with the user's token.
- **Write path (vote/comment/save):** client → `/api/vote` | `/api/comment` | `/api/save` → `https://oauth.reddit.com/api/...`. The user's OAuth token is stored in our own HTTP-only cookie and attached server-side.
- **OAuth:** standard `code` flow. Refresh token in `rf_refresh` cookie; access token in `rf_access` cookie; both HTTP-only, Secure, SameSite=Lax. Refresh happens lazily on any write handler when the access token is missing or within 60s of expiry.
- **Dismissed store:** `localStorage` key `rf.dismissed.v1`; values are `{ [fullname]: timestamp }`. 7-day TTL. Exposed via a `useDismissedStories()` hook; the IntersectionObserver lives in `useAutoDismissOnScroll()`. Never writes to the network in MVP.
- **Media normalizer (`src/lib/media.ts`):** the one place that turns a Reddit post into a renderable `{ kind, src, srcset, width, height, badge? }` shape. All image rendering flows through it. See *Image handling details* in `SPEC.md` for the priority order.

## Safe vs. risky actions

- Safe: edit files, add dependencies, run tests, run the dev server.
- Ask first before: force-pushing, rewriting git history, deleting branches, changing Vercel project settings, changing CI secrets, rotating the Reddit OAuth client secret, adding paid/third-party services.

## Branching

- Develop on the branch the harness assigns (see the session instructions — currently `claude/reddit-client-planning-Ps2Uy`).
- Commit with clear messages. Don't create PRs unless the user asks.

## When in doubt

- Check `SPEC.md` for product decisions.
- If a task seems to conflict with the spec, flag it and ask rather than silently diverging.
