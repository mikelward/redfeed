import { FeedClient } from "@/components/feed-client";
import { fetchFeed } from "@/lib/reddit";
import { FeedPage } from "@/types/reddit";

export const dynamic = "force-dynamic";

type HomePageData = {
  feed: FeedPage;
  errorMessage: string | null;
};

export async function loadHomePageData(): Promise<HomePageData> {
  try {
    return {
      feed: await fetchFeed(),
      errorMessage: null,
    };
  } catch {
    return {
      feed: { posts: [], after: null },
      errorMessage: "Feed is temporarily unavailable. Please reload to try again.",
    };
  }
}

export default async function HomePage() {
  const { feed, errorMessage } = await loadHomePageData();

  return <FeedClient initialPosts={feed.posts} initialAfter={feed.after} initialErrorMessage={errorMessage} />;
}
