import { CommentNode, FeedPage, FeedPost, RedditCommentData, RedditListingResponse, RedditPostData } from "@/types/reddit";

const REDDIT_BASE_URL = "https://www.reddit.com";

function decodeHtmlEntities(input: string): string {
  return input.replace(/&(amp|lt|gt|#x2F);/g, (match) => {
    switch (match) {
      case "&amp;":
        return "&";
      case "&lt;":
        return "<";
      case "&gt;":
        return ">";
      case "&#x2F;":
        return "/";
      default:
        return match;
    }
  });
}

function sanitizeImageUrl(url?: string): string | undefined {
  if (!url) {
    return undefined;
  }

  const decoded = decodeHtmlEntities(url);

  if (!decoded.startsWith("http://") && !decoded.startsWith("https://")) {
    return undefined;
  }

  return decoded;
}

export function inferMediaType(post: RedditPostData): FeedPost["mediaType"] {
  if (post.is_gallery) {
    return "gallery";
  }

  if (post.post_hint === "image") {
    return "image";
  }

  if (post.is_video || post.post_hint === "hosted:video") {
    return "video";
  }

  if (post.is_self) {
    return "self";
  }

  return "link";
}

export function mapFeedPost(post: RedditPostData): FeedPost {
  const previewImage = sanitizeImageUrl(post.preview?.images?.[0]?.source?.url);
  const thumbnail = sanitizeImageUrl(post.thumbnail);

  return {
    id: post.id,
    fullname: post.name,
    title: post.title,
    author: post.author,
    subreddit: post.subreddit,
    permalink: post.permalink,
    url: post.url,
    thumbnail,
    createdUtc: post.created_utc,
    score: post.score,
    numComments: post.num_comments,
    mediaType: inferMediaType(post),
    previewImage,
    galleryCount: post.gallery_data?.items?.length ?? 0,
    isNsfw: post.over_18,
    isSpoiler: post.spoiler,
    selfText: post.selftext,
  };
}

export async function fetchFeed(after?: string): Promise<FeedPage> {
  const searchParams = new URLSearchParams({
    raw_json: "1",
    limit: "25",
  });

  if (after) {
    searchParams.set("after", after);
  }

  const response = await fetch(`${REDDIT_BASE_URL}/r/popular.json?${searchParams.toString()}`, {
    headers: {
      "User-Agent": "redfeed/0.1",
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch feed (${response.status})`);
  }

  const payload = (await response.json()) as RedditListingResponse<RedditPostData>;

  return {
    posts: payload.data.children.map((child) => mapFeedPost(child.data)),
    after: payload.data.after,
  };
}

function mapComment(comment: RedditCommentData): CommentNode {
  const repliesListing =
    typeof comment.replies === "object" && comment.replies !== null ? (comment.replies as RedditListingResponse<RedditCommentData>) : null;

  return {
    id: comment.id,
    author: comment.author,
    body: comment.body ?? "",
    score: comment.score,
    createdUtc: comment.created_utc,
    replies: repliesListing
      ? repliesListing.data.children
          .filter((child) => Boolean(child?.data?.body))
          .map((child) => mapComment(child.data))
      : [],
  };
}

export async function fetchComments(permalink: string): Promise<CommentNode[]> {
  const normalizedPermalink = permalink.startsWith("/") ? permalink : `/${permalink}`;
  const commentsUrl = `${REDDIT_BASE_URL}${normalizedPermalink}.json?raw_json=1&limit=20`;

  const response = await fetch(commentsUrl, {
    headers: {
      "User-Agent": "redfeed/0.1",
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch comments (${response.status})`);
  }

  const payload = (await response.json()) as [RedditListingResponse<RedditPostData>, RedditListingResponse<RedditCommentData>];
  const commentsListing = payload[1];

  return commentsListing.data.children
    .filter((child) => Boolean(child?.data?.body))
    .map((child) => mapComment(child.data));
}
