import { fetchFeed } from "@/lib/reddit";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after") ?? undefined;

  try {
    const page = await fetchFeed(after);

    return Response.json(page, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected feed error";
    return Response.json({ error: message }, { status: 500 });
  }
}
