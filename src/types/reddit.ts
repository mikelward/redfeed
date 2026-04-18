export type RedditKind = "t3";

export type MediaType = "image" | "gallery" | "video" | "link" | "self";

export interface RedditListingChild<T> {
  kind: RedditKind;
  data: T;
}

export interface RedditListingData<T> {
  after: string | null;
  children: RedditListingChild<T>[];
}

export interface RedditListingResponse<T> {
  kind: "Listing";
  data: RedditListingData<T>;
}

export interface RedditPostData {
  id: string;
  name: string;
  title: string;
  author: string;
  subreddit: string;
  permalink: string;
  url: string;
  thumbnail?: string;
  created_utc: number;
  score: number;
  num_comments: number;
  is_self: boolean;
  is_video: boolean;
  is_gallery?: boolean;
  over_18: boolean;
  spoiler: boolean;
  post_hint?: string;
  domain: string;
  selftext?: string;
  preview?: {
    images?: Array<{
      source: {
        url: string;
        width: number;
        height: number;
      };
    }>;
  };
  gallery_data?: {
    items: Array<{ media_id: string }>;
  };
}

export interface RedditCommentData {
  id: string;
  author: string;
  body?: string;
  body_html?: string;
  score: number;
  created_utc: number;
  replies?: string | RedditListingResponse<RedditCommentData>;
}

export interface FeedPost {
  id: string;
  fullname: string;
  title: string;
  author: string;
  subreddit: string;
  permalink: string;
  url: string;
  thumbnail?: string;
  createdUtc: number;
  score: number;
  numComments: number;
  mediaType: MediaType;
  previewImage?: string;
  galleryCount: number;
  isNsfw: boolean;
  isSpoiler: boolean;
  selfText?: string;
}

export interface FeedPage {
  posts: FeedPost[];
  after: string | null;
}

export interface CommentNode {
  id: string;
  author: string;
  body: string;
  score: number;
  createdUtc: number;
  replies: CommentNode[];
}
