import { describe, it, expect, beforeEach } from "vitest";
import {
  DISMISSED_KEY,
  DISMISSED_TTL_MS,
  addDismissed,
  loadDismissed,
  pruneDismissed,
  removeDismissed,
  saveDismissed,
} from "./dismissedStore";

class MemStorage implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.get(k) ?? null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}

const NOW = 1_700_000_000_000;

describe("dismissedStore", () => {
  let s: MemStorage;
  beforeEach(() => {
    s = new MemStorage();
  });

  it("loadDismissed returns {} when unset", () => {
    expect(loadDismissed(s, NOW)).toEqual({});
  });

  it("loadDismissed returns {} on malformed JSON", () => {
    s.setItem(DISMISSED_KEY, "{not json");
    expect(loadDismissed(s, NOW)).toEqual({});
  });

  it("loadDismissed returns {} on array payloads", () => {
    s.setItem(DISMISSED_KEY, "[1]");
    expect(loadDismissed(s, NOW)).toEqual({});
  });

  it("prunes entries older than 7 days on load", () => {
    const fresh = NOW - 1000;
    const old = NOW - DISMISSED_TTL_MS - 1;
    saveDismissed({ t3_a: fresh, t3_b: old }, s);
    expect(loadDismissed(s, NOW)).toEqual({ t3_a: fresh });
  });

  it("addDismissed is pure and stamps the id", () => {
    const before = { t3_a: NOW - 5 };
    const after = addDismissed(before, "t3_b", NOW);
    expect(after).toEqual({ t3_a: NOW - 5, t3_b: NOW });
    expect(before).toEqual({ t3_a: NOW - 5 });
  });

  it("removeDismissed removes an id", () => {
    expect(removeDismissed({ t3_a: NOW, t3_b: NOW }, "t3_a")).toEqual({ t3_b: NOW });
  });

  it("removeDismissed returns same reference if id absent", () => {
    const before = { t3_a: NOW };
    expect(removeDismissed(before, "t3_zzz")).toBe(before);
  });

  it("pruneDismissed drops non-numeric values defensively", () => {
    const dirty = { t3_a: NOW, t3_b: "nope" as unknown as number };
    expect(pruneDismissed(dirty, NOW)).toEqual({ t3_a: NOW });
  });
});
