import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchFeed, type RedditPost } from "../lib/reddit";
import PostRow from "../components/PostRow";

export default function FeedPage() {
  const { sub = "popular", sort = "hot" } = useParams();
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
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

  return (
    <>
      <header className="rf-header">
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
        {!loading && !error && posts.length === 0 && (
          <div className="rf-loading">No posts.</div>
        )}
        {posts.map((post) => (
          <PostRow key={post.name} post={post} />
        ))}
      </main>
    </>
  );
}
