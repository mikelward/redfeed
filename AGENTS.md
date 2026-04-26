# AGENTS.md

Instructions for AI coding agents (Claude Code, etc.) working in this repo.
Keep this file short and concrete — add a new rule the first time something
bites, not the third.

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
11. **Anonymous `www.reddit.com/*.json` reads fail (403) from Vercel's serverless IPs.** Every outbound Reddit read must go through `api/_redditAuth.ts`'s `redditFetch()`, which attaches an app-only OAuth bearer token (from `REDDIT_CLIENT_ID` + optional `REDDIT_CLIENT_SECRET`) and hits `oauth.reddit.com`. Without `REDDIT_CLIENT_ID`, `redditFetch()` falls back to `www.reddit.com/*.json` — fine for local dev, 403 in production. Don't skip `redditFetch()` by calling `fetch("https://www.reddit.com/...")` directly from a handler.
12. **Call out cost and reliability up front.** Whenever you recommend new infrastructure (hosting tier, database, queue, cache, CDN, monitoring service, etc.) or a new external API call (additional Reddit fetches, third-party APIs, serverless function invocations), include a brief dollar-cost estimate — at minimum, free-tier vs. paid thresholds and a rough $/month at expected traffic — and note reliability implications: new failure modes, rate limits, added latency, extra points of failure, and what happens to the user if the dependency is down. If the cost/reliability impact is effectively zero, say so explicitly rather than omitting the note.

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

- **Fix any preexisting test failures as the *first* commit of the series.**
  If `npm test` is already red when you start a task, don't stack your work
  on top of a broken baseline. Land the fix first, on its own commit, so the
  reason each test goes red is attributable to a single change. If the
  failure is genuinely unrelated and out of scope, say so up front and
  confirm with the user before skipping past it.
- **Avoid racy / flaky tests.** Never paper over a timing race with
  `await new Promise(r => setTimeout(r, 500))`, a retry loop, or a bumped
  `findBy*` timeout. If a test depends on ordering (async resolution,
  render commit, effect flush, layout measurement), make the ordering
  explicit: resolve a controlled promise, advance fake timers, wrap in
  `act(...)`, or hold the in-flight fetch open behind a gate you release
  from the test. A test that passes "most of the time" is broken; rewrite
  it or fix the underlying cause.

## Code style

- TypeScript `strict` mode on. No `any` unless justified in a comment.
- Function components + hooks; no class components.
- CSS Modules or plain CSS with variables; no heavy UI kits.
- Keep components small (< ~150 lines). Extract hooks for data fetching and for the seen-store.
- No comments that just restate the code. Comments should explain *why*.
- HTML from Reddit (`selftext_html`, `body_html`, `media_metadata` captions) is **always** sanitized with DOMPurify before rendering.

## CSS gotchas

- **Sticky `:hover` on touch devices.** On phones and tablets, tapping a
  button leaves the `:hover` style "stuck" on it until the user taps
  somewhere else — a touch has no corresponding "leave" event, so the
  browser keeps the hovered state active. The symptom is an unwanted
  background (or color/shadow) lingering on a button after the tap
  completes. **Fix:** wrap any `:hover` rule that changes the painted
  appearance of the element in `@media (hover: hover) { … }` so it
  only applies on devices with a true pointer. Keep the matching
  `:active` rule **outside** the media query so the pressed-state
  darkening still fires on touch. Every new tappable (button, link,
  icon button) should follow the same shape.

## Architecture notes

- **Read path (anonymous):** client → `/api/feed` → `https://www.reddit.com/r/.../.json`. Proxying lets us attach the required `User-Agent` and cache.
- **Read path (logged-in):** client → `/api/feed` → `https://oauth.reddit.com/...` with the user's token.
- **Write path (vote/comment/save):** client → `/api/vote` | `/api/comment` | `/api/save` → `https://oauth.reddit.com/api/...`. The user's OAuth token is stored in our own HTTP-only cookie and attached server-side.
- **OAuth:** standard `code` flow. Refresh token in `rf_refresh` cookie; access token in `rf_access` cookie; both HTTP-only, Secure, SameSite=Lax. Refresh happens lazily on any write handler when the access token is missing or within 60s of expiry.
- **Dismissed store:** `localStorage` key `rf.dismissed.v1`; values are `{ [fullname]: timestamp }`. 7-day TTL. Exposed via a `useDismissedStories()` hook; the IntersectionObserver lives in `useAutoDismissOnScroll()`. Never writes to the network in MVP.
- **Media normalizer (`src/lib/media.ts`):** the one place that turns a Reddit post into a renderable `{ kind, src, srcset, width, height, badge? }` shape. All image rendering flows through it. See *Image handling details* in `SPEC.md` for the priority order.

## Vercel `api/` gotchas

- **No shared modules for `api/*.ts` — keep helpers inlined, even if
  they're duplicated across handlers.** Both obvious escape hatches
  from the duplication fail *only at deploy time*, after every local
  check (`npm test`, `lint`, `typecheck`, `build`) has passed:
  1. Importing from outside `api/` (e.g. `src/lib/…`, a sibling
     top-level `lib/` folder). The Vercel bundler's import tracer
     inconsistently includes the files.
  2. Importing from a `_`-prefixed directory inside `api/`
     (e.g. `api/_lib/session.ts`). Vercel treats `_` as "don't route"
     *and* "don't ship", so the deployed Lambda errors at startup
     with `ERR_MODULE_NOT_FOUND`.

  A non-underscore subdirectory (`api/lib/…`) would ship, but Vercel
  would route every file in it as its own serverless function. The
  accepted pattern is to copy-paste the helper, add a comment that
  points at the siblings, and move on. (Verified the hard way on
  the sibling newshacker project.)

## Safe vs. risky actions

- Safe: edit files, add dependencies, run tests, run the dev server.
- Ask first before: force-pushing, rewriting git history, deleting branches, changing Vercel project settings, changing CI secrets, rotating the Reddit OAuth client secret, adding paid/third-party services.

## Branching

- **Workflow.** `claude/<short-topic>` branch off `origin/main` → PR → merge via rebase or squash. One topic per branch. Follow-up work after a merge goes on a new branch. Never commit to `main` / `master`.
- **Stacked PRs.** The lower PR (infra) targets `main`; the upper PR (feature) targets the lower PR's branch. When the lower PR merges to `main`, rebase the upper one onto `main`.
- **One commit per logical surviving change on the branch.** Rewrite unmerged commits freely (squash, amend, reorder, split) so each landing commit is one coherent change. Review-fix noise shouldn't survive into `main`.
- `git push --force-with-lease` to your own live feature branch after a rebase is routine hygiene — don't ask. Confirm before any destructive action on shared/merged branches.
- **Merge cue (`merged` / `I merged` / `landed` / merge webhook) runs hygiene *before* engaging with the rest of the message:** `git fetch origin`, cut a fresh `claude/<short-topic>` branch off `origin/main`, announce the switch.
- End every reply with the open-PR link (or `.../compare/main...<branch>` until a PR exists). Never link to a closed or merged PR.

## Pull requests and reviews

- Open PRs ready for review (not draft) unless asked otherwise.
- When a feature has multiple open PRs in a stack, list **every** open PR
  on the feature by URL, one per line — the "View PR" chip sticks to the
  first link and hides the rest (anthropics/claude-code#46625).
- Watch the review for automated findings and any comments, and proactively
  address them.
- Never leave a review comment thread silently dismissed. Either reply on
  the thread *or* resolve it. When you think a comment is a false positive,
  say *why* on the thread (one or two sentences). Acknowledgement noise
  ("good catch, will do") is fine and preferred over silence.

## CI

- After pushing, **wait for CI** before claiming a change works in any
  environment you can't test locally (Vercel deploy-only failures, etc.).
  Webhooks deliver — don't poll.
- Report significant CI timing regressions (rule of thumb: >25% or >30s
  on a job under ~5min). Don't narrate routine wobble. Name the likely
  cause: heavy new dependency, slow new test, cache invalidation.

## When in doubt

- Check `SPEC.md` for product decisions.
- If a task seems to conflict with the spec, flag it and ask rather than silently diverging.
