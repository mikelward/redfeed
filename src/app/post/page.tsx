import Link from "next/link";
import { CommentsThread } from "@/components/comments-thread";
import { fetchComments } from "@/lib/reddit";
import { CommentNode } from "@/types/reddit";

export const dynamic = "force-dynamic";

type PostPageProps = {
  searchParams: Promise<{ permalink?: string }>;
};

type PostPageData = {
  comments: CommentNode[];
  errorMessage: string | null;
};

export async function loadPostPageData(permalink: string): Promise<PostPageData> {
  try {
    return {
      comments: await fetchComments(permalink),
      errorMessage: null,
    };
  } catch {
    return {
      comments: [],
      errorMessage: "Comments are temporarily unavailable. Please reload to try again.",
    };
  }
}

export default async function PostPage({ searchParams }: PostPageProps) {
  const params = await searchParams;
  const permalink = params.permalink;

  if (!permalink) {
    return (
      <main className="detailsPage">
        <p className="errorText">Missing permalink.</p>
        <Link href="/">Back to feed</Link>
      </main>
    );
  }

  const { comments, errorMessage } = await loadPostPageData(permalink);

  return (
    <main className="detailsPage">
      <header className="topBar">
        <h1>Comments</h1>
        <Link href="/">Back to feed</Link>
      </header>

      {errorMessage ? <p className="errorText">{errorMessage}</p> : null}
      {comments.length > 0 ? <CommentsThread comments={comments} /> : <p className="statusText">No comments loaded.</p>}
    </main>
  );
}
