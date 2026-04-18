import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/reddit", () => ({
  fetchComments: vi.fn(),
  fetchFeed: vi.fn(),
}));

import { loadHomePageData } from "@/app/page";
import { loadPostPageData } from "@/app/post/page";
import { fetchComments, fetchFeed } from "@/lib/reddit";

describe("page data fallbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty feed with error message when feed fetch fails", async () => {
    vi.mocked(fetchFeed).mockRejectedValue(new Error("boom"));

    await expect(loadHomePageData()).resolves.toEqual({
      feed: { posts: [], after: null },
      errorMessage: "Feed is temporarily unavailable. Please reload to try again.",
    });
  });

  it("returns feed data with no error when feed fetch succeeds", async () => {
    vi.mocked(fetchFeed).mockResolvedValue({
      posts: [],
      after: "t3_abc",
    });

    await expect(loadHomePageData()).resolves.toEqual({
      feed: { posts: [], after: "t3_abc" },
      errorMessage: null,
    });
  });

  it("returns empty comments with error message when comments fetch fails", async () => {
    vi.mocked(fetchComments).mockRejectedValue(new Error("boom"));

    await expect(loadPostPageData("/r/pics/comments/123/example/")).resolves.toEqual({
      comments: [],
      errorMessage: "Comments are temporarily unavailable. Please reload to try again.",
    });
  });

  it("returns comments with no error when comments fetch succeeds", async () => {
    vi.mocked(fetchComments).mockResolvedValue([]);

    await expect(loadPostPageData("/r/pics/comments/123/example/")).resolves.toEqual({
      comments: [],
      errorMessage: null,
    });
  });
});
