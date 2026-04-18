/// <reference lib="dom" />
import "@testing-library/jest-dom/vitest";

type GlobalWithObservers = typeof globalThis & {
  ResizeObserver?: typeof ResizeObserver;
  IntersectionObserver?: typeof IntersectionObserver;
};
const g = globalThis as GlobalWithObservers;

if (typeof g.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  g.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

if (typeof g.IntersectionObserver === "undefined") {
  class IntersectionObserverStub {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds: ReadonlyArray<number> = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  g.IntersectionObserver =
    IntersectionObserverStub as unknown as typeof IntersectionObserver;
}
