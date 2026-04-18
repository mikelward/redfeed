import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchFeed, type RedditPost } from "../lib/reddit";
import PostRow from "../components/PostRow";
import { useDismissedStories } from "../lib/useDismissedStories";
import { useAutoDismissOnScroll } from "../lib/useAutoDismissOnScroll";
import HamburgerButton from "../components/HamburgerButton";
import SideNav from "../components/SideNav";

const UNDO_WINDOW_MS = 6000;

interface UndoState {
  name: string;
  title: string;
  expiresAt: number;
}

export default function FeedPage() {
  const { sub = "popular", sort = "hot" } = useParams();
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [after, setAfter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [undo, setUndo] = useState<UndoState | null>(null);

  const dismissedStore = useDismissedStories();
  const [navOpen, setNavOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [topOffset, setTopOffset] = useState(0);

  const afterRef = useRef<string | null>(null);
  afterRef.current = after;
  const loadingMoreRef = useRef(false);
  loadingMoreRef.current = loadingMore;

  useEffect(() => {
    if (!headerRef.current) return;
    const update = () => {
      const h = headerRef.current?.offsetHeight ?? 0;
      setTopOffset(h);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, []);

  const onAutoDismiss = (name: string) => {
    const post = posts.find((p) => p.name === name);
    dismissedStore.dismiss(name);
    if (post) {
      setUndo({
        name,
        title: post.title,
        expiresAt: Date.now() + UNDO_WINDOW_MS,
      });
    }
  };

  const attachRef = useAutoDismissOnScroll(onAutoDismiss, { topOffset });

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    setMoreError(null);
    setUndo(null);
    setPosts([]);
    setAfter(null);
    fetchFeed(sub, sort, null, ctrl.signal)
      .then((r) => {
        setPosts(r.posts);
        setAfter(r.after);
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Failed to load feed");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [sub, sort, attempt]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current) return;
    const cursor = afterRef.current;
    if (!cursor) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const r = await fetchFeed(sub, sort, cursor);
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.name));
        return [...prev, ...r.posts.filter((p) => !seen.has(p.name))];
      });
      setAfter(r.after);
    } catch (e) {
      setMoreError(e instanceof Error ? e.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }, [sub, sort]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    if (typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: "400px 0px" },
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [loadMore]);

  useEffect(() => {
    if (!undo) return;
    const remaining = undo.expiresAt - Date.now();
    if (remaining <= 0) {
      setUndo(null);
      return;
    }
    const t = setTimeout(() => setUndo(null), remaining);
    return () => clearTimeout(t);
  }, [undo]);

  const visiblePosts = useMemo(
    () => posts.filter((p) => !dismissedStore.isDismissed(p.name)),
    [posts, dismissedStore],
  );

  const hasMore = after !== null;

  return (
    <>
      <header ref={headerRef} className="rf-header">
        <HamburgerButton onClick={() => setNavOpen(true)} />
        <span className="rf-brand">Redfeed</span>
        <span className="rf-feed-name">
          r/{sub} · {sort}
        </span>
      </header>
      <main>
        {loading && <div className="rf-loading">Loading…</div>}
        {error && (
          <div className="rf-error">
            <div>{error}</div>
            <button onClick={() => setAttempt((n) => n + 1)}>Retry</button>
          </div>
        )}
        {!loading && !error && visiblePosts.length === 0 && posts.length > 0 && (
          <div className="rf-loading">
            All posts dismissed. Open the menu and tap Restore dismissed posts to bring them back.
          </div>
        )}
        {!loading && !error && posts.length === 0 && (
          <div className="rf-loading">No posts.</div>
        )}
        {visiblePosts.map((post) => (
          <PostRow
            key={post.name}
            post={post}
            rowRef={(el) => attachRef(post.name, el)}
          />
        ))}
        {!loading && !error && hasMore && (
          <div ref={sentinelRef} className="rf-load-more">
            {loadingMore ? (
              <span>Loading more…</span>
            ) : moreError ? (
              <>
                <span>{moreError}</span>
                <button onClick={() => void loadMore()}>Retry</button>
              </>
            ) : (
              <button onClick={() => void loadMore()} aria-label="load more posts">
                Load more
              </button>
            )}
          </div>
        )}
        {!loading && !error && !hasMore && posts.length > 0 && (
          <div className="rf-loading">End of feed.</div>
        )}
      </main>
      {undo && (
        <div className="rf-toast" role="status" aria-live="polite">
          <span>Dismissed “{truncate(undo.title, 40)}”</span>
          <button
            onClick={() => {
              dismissedStore.undismiss(undo.name);
              setUndo(null);
            }}
          >
            Undo
          </button>
        </div>
      )}
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
    </>
  );
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
