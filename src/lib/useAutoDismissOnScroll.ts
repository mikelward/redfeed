import { useCallback, useEffect, useRef } from "react";

export function shouldDismiss(
  entry: IntersectionObserverEntry,
  threshold: number,
  wasSeen: boolean,
): boolean {
  if (entry.isIntersecting) return false;
  if (!wasSeen) return false;
  return entry.boundingClientRect.bottom <= threshold;
}

interface Options {
  topOffset?: number;
  enabled?: boolean;
}

export function useAutoDismissOnScroll(
  onDismiss: (name: string) => void,
  { topOffset = 0, enabled = true }: Options = {},
): (name: string, el: HTMLElement | null) => void {
  const elements = useRef(new Map<Element, string>());
  const seenSet = useRef(new Set<string>());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!enabled) return;
    if (typeof IntersectionObserver === "undefined") return;

    const threshold = Math.max(0, topOffset);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const name = elements.current.get(entry.target);
          if (!name) continue;
          if (entry.isIntersecting) {
            seenSet.current.add(name);
            continue;
          }
          if (!seenSet.current.has(name)) continue;
          if (entry.boundingClientRect.bottom <= threshold) {
            seenSet.current.delete(name);
            onDismissRef.current(name);
          }
        }
      },
      threshold > 0
        ? { rootMargin: `-${Math.ceil(threshold)}px 0px 0px 0px` }
        : undefined,
    );
    observerRef.current = observer;
    for (const el of elements.current.keys()) observer.observe(el);
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [topOffset, enabled]);

  return useCallback((name: string, el: HTMLElement | null) => {
    const obs = observerRef.current;
    const prevEl = [...elements.current.entries()].find(
      ([, n]) => n === name,
    )?.[0];
    if (prevEl && prevEl !== el) {
      obs?.unobserve(prevEl);
      elements.current.delete(prevEl);
    }
    if (el && !elements.current.has(el)) {
      elements.current.set(el, name);
      obs?.observe(el);
    }
  }, []);
}
