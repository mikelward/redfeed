import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fetchMe, logout } from "./me";

describe("fetchMe", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns null on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ status: 401, ok: false, json: async () => ({}) })),
    );
    expect(await fetchMe()).toBeNull();
  });

  it("returns the me payload on 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        status: 200,
        ok: true,
        json: async () => ({ name: "alice", total_karma: 12 }),
      })),
    );
    expect(await fetchMe()).toEqual({
      name: "alice",
      total_karma: 12,
      icon_img: null,
    });
  });

  it("throws on other non-ok statuses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ status: 500, ok: false, json: async () => ({}) })),
    );
    await expect(fetchMe()).rejects.toThrow(/500/);
  });
});

describe("logout", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 204 })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("POSTs to /api/auth/logout", async () => {
    await logout();
    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0]).toBe("/api/auth/logout");
    expect((calls[0][1] as RequestInit).method).toBe("POST");
  });
});
