import { useCallback, useEffect, useState } from "react";
import { fetchMe, type Me } from "./me";

export interface MeState {
  me: Me | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useMe(): MeState {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    fetchMe(ctrl.signal)
      .then((m) => setMe(m))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : "me request failed");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [tick]);

  return { me, loading, error, refresh };
}
