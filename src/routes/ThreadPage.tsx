import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchThread, type RedditPost, type RedditCommentOrMore } from "../lib/reddit";
import PostHeader from "../components/PostHeader";
import CommentTree from "../components/CommentTree";
import HamburgerButton from "../components/HamburgerButton";
import SideNav from "../components/SideNav";

interface ThreadItem {
  kind: "t1" | "more";
  data: RedditCommentOrMore;
}

export default function ThreadPage() {
  const { sub = "", id = "" } = useParams();
  const [post, setPost] = useState<RedditPost | null>(null);
  const [comments, setComments] = useState<ThreadItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!sub || !id) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    fetchThread(sub, id, ctrl.signal)
      .then((r) => {
        setPost(r.post);
        setComments(r.comments);
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Failed to load thread");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [sub, id, attempt]);

  return (
    <>
      <header className="rf-header">
        <HamburgerButton onClick={() => setNavOpen(true)} />
        <Link className="rf-back" to={`/r/${sub}`} aria-label="back to feed">
          ‹
        </Link>
        <span className="rf-brand">Redfeed</span>
        <span className="rf-feed-name">r/{sub}</span>
      </header>
      <main>
        {loading && <div className="rf-loading">Loading…</div>}
        {error && (
          <div className="rf-error">
            <div>{error}</div>
            <button onClick={() => setAttempt((n) => n + 1)}>Retry</button>
          </div>
        )}
        {post && <PostHeader post={post} />}
        {post && <CommentTree items={comments} />}
      </main>
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
    </>
  );
}
