import { describe, expect, it } from "vitest";
import { applyHidePost, applyIgnoreSubreddit, filterVisiblePosts, MAX_HIDDEN_POSTS } from "@/lib/post-preferences";
import { FeedPost } from "@/types/reddit";

const basePost = {
  fullname: "t3_a",
  title: "title",
  author: "author",
  permalink: "/r/pics/comments/a/post/",
  url: "https://example.com",
  createdUtc: 1_700_000,
  score: 1,
  numComments: 1,
  mediaType: "link" as const,
  galleryCount: 0,
  isNsfw: false,
  isSpoiler: false,
};

const posts: FeedPost[] = [
  { ...basePost, id: "one", subreddit: "pics" },
  { ...basePost, id: "two", subreddit: "news" },
];

describe("post preferences", () => {
  it("adds hidden post to front and dedupes", () => {
    const next = applyHidePost(["one", "two"], "two");
    expect(next).toEqual(["two", "one"]);
  });

  it("limits hidden post list size", () => {
    const ids = Array.from({ length: MAX_HIDDEN_POSTS + 5 }, (_, i) => `id-${i}`);
    const next = applyHidePost(ids, "fresh-id");
    expect(next).toHaveLength(MAX_HIDDEN_POSTS);
    expect(next[0]).toBe("fresh-id");
  });

  it("normalizes ignored subreddit values", () => {
    const next = applyIgnoreSubreddit([], "  Pics ");
    expect(next).toEqual(["pics"]);
  });

  it("filters hidden and ignored posts", () => {
    const visible = filterVisiblePosts(posts, ["one"], ["news"]);
    expect(visible).toEqual([]);
  });
});
