export function formatRelativeTime(
  createdUtcSeconds: number,
  now: Date = new Date(),
): string {
  const deltaSec = Math.max(0, Math.floor(now.getTime() / 1000 - createdUtcSeconds));
  if (deltaSec < 60) return `${deltaSec}s`;
  const m = Math.floor(deltaSec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo`;
  const y = Math.floor(d / 365);
  return `${y}y`;
}
