import { Link } from "react-router-dom";
import type { RedditPost } from "../lib/reddit";
import { mediaForPost } from "../lib/media";
import { formatRelativeTime } from "../lib/time";
import styles from "./PostRow.module.css";

interface Props {
  post: RedditPost;
  now?: Date;
  rowRef?: (el: HTMLElement | null) => void;
}

export default function PostRow({ post, now, rowRef }: Props) {
  const media = mediaForPost(post);
  const threadPath = post.permalink;
  const isExternalLink = media.kind === "link" && !!post.url;
  const mainHref = isExternalLink ? post.url : threadPath;

  const badge =
    media.kind === "gallery" && media.count
      ? `1 / ${media.count}`
      : media.kind === "video"
        ? "▶"
        : null;

  const hasImage =
    (media.kind === "image" || media.kind === "gallery" || media.kind === "video") &&
    media.src;

  const titleNode = <span className={styles.title}>{post.title}</span>;

  const imageNode = hasImage ? (
    <span className={styles.media}>
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
    </span>
  ) : null;

  const linkBody = (
    <>
      {titleNode}
      {imageNode}
    </>
  );

  return (
    <article
      ref={rowRef}
      data-fullname={post.name}
      className={styles.row}
    >
      {isExternalLink ? (
        <a
          className={styles.main}
          href={mainHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          {linkBody}
        </a>
      ) : (
        <Link className={styles.main} to={mainHref}>
          {linkBody}
        </Link>
      )}
      <div className={styles.meta}>
        <span>{post.subreddit_name_prefixed}</span>
        <span>u/{post.author}</span>
        <span>{formatRelativeTime(post.created_utc, now)}</span>
        <span>{post.score.toLocaleString()} points</span>
        {media.kind === "link" && media.domain && <span>{media.domain}</span>}
      </div>
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
