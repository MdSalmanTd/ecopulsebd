import { withUser, limit } from "@/lib/server/auth";
import { sharePost } from "@/lib/server/feed";

// POST /api/posts/:id/share → count a share (the link is copied on the client)
export const POST = withUser<{ id: string }>(async (_req, { params }, user) => {
  await limit(`share:${user.id}`, 30, 60, "shares");
  const { id } = await params;
  return Response.json({ post: await sharePost(user.id, id) });
});
