import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fetchFeed } from "./reddit";

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
});
