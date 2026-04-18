import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import FeedPage from "./FeedPage";
import { DISMISSED_KEY } from "../lib/dismissedStore";

interface FixturePost {
  id: string;
  title: string;
}

const listing = (posts: FixturePost[], after: string | null = null) => ({
  kind: "Listing",
  data: {
    after,
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

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

function stubSinglePage() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      jsonResponse(
        listing([
          { id: "a", title: "Post A" },
          { id: "b", title: "Post B" },
          { id: "c", title: "Post C" },
        ]),
      ),
    ),
  );
}

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
    stubSinglePage();
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

  it('shows "End of feed." when the first page returns no after cursor', async () => {
    renderFeed();
    await waitFor(() => screen.getByText("Post A"));
    expect(screen.getByText("End of feed.")).toBeInTheDocument();
    expect(screen.queryByLabelText("load more posts")).not.toBeInTheDocument();
  });
});

describe("FeedPage pagination", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("appends a second page when Load more is tapped, then ends", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          listing(
            [
              { id: "a", title: "Post A" },
              { id: "b", title: "Post B" },
            ],
            "t3_b",
          ),
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          listing([
            { id: "c", title: "Post C" },
            { id: "d", title: "Post D" },
          ]),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    renderFeed();
    await waitFor(() => screen.getByText("Post A"));
    expect(screen.queryByText("Post C")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("load more posts"));
    await waitFor(() => screen.getByText("Post C"));
    expect(screen.getByText("Post A")).toBeInTheDocument();
    expect(screen.getByText("Post D")).toBeInTheDocument();
    expect(screen.getByText("End of feed.")).toBeInTheDocument();

    const url2 = String(fetchMock.mock.calls[1][0]);
    expect(url2).toContain("after=t3_b");
  });

  it("de-dupes posts that show up in two pages", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          listing([{ id: "a", title: "Post A" }], "t3_a"),
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          listing([
            { id: "a", title: "Post A" },
            { id: "b", title: "Post B" },
          ]),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    renderFeed();
    await waitFor(() => screen.getByText("Post A"));
    await user.click(screen.getByLabelText("load more posts"));
    await waitFor(() => screen.getByText("Post B"));
    expect(screen.getAllByText("Post A")).toHaveLength(1);
  });

  it("surfaces a Retry control when load-more fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          listing([{ id: "a", title: "Post A" }], "t3_a"),
        ),
      )
      .mockRejectedValueOnce(new Error("boom"));
    vi.stubGlobal("fetch", fetchMock);

    renderFeed();
    await waitFor(() => screen.getByText("Post A"));
    await user.click(screen.getByLabelText("load more posts"));
    await waitFor(() => screen.getByText(/boom/));
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
