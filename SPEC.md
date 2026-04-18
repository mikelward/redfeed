# Redfeed Specification

## Goal
Build a mobile-friendly Reddit client inspired by RSS reading workflows (quick scan, hide/ignore while scrolling), using React and Vercel.

## Scope (MVP)
- Reddit popular feed reader with mobile-first UI
- RSS-style card stream with image-first rendering
- Hide post action and ignore subreddit action with local persistence
- Post detail page with read-only threaded comments
- Initial Reddit OAuth scaffolding for authenticated features

## Architecture
- Framework: Next.js (React, App Router)
- Hosting target: Vercel
- Data access:
  - Server utilities fetch Reddit JSON endpoints
  - API route `/api/feed` for paginated feed loading from client
  - Feed/details pages use dynamic server rendering to avoid build-time Reddit fetch dependency
- Persistence:
  - Browser localStorage for hidden posts and ignored subreddits
- Auth scaffold:
  - `/api/auth/reddit/start` begins OAuth flow
  - `/api/auth/reddit/callback` exchanges code for token and stores token in secure HTTP-only cookie
  - Cookie `secure` attribute is environment-aware (enabled in production)

## Product Decisions
- Anonymous read mode is default
- Login is only required for future vote/save/comment actions
- Image/gallery posts are prioritized visually with safe aspect-ratio rendering
- NSFW/spoiler posts are hidden behind a manual reveal control

## Open Follow-ups
- Move token storage from cookie-only approach to encrypted session storage
- Add write operations (comment/vote/save) after session hardening
- Add richer moderation filters (keywords/domains)

## Implementation Status
- Implemented feed endpoint + client infinite loading
- Implemented hide post + ignore subreddit persistence
- Implemented media-forward card rendering with NSFW/spoiler reveal gating
- Implemented OAuth start/callback route scaffolding for Reddit
- Implemented read-only threaded comments page
- Added unit tests for media mapping and post preference logic
