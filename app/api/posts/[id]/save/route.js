import { withUser, limit } from "@/lib/server/auth";
import { setSavedPost } from "@/lib/server/feed";

// POST /api/posts/:id/save → save;  DELETE → unsave
export const POST = withUser(async (_req, { params }, user) => {
  await limit(`act:${user.id}`, 60, 60, "clicks");
  const { id } = await params;
  return Response.json({ post: await setSavedPost(user.id, id, true) });
});

export const DELETE = withUser(async (_req, { params }, user) => {
  await limit(`act:${user.id}`, 60, 60, "clicks");
  const { id } = await params;
  return Response.json({ post: await setSavedPost(user.id, id, false) });
});
