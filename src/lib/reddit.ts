export interface RedditPost {
  id: string;
  name: string;
  subreddit: string;
  subreddit_name_prefixed: string;
  title: string;
  author: string;
  created_utc: number;
  score: number;
  num_comments: number;
  permalink: string;
  url: string;
  is_self: boolean;
  selftext_html: string | null;
  post_hint?: string;
  preview?: {
    images: Array<{
      source: { url: string; width: number; height: number };
      resolutions: Array<{ url: string; width: number; height: number }>;
    }>;
  };
  is_gallery?: boolean;
  gallery_data?: { items: Array<{ media_id: string }> };
  media_metadata?: Record<string, { s?: { u?: string; x?: number; y?: number } }>;
  thumbnail: string;
  over_18: boolean;
  spoiler: boolean;
  stickied: boolean;
  domain: string;
}

interface Listing<T> {
  kind: "Listing";
  data: {
    after: string | null;
    before: string | null;
    children: Array<{ kind: string; data: T }>;
  };
}

export interface FeedResult {
  posts: RedditPost[];
  after: string | null;
}

export async function fetchFeed(
  sub: string,
  sort = "hot",
  after?: string | null,
  signal?: AbortSignal,
): Promise<FeedResult> {
  const params = new URLSearchParams({ sub, sort, limit: "25" });
  if (after) params.set("after", after);
  const res = await fetch(`/api/feed?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`Feed request failed: ${res.status}`);
  const json = (await res.json()) as Listing<RedditPost>;
  return {
    posts: json.data.children.filter((c) => c.kind === "t3").map((c) => c.data),
    after: json.data.after,
  };
}
