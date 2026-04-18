import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoDismissOnScroll } from "./useAutoDismissOnScroll";

let lastCallback: IntersectionObserverCallback | null = null;

class TestObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords() { return []; }
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  constructor(cb: IntersectionObserverCallback) {
    lastCallback = cb;
  }
}

const fakeObs = null as unknown as IntersectionObserver;

function entry(
  target: Element,
  isIntersecting: boolean,
  bottom: number,
): IntersectionObserverEntry {
  return {
    target,
    isIntersecting,
    boundingClientRect: { bottom } as DOMRectReadOnly,
  } as IntersectionObserverEntry;
}

beforeEach(() => {
  lastCallback = null;
  vi.stubGlobal("IntersectionObserver", TestObserver as unknown as typeof IntersectionObserver);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useAutoDismissOnScroll", () => {
  it("clears the seen flag when an id is rebound to a new element", () => {
    const onDismiss = vi.fn();
    const { result } = renderHook(() => useAutoDismissOnScroll(onDismiss));

    const elA = document.createElement("article");
    const elB = document.createElement("article");

    act(() => result.current("t3_x", elA));
    // Simulate elA intersecting → seenSet now contains "t3_x"
    act(() => lastCallback?.([entry(elA, true, 100)], fakeObs));

    // Rebind the same id to a new element (e.g. list reorder, StrictMode swap)
    act(() => result.current("t3_x", elB));

    // elB now reports not-intersecting with bottom above threshold.
    // Without the fix this would fire dismiss immediately because
    // "t3_x" is still in seenSet from elA.
    act(() => lastCallback?.([entry(elB, false, -50)], fakeObs));

    expect(onDismiss).not.toHaveBeenCalled();

    // After elB is actually seen, scrolling it past dismisses it.
    act(() => lastCallback?.([entry(elB, true, 100)], fakeObs));
    act(() => lastCallback?.([entry(elB, false, -50)], fakeObs));
    expect(onDismiss).toHaveBeenCalledWith("t3_x");
  });

  it("does not dismiss before a row has been intersecting", () => {
    const onDismiss = vi.fn();
    const { result } = renderHook(() => useAutoDismissOnScroll(onDismiss));
    const el = document.createElement("article");
    act(() => result.current("t3_y", el));
    act(() => lastCallback?.([entry(el, false, -10)], fakeObs));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("uses rootMargin to account for the sticky-header offset", () => {
    const onDismiss = vi.fn();
    const ctorSpy = vi.fn();
    class SpyObs extends TestObserver {
      constructor(cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) {
        super(cb);
        ctorSpy(opts);
      }
    }
    vi.stubGlobal("IntersectionObserver", SpyObs as unknown as typeof IntersectionObserver);
    renderHook(() => useAutoDismissOnScroll(onDismiss, { topOffset: 56 }));
    expect(ctorSpy).toHaveBeenCalledWith({ rootMargin: "-56px 0px 0px 0px" });
  });
});
