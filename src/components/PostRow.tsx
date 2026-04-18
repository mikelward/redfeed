import { Link } from "react-router-dom";
import type { RedditPost } from "../lib/reddit";
import { mediaForPost } from "../lib/media";
import { formatRelativeTime } from "../lib/time";
import styles from "./PostRow.module.css";

interface Props {
  post: RedditPost;
  seen?: boolean;
  now?: Date;
}

export default function PostRow({ post, seen = false, now }: Props) {
  const media = mediaForPost(post);
  const threadPath = post.permalink;
  const isExternalLink = media.kind === "link" && !!post.url;
  const mainHref = isExternalLink ? post.url : threadPath;
  const mainIsExternal = isExternalLink;

  const badge =
    media.kind === "gallery" && media.count
      ? `1 / ${media.count}`
      : media.kind === "video"
        ? "▶"
        : null;

  const hasImage =
    (media.kind === "image" || media.kind === "gallery" || media.kind === "video") &&
    media.src;

  const mainContent = (
    <>
      <div className={styles.title}>{post.title}</div>
      <div className={styles.meta}>
        <span>{post.subreddit_name_prefixed}</span>
        <span>u/{post.author}</span>
        <span>{formatRelativeTime(post.created_utc, now)}</span>
        <span>{post.score.toLocaleString()} points</span>
        {media.kind === "link" && media.domain && <span>{media.domain}</span>}
      </div>
      {hasImage && (
        <div className={styles.media}>
          <img
            src={media.src}
            srcSet={media.srcset}
            sizes="(max-width: 720px) 100vw, 720px"
            width={media.width}
            height={media.height}
            loading="lazy"
            alt={post.title}
          />
          {badge && <span className={styles.badge}>{badge}</span>}
        </div>
      )}
    </>
  );

  return (
    <article className={`${styles.row} ${seen ? styles.seen : ""}`}>
      {mainIsExternal ? (
        <a
          className={styles.main}
          href={mainHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          {mainContent}
        </a>
      ) : (
        <Link className={styles.main} to={mainHref}>
          {mainContent}
        </Link>
      )}
      <Link
        className={styles.comments}
        to={threadPath}
        onClick={(e) => e.stopPropagation()}
        aria-label={`${post.num_comments} comments`}
      >
        {post.num_comments.toLocaleString()} comments
      </Link>
    </article>
  );
}
