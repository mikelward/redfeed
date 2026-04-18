# Redfeed

Redfeed is a mobile-friendly Reddit client built with React (Next.js) for Vercel deployment.

## Current MVP

- RSS-style scrolling feed from Reddit popular
- Hide post and ignore subreddit actions persisted in localStorage
- Media-forward cards for image/gallery content
- Read-only threaded comments page
- Initial Reddit OAuth route scaffolding

## Environment variables

Configure these for OAuth scaffolding:

- `REDDIT_CLIENT_ID`
- `REDDIT_CLIENT_SECRET`
- `REDDIT_REDIRECT_URI` (optional; defaults to `/api/auth/reddit/callback` on current host)

## Local development

```bash
npm install
npm run dev
```

## Validation

```bash
npm run lint
npm run build
npm test
```
