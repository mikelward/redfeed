import type { VercelRequest, VercelResponse } from "@vercel/node";

const SUB_RE = /^[A-Za-z0-9_+]+$/;
const ID_RE = /^[a-z0-9]{1,16}$/;

function userAgent(): string {
  return process.env.REDDIT_USER_AGENT ?? "web:app.redfeed:v0.1.0 (by /u/redfeed)";
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const sub = String(req.query.sub ?? "").trim();
  const id = String(req.query.id ?? "").trim();
  const sort = String(req.query.sort ?? "confidence").trim();
  const ALLOWED_SORTS = new Set([
    "confidence", "top", "new", "controversial", "old", "qa",
  ]);

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

  const url = new URL(`https://www.reddit.com/r/${sub}/comments/${id}.json`);
  url.searchParams.set("sort", sort);
  url.searchParams.set("raw_json", "1");

  try {
    const upstream = await fetch(url.toString(), {
      headers: {
        "User-Agent": userAgent(),
        Accept: "application/json",
      },
    });
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `reddit ${upstream.status}` });
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
    res.status(502).json({
      error: err instanceof Error ? err.message : "upstream error",
    });
  }
}
