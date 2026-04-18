import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchFeed, type RedditPost } from "../lib/reddit";
import PostRow from "../components/PostRow";
import { useDismissedStories } from "../lib/useDismissedStories";
import { useAutoDismissOnScroll } from "../lib/useAutoDismissOnScroll";

const UNDO_WINDOW_MS = 6000;

interface UndoState {
  name: string;
  title: string;
  expiresAt: number;
}

export default function FeedPage() {
  const { sub = "popular", sort = "hot" } = useParams();
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [undo, setUndo] = useState<UndoState | null>(null);

  const dismissedStore = useDismissedStories();
  const headerRef = useRef<HTMLElement>(null);
  const [topOffset, setTopOffset] = useState(0);

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
    setUndo(null);
    fetchFeed(sub, sort, null, ctrl.signal)
      .then((r) => setPosts(r.posts))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Failed to load feed");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [sub, sort, attempt]);

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

  return (
    <>
      <header ref={headerRef} className="rf-header">
        <span className="rf-brand">Redfeed</span>
        <span className="rf-feed-name">
          r/{sub} · {sort}
        </span>
        <div className="rf-chrome">
          <button
            onClick={() => dismissedStore.clearAll()}
            aria-label="restore all dismissed posts"
          >
            Restore all
          </button>
        </div>
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
            All posts dismissed. Scroll down or tap Restore all.
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
    </>
  );
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
