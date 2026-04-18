import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "./time";

const NOW = new Date("2026-04-18T12:00:00Z");
const now = (offsetSec: number) =>
  Math.floor(NOW.getTime() / 1000) - offsetSec;

describe("formatRelativeTime", () => {
  it("seconds", () => {
    expect(formatRelativeTime(now(5), NOW)).toBe("5s");
  });
  it("minutes", () => {
    expect(formatRelativeTime(now(120), NOW)).toBe("2m");
  });
  it("hours", () => {
    expect(formatRelativeTime(now(3 * 3600), NOW)).toBe("3h");
  });
  it("days", () => {
    expect(formatRelativeTime(now(2 * 86400), NOW)).toBe("2d");
  });
  it("months", () => {
    expect(formatRelativeTime(now(60 * 86400), NOW)).toBe("2mo");
  });
  it("years", () => {
    expect(formatRelativeTime(now(400 * 86400), NOW)).toBe("1y");
  });
  it("clamps future timestamps to 0s", () => {
    expect(formatRelativeTime(now(-60), NOW)).toBe("0s");
  });
});
