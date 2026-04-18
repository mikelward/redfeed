import type { VercelRequest, VercelResponse } from "@vercel/node";
import { redditFetch } from "./_redditAuth";

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
    const upstream = await redditFetch({
      path: `/r/${sub}/comments/${id}`,
      query: { sort },
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
    res.setHeader(
      "Cache-Control",
      "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
    );
    res.status(200).send(body);
  } catch (err) {
    console.error("thread handler threw", err);
    res.status(502).json({
      error: err instanceof Error ? err.message : "upstream error",
    });
  }
}
