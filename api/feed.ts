import type { VercelRequest, VercelResponse } from "@vercel/node";

const VALID_SORTS = new Set(["hot", "new", "top", "rising", "controversial"]);
const VALID_T = new Set(["hour", "day", "week", "month", "year", "all"]);
const SUB_RE = /^[A-Za-z0-9_+]+$/;

function userAgent(): string {
  return process.env.REDDIT_USER_AGENT ?? "web:app.redfeed:v0.1.0 (by /u/redfeed)";
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const sub = String(req.query.sub ?? "").trim();
  const sort = String(req.query.sort ?? "hot").trim();
  const after = typeof req.query.after === "string" ? req.query.after : "";
  const t = typeof req.query.t === "string" ? req.query.t : "";
  const limitRaw = Number.parseInt(String(req.query.limit ?? "25"), 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), 100)
    : 25;

  if (!sub || !SUB_RE.test(sub)) {
    res.status(400).json({ error: "invalid sub" });
    return;
  }
  if (!VALID_SORTS.has(sort)) {
    res.status(400).json({ error: "invalid sort" });
    return;
  }
  if (t && !VALID_T.has(t)) {
    res.status(400).json({ error: "invalid t" });
    return;
  }

  const url = new URL(`https://www.reddit.com/r/${sub}/${sort}.json`);
  url.searchParams.set("limit", String(limit));
  if (after) url.searchParams.set("after", after);
  if (t) url.searchParams.set("t", t);

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
