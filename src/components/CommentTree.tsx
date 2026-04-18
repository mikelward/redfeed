import { useState } from "react";
import type {
  RedditComment,
  RedditCommentOrMore,
  RedditMore,
} from "../lib/reddit";
import { sanitizeRedditHtml } from "../lib/sanitize";
import { formatRelativeTime } from "../lib/time";
import styles from "./CommentTree.module.css";

interface ChildItem {
  kind: "t1" | "more";
  data: RedditCommentOrMore;
}

// Comments at or below this score start collapsed so a downvoted
// chain doesn't drown out the readable thread. Header stays tappable
// so curious readers can still expand them.
export const SCORE_COLLAPSE_THRESHOLD = 1;

interface Props {
  items: ChildItem[];
  now?: Date;
}

export default function CommentTree({ items, now }: Props) {
  return (
    <div className={styles.tree}>
      {items.map((item, i) =>
        item.kind === "t1" ? (
          <CommentNode
            key={(item.data as RedditComment).name}
            comment={item.data as RedditComment}
            now={now}
          />
        ) : (
          <MoreNode key={`more-${i}`} more={item.data as RedditMore} />
        ),
      )}
    </div>
  );
}

interface CommentNodeProps {
  comment: RedditComment;
  now?: Date;
}

function CommentNode({ comment, now }: CommentNodeProps) {
  const lowScore = comment.score < SCORE_COLLAPSE_THRESHOLD;
  // Reddit threads run deep; rendering them all expanded turns a hot
  // thread into a wall of text and tanks scroll perf on phones.
  // Match newshacker's compromise: top-level comments expanded,
  // every nested level collapsed until the user opens it. Also
  // collapse anything net-downvoted regardless of depth.
  const [collapsed, setCollapsed] = useState(comment.depth >= 1 || lowScore);

  const replies = toReplies(comment.replies);
  const isDeleted =
    comment.author === "[deleted]" || comment.body === "[deleted]";
  const bodyHtml = sanitizeRedditHtml(comment.body_html);
  const replyCount = countDescendants(replies);
  const replySuffix = collapsed && replyCount > 0
    ? ` · +${replyCount} ${replyCount === 1 ? "reply" : "replies"}`
    : "";

  return (
    <div
      className={styles.node}
      data-depth={comment.depth}
      data-low-score={lowScore || undefined}
    >
      <button
        className={`${styles.collapseBtn} ${lowScore ? styles.lowScore : ""}`}
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <span>{collapsed ? "▸" : "▾"}</span>
        <span className={styles.author}>
          {isDeleted ? "[deleted]" : comment.author}
        </span>
        <span>·</span>
        <span>{comment.score} pts</span>
        <span>·</span>
        <span>{formatRelativeTime(comment.created_utc, now)}</span>
        {replySuffix && <span>{replySuffix}</span>}
      </button>
      {!collapsed && (
        <>
          {isDeleted ? (
            <div className={`${styles.body} ${styles.deleted}`}>[deleted]</div>
          ) : (
            <div
              className={styles.body}
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          )}
          {replies.length > 0 && <CommentTree items={replies} now={now} />}
        </>
      )}
    </div>
  );
}

function countDescendants(items: ChildItem[]): number {
  let n = 0;
  for (const item of items) {
    if (item.kind === "more") {
      n += (item.data as RedditMore).count;
      continue;
    }
    n += 1;
    const replies = toReplies((item.data as RedditComment).replies);
    n += countDescendants(replies);
  }
  return n;
}

function MoreNode({ more }: { more: RedditMore }) {
  if (more.count <= 0) return null;
  return (
    <div className={styles.more}>
      {more.count} more {more.count === 1 ? "reply" : "replies"}
    </div>
  );
}

function toReplies(
  replies: RedditComment["replies"],
): ChildItem[] {
  if (!replies || typeof replies === "string") return [];
  return replies.data.children.map((c) => ({
    kind: c.kind as "t1" | "more",
    data: c.data,
  }));
}
