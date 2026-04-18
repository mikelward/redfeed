import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import FeedPage from "./FeedPage";
import { DISMISSED_KEY } from "../lib/dismissedStore";

const listing = (posts: Array<{ id: string; title: string }>) => ({
  kind: "Listing",
  data: {
    after: null,
    before: null,
    children: posts.map((p) => ({
      kind: "t3",
      data: {
        id: p.id,
        name: `t3_${p.id}`,
        subreddit: "pics",
        subreddit_name_prefixed: "r/pics",
        title: p.title,
        author: "alice",
        created_utc: Math.floor(Date.now() / 1000) - 3600,
        score: 10,
        num_comments: 2,
        permalink: `/r/pics/comments/${p.id}`,
        url: "https://example.com/a",
        is_self: false,
        selftext_html: null,
        thumbnail: "",
        over_18: false,
        spoiler: false,
        stickied: false,
        domain: "example.com",
      },
    })),
  },
});

function renderFeed() {
  return render(
    <MemoryRouter initialEntries={["/r/pics"]}>
      <Routes>
        <Route path="/r/:sub" element={<FeedPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("FeedPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () =>
          listing([
            { id: "a", title: "Post A" },
            { id: "b", title: "Post B" },
            { id: "c", title: "Post C" },
          ]),
      })),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("renders posts from the feed endpoint", async () => {
    renderFeed();
    await waitFor(() => expect(screen.getByText("Post A")).toBeInTheDocument());
    expect(screen.getByText("Post B")).toBeInTheDocument();
    expect(screen.getByText("Post C")).toBeInTheDocument();
  });

  it("hides posts that are already dismissed in localStorage", async () => {
    localStorage.setItem(
      DISMISSED_KEY,
      JSON.stringify({ t3_a: Date.now(), t3_b: Date.now() }),
    );
    renderFeed();
    await waitFor(() => screen.getByText("Post C"));
    expect(screen.queryByText("Post A")).not.toBeInTheDocument();
    expect(screen.queryByText("Post B")).not.toBeInTheDocument();
  });

  it('"Restore all" empties the dismissed store and re-renders posts', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      DISMISSED_KEY,
      JSON.stringify({ t3_a: Date.now() }),
    );
    renderFeed();
    await waitFor(() => screen.getByText("Post B"));
    expect(screen.queryByText("Post A")).not.toBeInTheDocument();
    await user.click(screen.getByLabelText("restore all dismissed posts"));
    expect(screen.getByText("Post A")).toBeInTheDocument();
    expect(localStorage.getItem(DISMISSED_KEY)).toBe("{}");
  });

  it("does not render a mode toggle (filter-out is the only behavior)", async () => {
    renderFeed();
    await waitFor(() => screen.getByText("Post A"));
    expect(screen.queryByLabelText(/toggle/i)).not.toBeInTheDocument();
  });
});
