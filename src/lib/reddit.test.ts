import { describe, expect, it } from "vitest";
import { inferMediaType, mapFeedPost } from "@/lib/reddit";
import { RedditPostData } from "@/types/reddit";

function makePost(overrides: Partial<RedditPostData> = {}): RedditPostData {
  return {
    id: "abc123",
    name: "t3_abc123",
    title: "Post",
    author: "author",
    subreddit: "pics",
    permalink: "/r/pics/comments/abc123/post/",
    url: "https://i.redd.it/example.jpg",
    created_utc: 1_700_000_000,
    score: 12,
    num_comments: 3,
    is_self: false,
    is_video: false,
    over_18: false,
    spoiler: false,
    domain: "i.redd.it",
    ...overrides,
  };
}

describe("inferMediaType", () => {
  it("returns gallery for gallery posts", () => {
    expect(inferMediaType(makePost({ is_gallery: true }))).toBe("gallery");
  });

  it("returns image for image hint", () => {
    expect(inferMediaType(makePost({ post_hint: "image" }))).toBe("image");
  });

  it("returns self for self posts", () => {
    expect(inferMediaType(makePost({ is_self: true }))).toBe("self");
  });

  it("returns video for hosted video hints", () => {
    expect(inferMediaType(makePost({ post_hint: "hosted:video" }))).toBe("video");
    expect(inferMediaType(makePost({ is_video: true }))).toBe("video");
  });

  it("returns link when no media hints exist", () => {
    expect(inferMediaType(makePost({ url: "https://example.com/article", domain: "example.com" }))).toBe("link");
  });
});

describe("mapFeedPost", () => {
  it("maps and decodes preview image URL", () => {
    const mapped = mapFeedPost(
      makePost({
        preview: {
          images: [{ source: { url: "https://i.redd.it/cat&amp;dog.jpg", width: 100, height: 100 } }],
        },
      }),
    );

    expect(mapped.previewImage).toBe("https://i.redd.it/cat&dog.jpg");
  });

  it("falls back with gallery count", () => {
    const mapped = mapFeedPost(
      makePost({
        is_gallery: true,
        gallery_data: {
          items: [{ media_id: "1" }, { media_id: "2" }],
        },
      }),
    );

    expect(mapped.mediaType).toBe("gallery");
    expect(mapped.galleryCount).toBe(2);
  });
});
