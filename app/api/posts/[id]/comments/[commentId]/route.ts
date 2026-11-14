import { withUser } from "@/lib/server/auth";
import { deleteComment } from "@/lib/server/feed";

// DELETE /api/posts/:id/comments/:commentId → delete your own comment
export const DELETE = withUser<{ id: string; commentId: string }>(async (_req, { params }, user) => {
  const { id, commentId } = await params;
  return Response.json({ post: await deleteComment(user.id, id, commentId) });
});
