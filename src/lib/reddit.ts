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

export interface RedditComment {
  id: string;
  name: string;
  author: string;
  body: string;
  body_html: string | null;
  score: number;
  score_hidden?: boolean;
  created_utc: number;
  depth: number;
  stickied?: boolean;
  permalink: string;
  replies: Listing<RedditCommentOrMore> | "" | null;
}

export interface RedditMore {
  id: string;
  name: string;
  count: number;
  depth: number;
  parent_id: string;
  children: string[];
}

export type RedditCommentOrMore =
  | (RedditComment & { __kind?: "t1" })
  | (RedditMore & { __kind?: "more" });

export interface ThreadResult {
  post: RedditPost;
  comments: Array<{ kind: "t1" | "more"; data: RedditCommentOrMore }>;
}

export async function fetchThread(
  sub: string,
  id: string,
  signal?: AbortSignal,
): Promise<ThreadResult> {
  const params = new URLSearchParams({ sub, id });
  const res = await fetch(`/api/thread?${params.toString()}`, { signal });
  if (!res.ok) {
    throw buildRequestError("Thread request failed", res, await readErrorBody(res));
  }
  const json = (await res.json()) as [
    Listing<RedditPost>,
    Listing<RedditCommentOrMore>,
  ];
  const post = json[0].data.children[0].data;
  const comments = json[1].data.children.map((c) => ({
    kind: c.kind as "t1" | "more",
    data: c.data,
  }));
  return { post, comments };
}

interface ErrorBody {
  error?: string;
  detail?: string;
}

async function readErrorBody(res: Response): Promise<ErrorBody> {
  try {
    return (await res.json()) as ErrorBody;
  } catch {
    return {};
  }
}

function buildRequestError(prefix: string, res: Response, body: ErrorBody): Error {
  if (body.error === "reddit_credentials_missing") {
    return new Error(
      body.detail ??
        "Reddit API credentials are not configured on the server. " +
          "Waiting on Reddit to approve and issue an API key.",
    );
  }
  const parts = [body.error, body.detail].filter((s): s is string => !!s);
  const suffix = parts.length ? ` — ${parts.join(" — ")}` : "";
  return new Error(`${prefix}: ${res.status}${suffix}`);
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
  if (!res.ok) {
    throw buildRequestError("Feed request failed", res, await readErrorBody(res));
  }
  const json = (await res.json()) as Listing<RedditPost>;
  return {
    posts: json.data.children.filter((c) => c.kind === "t3").map((c) => c.data),
    after: json.data.after,
  };
}
