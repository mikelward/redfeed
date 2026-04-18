import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ThreadPage from "./ThreadPage";

const threadFixture = [
  {
    kind: "Listing",
    data: {
      after: null,
      before: null,
      children: [
        {
          kind: "t3",
          data: {
            id: "abc",
            name: "t3_abc",
            subreddit: "pics",
            subreddit_name_prefixed: "r/pics",
            title: "Hello thread",
            author: "alice",
            created_utc: Math.floor(Date.now() / 1000) - 60,
            score: 12,
            num_comments: 1,
            permalink: "/r/pics/comments/abc",
            url: "https://example.com/a",
            is_self: false,
            selftext_html: null,
            thumbnail: "",
            over_18: false,
            spoiler: false,
            stickied: false,
            domain: "example.com",
          },
        },
      ],
    },
  },
  {
    kind: "Listing",
    data: {
      after: null,
      before: null,
      children: [
        {
          kind: "t1",
          data: {
            id: "c1",
            name: "t1_c1",
            author: "bob",
            body: "first comment",
            body_html: "&lt;p&gt;first comment&lt;/p&gt;",
            score: 2,
            created_utc: Math.floor(Date.now() / 1000) - 30,
            depth: 0,
            permalink: "/r/pics/comments/abc/_/c1",
            replies: "",
          },
        },
      ],
    },
  },
];

describe("ThreadPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => threadFixture,
      })),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("renders post header and comment tree", async () => {
    render(
      <MemoryRouter initialEntries={["/r/pics/comments/abc"]}>
        <Routes>
          <Route path="/r/:sub/comments/:id" element={<ThreadPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Hello thread" })).toBeInTheDocument(),
    );
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByText("first comment")).toBeInTheDocument();
  });

  it("brand in the header links to home", async () => {
    render(
      <MemoryRouter initialEntries={["/r/pics/comments/abc"]}>
        <Routes>
          <Route path="/r/:sub/comments/:id" element={<ThreadPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Hello thread" })).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: "Redfeed home" })).toHaveAttribute(
      "href",
      "/r/popular",
    );
  });

  it("shows an inline retry on fetch error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })),
    );
    render(
      <MemoryRouter initialEntries={["/r/pics/comments/abc"]}>
        <Routes>
          <Route path="/r/:sub/comments/:id" element={<ThreadPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument(),
    );
  });
});
