import { FeedClient } from "@/components/feed-client";
import { fetchFeed } from "@/lib/reddit";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const feed = await fetchFeed();

  return <FeedClient initialPosts={feed.posts} initialAfter={feed.after} />;
}
