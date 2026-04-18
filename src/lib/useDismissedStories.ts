import { useCallback, useEffect, useState } from "react";
import {
  type DismissedMap,
  DISMISSED_KEY,
  addDismissed,
  loadDismissed,
  removeDismissed,
  saveDismissed,
} from "./dismissedStore";

export interface DismissedStore {
  dismissed: DismissedMap;
  isDismissed: (name: string) => boolean;
  dismiss: (name: string) => void;
  undismiss: (name: string) => void;
  clearAll: () => void;
}

// Same-tab broadcast channel. Browser storage events only fire in
// other tabs/windows, so when one hook instance writes, sibling
// instances within the same tab (e.g. SideNav + FeedPage) need a
// local signal to re-read. Pattern ported from newshacker.
const DISMISSED_CHANGED_EVENT = "rf:dismissedChanged";

function announceChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DISMISSED_CHANGED_EVENT));
}

export function useDismissedStories(): DismissedStore {
  const [dismissed, setDismissed] = useState<DismissedMap>(() => loadDismissed());

  useEffect(() => {
    const reload = () => setDismissed(loadDismissed());
    const onStorage = (e: StorageEvent) => {
      if (e.key === DISMISSED_KEY) reload();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(DISMISSED_CHANGED_EVENT, reload);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(DISMISSED_CHANGED_EVENT, reload);
    };
  }, []);

  const dismiss = useCallback((name: string) => {
    const current = loadDismissed();
    const next = addDismissed(current, name);
    saveDismissed(next);
    setDismissed(next);
    announceChange();
  }, []);

  const undismiss = useCallback((name: string) => {
    const current = loadDismissed();
    const next = removeDismissed(current, name);
    if (next !== current) saveDismissed(next);
    setDismissed(next);
    announceChange();
  }, []);

  const clearAll = useCallback(() => {
    saveDismissed({});
    setDismissed({});
    announceChange();
  }, []);

  const isDismissed = useCallback(
    (name: string) => dismissed[name] !== undefined,
    [dismissed],
  );

  return { dismissed, isDismissed, dismiss, undismiss, clearAll };
}
