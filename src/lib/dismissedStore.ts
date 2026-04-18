export const DISMISSED_KEY = "rf.dismissed.v1";
export const DISMISSED_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type DismissedMap = Record<string, number>;

export function loadDismissed(
  storage: Storage = localStorage,
  now: number = Date.now(),
): DismissedMap {
  const raw = storage.getItem(DISMISSED_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return pruneDismissed(parsed as DismissedMap, now);
  } catch {
    return {};
  }
}

export function saveDismissed(
  map: DismissedMap,
  storage: Storage = localStorage,
): void {
  storage.setItem(DISMISSED_KEY, JSON.stringify(map));
}

export function pruneDismissed(
  map: DismissedMap,
  now: number = Date.now(),
): DismissedMap {
  const cutoff = now - DISMISSED_TTL_MS;
  const out: DismissedMap = {};
  for (const [name, ts] of Object.entries(map)) {
    if (typeof ts === "number" && ts >= cutoff) out[name] = ts;
  }
  return out;
}

export function addDismissed(
  map: DismissedMap,
  name: string,
  now: number = Date.now(),
): DismissedMap {
  return { ...map, [name]: now };
}

export function removeDismissed(
  map: DismissedMap,
  name: string,
): DismissedMap {
  if (!(name in map)) return map;
  const out = { ...map };
  delete out[name];
  return out;
}
