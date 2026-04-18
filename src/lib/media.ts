import type { RedditPost } from "./reddit";

export type MediaKind = "image" | "gallery" | "video" | "link" | "self";

export interface Media {
  kind: MediaKind;
  src?: string;
  srcset?: string;
  width?: number;
  height?: number;
  count?: number;
  domain?: string;
}

const IMAGE_EXT = /\.(jpe?g|png|gif|webp)(\?|$)/i;

function decodeEntities(url: string): string {
  return url.replace(/&amp;/g, "&");
}

function buildSrcset(
  resolutions: Array<{ url: string; width: number }> | undefined,
): string | undefined {
  if (!resolutions?.length) return undefined;
  return resolutions
    .map((r) => `${decodeEntities(r.url)} ${r.width}w`)
    .join(", ");
}

export function mediaForPost(post: RedditPost): Media {
  if (post.is_self) return { kind: "self" };

  if (post.is_gallery && post.gallery_data && post.media_metadata) {
    const first = post.gallery_data.items[0];
    const meta = first ? post.media_metadata[first.media_id] : undefined;
    const src = meta?.s?.u ? decodeEntities(meta.s.u) : undefined;
    return {
      kind: "gallery",
      src,
      width: meta?.s?.x,
      height: meta?.s?.y,
      count: post.gallery_data.items.length,
    };
  }

  const isVideo = post.post_hint === "hosted:video" || post.post_hint === "rich:video";
  const isImage =
    post.post_hint === "image" || (post.url && IMAGE_EXT.test(post.url));

  const preview = post.preview?.images?.[0];
  const previewSrc = preview?.source?.url
    ? decodeEntities(preview.source.url)
    : undefined;
  const srcset = buildSrcset(preview?.resolutions);

  if (isVideo) {
    return {
      kind: "video",
      src: previewSrc,
      srcset,
      width: preview?.source?.width,
      height: preview?.source?.height,
    };
  }

  if (isImage) {
    return {
      kind: "image",
      src: previewSrc ?? (post.url ? decodeEntities(post.url) : undefined),
      srcset,
      width: preview?.source?.width,
      height: preview?.source?.height,
    };
  }

  return { kind: "link", domain: post.domain };
}
