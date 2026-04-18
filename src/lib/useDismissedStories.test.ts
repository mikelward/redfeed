import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDismissedStories } from "./useDismissedStories";
import { DISMISSED_KEY } from "./dismissedStore";
import { shouldDismiss } from "./useAutoDismissOnScroll";

describe("useDismissedStories", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty when localStorage is empty", () => {
    const { result } = renderHook(() => useDismissedStories());
    expect(result.current.dismissed).toEqual({});
    expect(result.current.isDismissed("t3_a")).toBe(false);
  });

  it("dismiss persists to localStorage", () => {
    const { result } = renderHook(() => useDismissedStories());
    act(() => result.current.dismiss("t3_a"));
    expect(result.current.isDismissed("t3_a")).toBe(true);
    const raw = localStorage.getItem(DISMISSED_KEY);
    expect(raw && JSON.parse(raw).t3_a).toBeTypeOf("number");
  });

  it("undismiss removes an entry", () => {
    const { result } = renderHook(() => useDismissedStories());
    act(() => result.current.dismiss("t3_a"));
    act(() => result.current.undismiss("t3_a"));
    expect(result.current.isDismissed("t3_a")).toBe(false);
  });

  it("clearAll wipes the store", () => {
    const { result } = renderHook(() => useDismissedStories());
    act(() => result.current.dismiss("t3_a"));
    act(() => result.current.clearAll());
    expect(result.current.isDismissed("t3_a")).toBe(false);
    expect(localStorage.getItem(DISMISSED_KEY)).toBe("{}");
  });

  it("hydrates from localStorage on mount", () => {
    localStorage.setItem(
      DISMISSED_KEY,
      JSON.stringify({ t3_x: Date.now() }),
    );
    const { result } = renderHook(() => useDismissedStories());
    expect(result.current.isDismissed("t3_x")).toBe(true);
  });
});

describe("shouldDismiss", () => {
  const entry = (
    isIntersecting: boolean,
    bottom: number,
  ): IntersectionObserverEntry =>
    ({
      isIntersecting,
      boundingClientRect: { bottom } as DOMRectReadOnly,
    }) as IntersectionObserverEntry;

  it("returns false when still intersecting", () => {
    expect(shouldDismiss(entry(true, -10), 0, true)).toBe(false);
  });

  it("returns false when never seen intersecting", () => {
    expect(shouldDismiss(entry(false, -10), 0, false)).toBe(false);
  });

  it("returns true when fully above the threshold and was previously seen", () => {
    expect(shouldDismiss(entry(false, -1), 0, true)).toBe(true);
  });

  it("returns false when scrolled past the bottom (below viewport)", () => {
    expect(shouldDismiss(entry(false, 900), 0, true)).toBe(false);
  });

  it("honors a non-zero threshold (sticky header offset)", () => {
    expect(shouldDismiss(entry(false, 40), 48, true)).toBe(true);
    expect(shouldDismiss(entry(false, 60), 48, true)).toBe(false);
  });
});
