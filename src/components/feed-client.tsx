"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyHidePost, applyIgnoreSubreddit, filterVisiblePosts } from "@/lib/post-preferences";
import { FeedPost } from "@/types/reddit";
import { PostCard } from "@/components/post-card";

type FeedClientProps = {
  initialPosts: FeedPost[];
  initialAfter: string | null;
};

const HIDDEN_POSTS_STORAGE_KEY = "redfeed.hiddenPosts";
const IGNORED_SUBREDDITS_STORAGE_KEY = "redfeed.ignoredSubreddits";

function loadStringArray(storageKey: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = localStorage.getItem(storageKey);
    if (!value) {
      return [];
    }

    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

function persistStringArray(storageKey: string, values: string[]): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(storageKey, JSON.stringify(values));
}

export function FeedClient({ initialPosts, initialAfter }: FeedClientProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [after, setAfter] = useState<string | null>(initialAfter);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hiddenPostIds, setHiddenPostIds] = useState<string[]>(() => loadStringArray(HIDDEN_POSTS_STORAGE_KEY));
  const [ignoredSubreddits, setIgnoredSubreddits] = useState<string[]>(() => loadStringArray(IGNORED_SUBREDDITS_STORAGE_KEY));
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleHide = useCallback((postId: string) => {
    setHiddenPostIds((current) => {
      const next = applyHidePost(current, postId);
      persistStringArray(HIDDEN_POSTS_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const handleIgnoreSubreddit = useCallback((subreddit: string) => {
    setIgnoredSubreddits((current) => {
      const next = applyIgnoreSubreddit(current, subreddit);
      persistStringArray(IGNORED_SUBREDDITS_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const visiblePosts = useMemo(() => filterVisiblePosts(posts, hiddenPostIds, ignoredSubreddits), [posts, hiddenPostIds, ignoredSubreddits]);

  const loadMore = useCallback(async () => {
    if (!after || loadingMore) {
      return;
    }

    setLoadingMore(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/feed?after=${encodeURIComponent(after)}`);
      if (!response.ok) {
        throw new Error(`Failed to load more posts (${response.status})`);
      }

      const payload = (await response.json()) as { posts: FeedPost[]; after: string | null };

      setPosts((current) => [...current, ...payload.posts]);
      setAfter(payload.after);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load more posts.");
    } finally {
      setLoadingMore(false);
    }
  }, [after, loadingMore]);

  useEffect(() => {
    if (!sentinelRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(sentinelRef.current);

    return () => {
      observer.disconnect();
    };
  }, [loadMore]);

  return (
    <main className="feedPage">
      <header className="topBar">
        <h1>Redfeed</h1>
        <a href="/api/auth/reddit/start" className="loginLink">
          Sign in with Reddit
        </a>
      </header>

      <p className="subtitle">Mobile RSS-style Reddit reader. Hide posts and ignore subreddits as you scroll.</p>

      {ignoredSubreddits.length > 0 ? (
        <p className="ignoredPill">Ignoring: {ignoredSubreddits.map((name) => `r/${name}`).join(", ")}</p>
      ) : null}

      <section className="feedStack">
        {visiblePosts.map((post) => (
          <PostCard key={post.id} post={post} onHide={handleHide} onIgnoreSubreddit={handleIgnoreSubreddit} />
        ))}
      </section>

      {errorMessage ? <p className="errorText">{errorMessage}</p> : null}

      <div ref={sentinelRef} className="sentinel" aria-hidden="true" />
      {loadingMore ? <p className="statusText">Loading more…</p> : null}
      {!after ? <p className="statusText">You reached the end of the current feed window.</p> : null}
    </main>
  );
}
