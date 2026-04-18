import { describe, it, expect } from "vitest";
import { mediaForPost } from "./media";
import type { RedditPost } from "./reddit";

function makePost(overrides: Partial<RedditPost> = {}): RedditPost {
  return {
    id: "x",
    name: "t3_x",
    subreddit: "pics",
    subreddit_name_prefixed: "r/pics",
    title: "t",
    author: "a",
    created_utc: 0,
    score: 0,
    num_comments: 0,
    permalink: "/r/pics/comments/x",
    url: "",
    is_self: false,
    selftext_html: null,
    thumbnail: "",
    over_18: false,
    spoiler: false,
    stickied: false,
    domain: "i.redd.it",
    ...overrides,
  };
}

describe("mediaForPost", () => {
  it("returns self kind for self posts", () => {
    expect(mediaForPost(makePost({ is_self: true })).kind).toBe("self");
  });

  it("returns image kind with decoded src and srcset for post_hint image", () => {
    const m = mediaForPost(
      makePost({
        post_hint: "image",
        url: "https://i.redd.it/abc.jpg",
        preview: {
          images: [
            {
              source: {
                url: "https://preview.redd.it/abc.jpg?s=a&amp;b=c",
                width: 1200,
                height: 800,
              },
              resolutions: [
                { url: "https://preview.redd.it/abc.jpg?w=320&amp;s=x", width: 320, height: 213 },
                { url: "https://preview.redd.it/abc.jpg?w=640&amp;s=y", width: 640, height: 426 },
              ],
            },
          ],
        },
      }),
    );
    expect(m.kind).toBe("image");
    expect(m.src).toBe("https://preview.redd.it/abc.jpg?s=a&b=c");
    expect(m.srcset).toContain(" 320w");
    expect(m.srcset).toContain(" 640w");
    expect(m.srcset).not.toContain("&amp;");
    expect(m.width).toBe(1200);
  });

  it("detects images by URL extension when no post_hint", () => {
    const m = mediaForPost(makePost({ url: "https://i.imgur.com/a.png" }));
    expect(m.kind).toBe("image");
  });

  it("returns gallery with count and first image", () => {
    const m = mediaForPost(
      makePost({
        is_gallery: true,
        gallery_data: { items: [{ media_id: "m1" }, { media_id: "m2" }] },
        media_metadata: {
          m1: { s: { u: "https://preview.redd.it/m1.jpg?s=z&amp;t=1", x: 800, y: 600 } },
          m2: { s: { u: "https://preview.redd.it/m2.jpg", x: 800, y: 600 } },
        },
      }),
    );
    expect(m.kind).toBe("gallery");
    expect(m.count).toBe(2);
    expect(m.src).toBe("https://preview.redd.it/m1.jpg?s=z&t=1");
  });

  it("returns video kind with poster src", () => {
    const m = mediaForPost(
      makePost({
        post_hint: "hosted:video",
        preview: {
          images: [
            {
              source: { url: "https://preview.redd.it/poster.jpg", width: 640, height: 360 },
              resolutions: [],
            },
          ],
        },
      }),
    );
    expect(m.kind).toBe("video");
    expect(m.src).toBe("https://preview.redd.it/poster.jpg");
  });

  it("falls back to link with domain", () => {
    const m = mediaForPost(makePost({ url: "https://example.com/article", domain: "example.com" }));
    expect(m.kind).toBe("link");
    expect(m.domain).toBe("example.com");
  });
});
