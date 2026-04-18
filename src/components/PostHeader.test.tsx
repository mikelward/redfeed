import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PostHeader from "./PostHeader";
import type { RedditPost } from "../lib/reddit";

function makePost(overrides: Partial<RedditPost> = {}): RedditPost {
  return {
    id: "abc",
    name: "t3_abc",
    subreddit: "pics",
    subreddit_name_prefixed: "r/pics",
    title: "Title goes here",
    author: "alice",
    created_utc: Math.floor(Date.now() / 1000) - 3600,
    score: 42,
    num_comments: 5,
    permalink: "/r/pics/comments/abc",
    url: "https://example.com/a",
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

describe("PostHeader", () => {
  it("renders title and metadata", () => {
    render(<PostHeader post={makePost()} />);
    expect(screen.getByRole("heading", { name: "Title goes here" })).toBeInTheDocument();
    expect(screen.getByText("r/pics")).toBeInTheDocument();
  });

  it("renders a Read article link for external link posts", () => {
    render(<PostHeader post={makePost()} />);
    const link = screen.getByRole("link", { name: /Read article on example\.com/ });
    expect(link).toHaveAttribute("href", "https://example.com/a");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("does not render Read article for self-posts", () => {
    render(
      <PostHeader
        post={makePost({
          is_self: true,
          selftext_html:
            "&lt;div class=&quot;md&quot;&gt;&lt;p&gt;Hello &lt;b&gt;world&lt;/b&gt;&lt;/p&gt;&lt;/div&gt;",
          url: "https://reddit.com/r/pics/comments/abc",
        })}
      />,
    );
    expect(screen.queryByRole("link", { name: /Read article/ })).not.toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("renders an image for image posts", () => {
    render(
      <PostHeader
        post={makePost({
          post_hint: "image",
          url: "https://i.redd.it/x.jpg",
          preview: {
            images: [
              {
                source: { url: "https://preview.redd.it/x.jpg", width: 800, height: 600 },
                resolutions: [],
              },
            ],
          },
        })}
      />,
    );
    expect(screen.getByAltText("Title goes here")).toBeInTheDocument();
  });

  it("sanitizes self-text HTML (no <script>)", () => {
    const { container } = render(
      <PostHeader
        post={makePost({
          is_self: true,
          selftext_html:
            "&lt;p&gt;ok&lt;/p&gt;&lt;script&gt;window.x=1&lt;/script&gt;",
        })}
      />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("ok");
  });
});
