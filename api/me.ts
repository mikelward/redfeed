import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getUserToken, redditFetch } from "./_redditAuth.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const token = await getUserToken(req, res);
  if (!token) {
    res.setHeader("Cache-Control", "no-store");
    res.status(401).json({ error: "not logged in" });
    return;
  }
  try {
    const upstream = await redditFetch({
      path: "/api/v1/me",
      userToken: token,
    });
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      res
        .status(upstream.status)
        .json({ error: `reddit ${upstream.status}`, detail: detail.slice(0, 200) });
      return;
    }
    const data = (await upstream.json()) as {
      name?: string;
      total_karma?: number;
      icon_img?: string;
    };
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      name: data.name ?? null,
      total_karma: data.total_karma ?? null,
      icon_img: data.icon_img ?? null,
    });
  } catch (err) {
    console.error("me handler threw", err);
    res.status(502).json({
      error: err instanceof Error ? err.message : "upstream error",
    });
  }
}
