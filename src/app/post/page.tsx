import Link from "next/link";
import { CommentsThread } from "@/components/comments-thread";
import { fetchComments } from "@/lib/reddit";

export const dynamic = "force-dynamic";

type PostPageProps = {
  searchParams: Promise<{ permalink?: string }>;
};

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

  const comments = await fetchComments(permalink);

  return (
    <main className="detailsPage">
      <header className="topBar">
        <h1>Comments</h1>
        <Link href="/">Back to feed</Link>
      </header>

      {comments.length > 0 ? <CommentsThread comments={comments} /> : <p className="statusText">No comments loaded.</p>}
    </main>
  );
}
