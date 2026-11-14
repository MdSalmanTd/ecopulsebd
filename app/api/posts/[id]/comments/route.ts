import { withUser, readJson, limit } from "@/lib/server/auth";
import { addComment, listComments } from "@/lib/server/feed";

// GET /api/posts/:id/comments
export const GET = withUser<{ id: string }>(async (_req, { params }, user) => {
  const { id } = await params;
  return Response.json({ comments: await listComments(user.id, id) });
});

// POST /api/posts/:id/comments { body }
export const POST = withUser<{ id: string }>(async (req, { params }, user) => {
  await limit(`comment:${user.id}`, 30, 10 * 60, "comments");
  const { id } = await params;
  const { body } = await readJson(req);
  return Response.json(await addComment(user, id, body), { status: 201 });
});
