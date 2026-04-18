import { FeedPost } from "@/types/reddit";

export const MAX_HIDDEN_POSTS = 500;

export function normalizeSubredditName(subreddit: string): string {
  return subreddit.trim().toLowerCase();
}

export function applyHidePost(existingHiddenIds: string[], postId: string): string[] {
  const deduped = [postId, ...existingHiddenIds.filter((id) => id !== postId)];
  return deduped.slice(0, MAX_HIDDEN_POSTS);
}

export function applyIgnoreSubreddit(existingIgnoredSubreddits: string[], subreddit: string): string[] {
  const normalized = normalizeSubredditName(subreddit);
  if (!normalized) {
    return existingIgnoredSubreddits;
  }

  if (existingIgnoredSubreddits.includes(normalized)) {
    return existingIgnoredSubreddits;
  }

  return [...existingIgnoredSubreddits, normalized];
}

export function filterVisiblePosts(
  posts: FeedPost[],
  hiddenPostIds: string[],
  ignoredSubreddits: string[],
): FeedPost[] {
  const hiddenSet = new Set(hiddenPostIds);
  const ignoredSet = new Set(ignoredSubreddits.map((value) => value.toLowerCase()));

  return posts.filter((post) => !hiddenSet.has(post.id) && !ignoredSet.has(post.subreddit.toLowerCase()));
}
