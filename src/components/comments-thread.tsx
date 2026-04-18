import { CommentNode } from "@/types/reddit";

type CommentsThreadProps = {
  comments: CommentNode[];
  depth?: number;
};

export function CommentsThread({ comments, depth = 0 }: CommentsThreadProps) {
  return (
    <ul className="commentList" data-depth={depth}>
      {comments.map((comment) => (
        <li key={comment.id} className="commentItem">
          <p className="commentMeta">
            <strong>{comment.author}</strong> · {comment.score} pts
          </p>
          <p className="commentBody">{comment.body}</p>
          {comment.replies.length > 0 ? <CommentsThread comments={comment.replies} depth={depth + 1} /> : null}
        </li>
      ))}
    </ul>
  );
}
