export interface Me {
  name: string;
  total_karma: number | null;
  icon_img: string | null;
}

export async function fetchMe(signal?: AbortSignal): Promise<Me | null> {
  const res = await fetch("/api/me", { signal });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`me request failed: ${res.status}`);
  const data = (await res.json()) as Partial<Me>;
  if (!data.name) return null;
  return {
    name: data.name,
    total_karma: data.total_karma ?? null,
    icon_img: data.icon_img ?? null,
  };
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}
