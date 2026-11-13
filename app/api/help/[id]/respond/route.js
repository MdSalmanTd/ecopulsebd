import { withUser, limit } from "@/lib/server/auth";
import { setResponding } from "@/lib/server/help";

// POST /api/help/:id/respond → "I'm on my way";  DELETE → can't go after all
export const POST = withUser(async (_req, { params }, user) => {
  await limit(`act:${user.id}`, 60, 60, "clicks");
  const { id } = await params;
  return Response.json({ help: await setResponding(user.id, id, true) });
});

export const DELETE = withUser(async (_req, { params }, user) => {
  await limit(`act:${user.id}`, 60, 60, "clicks");
  const { id } = await params;
  return Response.json({ help: await setResponding(user.id, id, false) });
});
