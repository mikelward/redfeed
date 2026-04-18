import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PostRow from "./PostRow";
import type { RedditPost } from "../lib/reddit";

function makePost(overrides: Partial<RedditPost> = {}): RedditPost {
  return {
    id: "abc",
    name: "t3_abc",
    subreddit: "pics",
    subreddit_name_prefixed: "r/pics",
    title: "Look at this cat",
    author: "alice",
    created_utc: Math.floor(Date.now() / 1000) - 3600,
    score: 1234,
    num_comments: 56,
    permalink: "/r/pics/comments/abc/look_at_this_cat",
    url: "https://example.com/article",
    is_self: false,
    selftext_html: null,
    thumbnail: "",
    over_18: false,
    spoiler: false,
    stickied: false,
    domain: "example.com",
    ...overrides,
  };
}

function renderRow(post: RedditPost) {
  return render(
    <MemoryRouter>
      <PostRow post={post} />
    </MemoryRouter>,
  );
}

describe("PostRow", () => {
  it("renders title, subreddit, and comments count", () => {
    renderRow(makePost());
    expect(screen.getByText("Look at this cat")).toBeInTheDocument();
    expect(screen.getByText("r/pics")).toBeInTheDocument();
    expect(screen.getByLabelText(/56 comments/)).toBeInTheDocument();
  });

  it("link posts open the external URL in a new tab", () => {
    renderRow(makePost());
    const links = screen.getAllByRole("link");
    const main = links.find((l) => l.textContent?.includes("Look at this cat"));
    expect(main).toHaveAttribute("href", "https://example.com/article");
    expect(main).toHaveAttribute("target", "_blank");
    expect(main).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("self posts link to the thread, not external", () => {
    renderRow(
      makePost({
        is_self: true,
        url: "https://reddit.com/r/pics/comments/abc",
        domain: "self.pics",
      }),
    );
    const links = screen.getAllByRole("link");
    const main = links.find((l) => l.textContent?.includes("Look at this cat"));
    expect(main).not.toHaveAttribute("target");
    expect(main).toHaveAttribute(
      "href",
      "/r/pics/comments/abc/look_at_this_cat",
    );
  });

  it("image posts render an <img> with alt text = title", () => {
    renderRow(
      makePost({
        post_hint: "image",
        url: "https://i.redd.it/x.jpg",
        preview: {
          images: [
            {
              source: {
                url: "https://preview.redd.it/x.jpg?s=a&amp;b=c",
                width: 800,
                height: 600,
              },
              resolutions: [],
            },
          ],
        },
      }),
    );
    const img = screen.getByAltText("Look at this cat") as HTMLImageElement;
    expect(img.src).toBe("https://preview.redd.it/x.jpg?s=a&b=c");
  });

  it("exposes exactly two links per row (main + comments) for a link post", () => {
    renderRow(makePost());
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
});
