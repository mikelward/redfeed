import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fetchFeed, fetchThread } from "./reddit";

const listingFixture = {
  kind: "Listing",
  data: {
    after: "t3_next",
    before: null,
    children: [
      {
        kind: "t3",
        data: { id: "abc", name: "t3_abc", title: "Hello" },
      },
      { kind: "more", data: { id: "x", name: "more_x" } },
    ],
  },
};

describe("fetchFeed", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => listingFixture,
      })),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls /api/feed with sub, sort, limit", async () => {
    await fetchFeed("popular", "new");
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toContain("/api/feed?");
    expect(calls[0][0]).toContain("sub=popular");
    expect(calls[0][0]).toContain("sort=new");
    expect(calls[0][0]).toContain("limit=25");
  });

  it("filters out non-t3 children and returns the after cursor", async () => {
    const result = await fetchFeed("popular");
    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].id).toBe("abc");
    expect(result.after).toBe("t3_next");
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })),
    );
    await expect(fetchFeed("popular")).rejects.toThrow(/500/);
  });

  it("surfaces a friendly message when the server reports missing reddit credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 503,
        json: async () => ({
          error: "reddit_credentials_missing",
          detail: "Reddit API credentials are not configured on the server.",
        }),
      })),
    );
    await expect(fetchFeed("popular")).rejects.toThrow(
      /Reddit API credentials are not configured/,
    );
    await expect(fetchFeed("popular")).rejects.not.toThrow(/503/);
  });
});

describe("fetchThread", () => {
  const threadFixture = [
    {
      kind: "Listing",
      data: {
        after: null,
        before: null,
        children: [
          {
            kind: "t3",
            data: { id: "abc", name: "t3_abc", title: "Post title" },
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
              author: "alice",
              body: "Hi",
              body_html: null,
              score: 3,
              created_utc: 0,
              depth: 0,
              permalink: "/r/x/comments/abc/_/c1",
              replies: "",
            },
          },
          {
            kind: "more",
            data: {
              id: "_m",
              name: "t1__m",
              count: 5,
              depth: 0,
              parent_id: "t3_abc",
              children: ["x", "y"],
            },
          },
        ],
      },
    },
  ];

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
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns post + mixed comment/more children", async () => {
    const out = await fetchThread("pics", "abc");
    expect(out.post.id).toBe("abc");
    expect(out.comments).toHaveLength(2);
    expect(out.comments[0].kind).toBe("t1");
    expect(out.comments[1].kind).toBe("more");
  });

  it("calls /api/thread with sub and id", async () => {
    await fetchThread("pics", "abc");
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toContain("/api/thread?");
    expect(calls[0][0]).toContain("sub=pics");
    expect(calls[0][0]).toContain("id=abc");
  });
});
