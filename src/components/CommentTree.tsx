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
  const [collapsed, setCollapsed] = useState(false);

  const replies = toReplies(comment.replies);
  const isDeleted =
    comment.author === "[deleted]" || comment.body === "[deleted]";
  const bodyHtml = sanitizeRedditHtml(comment.body_html);

  return (
    <div className={styles.node} data-depth={comment.depth}>
      <button
        className={styles.collapseBtn}
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
