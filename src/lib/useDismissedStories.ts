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

export function useDismissedStories(): DismissedStore {
  const [dismissed, setDismissed] = useState<DismissedMap>(() => loadDismissed());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === DISMISSED_KEY) setDismissed(loadDismissed());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const dismiss = useCallback((name: string) => {
    setDismissed((prev) => {
      const next = addDismissed(prev, name);
      saveDismissed(next);
      return next;
    });
  }, []);

  const undismiss = useCallback((name: string) => {
    setDismissed((prev) => {
      const next = removeDismissed(prev, name);
      if (next !== prev) saveDismissed(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setDismissed({});
    saveDismissed({});
  }, []);

  const isDismissed = useCallback(
    (name: string) => dismissed[name] !== undefined,
    [dismissed],
  );

  return { dismissed, isDismissed, dismiss, undismiss, clearAll };
}
