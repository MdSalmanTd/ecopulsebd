import { withUser, limit } from "@/lib/server/auth";
import { setSaved } from "@/lib/server/data";

// POST /api/missions/:id/save → bookmark;  DELETE → remove bookmark
export const POST = withUser<{ id: string }>(async (_req, { params }, user) => {
  await limit(`act:${user.id}`, 60, 60, "clicks");
  const { id } = await params;
  return Response.json({ mission: await setSaved(user.id, id, true) });
});

export const DELETE = withUser<{ id: string }>(async (_req, { params }, user) => {
  await limit(`act:${user.id}`, 60, 60, "clicks");
  const { id } = await params;
  return Response.json({ mission: await setSaved(user.id, id, false) });
});
