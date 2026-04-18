import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkRedditCredentials, getUserToken, redditFetch } from "./_redditAuth.js";

const SUB_RE = /^[A-Za-z0-9_+]+$/;
const ID_RE = /^[a-z0-9]{1,16}$/;
const ALLOWED_SORTS = new Set([
  "confidence", "top", "new", "controversial", "old", "qa",
]);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const sub = String(req.query.sub ?? "").trim();
  const id = String(req.query.id ?? "").trim();
  const sort = String(req.query.sort ?? "confidence").trim();

  if (!sub || !SUB_RE.test(sub)) {
    res.status(400).json({ error: "invalid sub" });
    return;
  }
  if (!id || !ID_RE.test(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  if (!ALLOWED_SORTS.has(sort)) {
    res.status(400).json({ error: "invalid sort" });
    return;
  }

  try {
    const userToken = await getUserToken(req, res);
    const missing = checkRedditCredentials(userToken);
    if (missing) {
      res.status(missing.status).json(missing.body);
      return;
    }
    const upstream = await redditFetch({
      path: `/r/${sub}/comments/${id}`,
      query: { sort },
      userToken,
    });
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error("upstream not ok", upstream.status, detail.slice(0, 500));
      res.status(upstream.status).json({
        error: `reddit ${upstream.status}`,
        detail: detail.slice(0, 500),
      });
      return;
    }
    const body = await upstream.text();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const cacheControl = userToken
      ? "private, no-store"
      : "public, max-age=30, s-maxage=60, stale-while-revalidate=120";
    res.setHeader("Cache-Control", cacheControl);
    res.status(200).send(body);
  } catch (err) {
    console.error("thread handler threw", err);
    res.status(502).json({
      error: err instanceof Error ? err.message : "upstream error",
    });
  }
}
