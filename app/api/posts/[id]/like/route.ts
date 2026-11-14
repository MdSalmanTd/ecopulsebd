import { withUser, limit } from "@/lib/server/auth";
import { setLike } from "@/lib/server/feed";

// POST /api/posts/:id/like → "Inspire";  DELETE → undo
export const POST = withUser<{ id: string }>(async (_req, { params }, user) => {
  await limit(`act:${user.id}`, 60, 60, "clicks");
  const { id } = await params;
  return Response.json({ post: await setLike(user.id, id, true) });
});

export const DELETE = withUser<{ id: string }>(async (_req, { params }, user) => {
  await limit(`act:${user.id}`, 60, 60, "clicks");
  const { id } = await params;
  return Response.json({ post: await setLike(user.id, id, false) });
});
