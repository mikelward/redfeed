import Image from "next/image";
import Link from "next/link";
import { FeedPost } from "@/types/reddit";

type PostCardProps = {
  post: FeedPost;
  onHide: (postId: string) => void;
  onIgnoreSubreddit: (subreddit: string) => void;
};

function formatAge(createdUtc: number): string {
  const minutes = Math.max(1, Math.floor((Date.now() / 1000 - createdUtc) / 60));

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  return `${Math.floor(hours / 24)}d`;
}

function renderMedia(post: FeedPost) {
  const imageUrl = post.previewImage ?? post.thumbnail;

  if (!imageUrl || post.mediaType === "self") {
    return null;
  }

  const badge = post.mediaType === "gallery" ? `Gallery (${post.galleryCount || "?"})` : post.mediaType;

  return (
    <div className="mediaWrap">
      {(post.isNsfw || post.isSpoiler) ? (
        <details>
          <summary className="mediaReveal">Reveal {post.isNsfw ? "NSFW" : "spoiler"} media</summary>
          <Image className="postMedia" src={imageUrl} alt={post.title} width={1200} height={675} />
        </details>
      ) : (
        <Image className="postMedia" src={imageUrl} alt={post.title} width={1200} height={675} />
      )}
      <span className="mediaBadge">{badge}</span>
    </div>
  );
}

export function PostCard({ post, onHide, onIgnoreSubreddit }: PostCardProps) {
  const detailHref = `/post?permalink=${encodeURIComponent(post.permalink)}`;

  return (
    <article className="postCard" data-testid={`post-${post.id}`}>
      <header className="postMeta">
        <Link href={`https://www.reddit.com/r/${post.subreddit}`} target="_blank" rel="noreferrer" className="subredditLink">
          r/{post.subreddit}
        </Link>
        <span>@{post.author}</span>
        <span>{formatAge(post.createdUtc)}</span>
      </header>

      <h2 className="postTitle">{post.title}</h2>

      {renderMedia(post)}

      <div className="postStats">
        <span>{post.score} pts</span>
        <span>{post.numComments} comments</span>
      </div>

      <div className="postActions">
        <button type="button" onClick={() => onHide(post.id)}>
          Hide
        </button>
        <button type="button" onClick={() => onIgnoreSubreddit(post.subreddit)}>
          Ignore r/{post.subreddit}
        </button>
        <Link href={detailHref}>Comments</Link>
        <Link href={`https://www.reddit.com${post.permalink}`} target="_blank" rel="noreferrer">
          Open Reddit
        </Link>
      </div>
    </article>
  );
}
