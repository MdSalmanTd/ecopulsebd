import { withUser } from "@/lib/server/auth";
import { deletePost } from "@/lib/server/feed";

// DELETE /api/posts/:id → delete your own post
export const DELETE = withUser<{ id: string }>(async (_req, { params }, user) => {
  const { id } = await params;
  await deletePost(user.id, id);
  return new Response(null, { status: 204 });
});
