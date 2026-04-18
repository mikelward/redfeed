import type { RedditPost } from "../lib/reddit";
import { mediaForPost } from "../lib/media";
import { formatRelativeTime } from "../lib/time";
import { sanitizeRedditHtml } from "../lib/sanitize";
import styles from "./PostHeader.module.css";

interface Props {
  post: RedditPost;
  now?: Date;
}

export default function PostHeader({ post, now }: Props) {
  const media = mediaForPost(post);
  const hasImage =
    (media.kind === "image" || media.kind === "gallery" || media.kind === "video") &&
    media.src;
  const bodyHtml = post.is_self ? sanitizeRedditHtml(post.selftext_html) : "";
  const showReadArticle = !post.is_self && !!post.url && media.kind === "link";

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{post.title}</h1>
      <div className={styles.meta}>
        <span>{post.subreddit_name_prefixed}</span>
        <span>u/{post.author}</span>
        <span>{formatRelativeTime(post.created_utc, now)}</span>
        <span>{post.score.toLocaleString()} points</span>
      </div>
      {hasImage && (
        <div className={styles.media}>
          <img
            src={media.src}
            srcSet={media.srcset}
            sizes="(max-width: 720px) 100vw, 720px"
            width={media.width}
            height={media.height}
            alt={post.title}
          />
        </div>
      )}
      {bodyHtml && (
        <div
          className={styles.body}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      )}
      {showReadArticle && (
        <a
          className={styles.readArticle}
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Read article on {media.domain ?? new URL(post.url).hostname}
        </a>
      )}
    </header>
  );
}
