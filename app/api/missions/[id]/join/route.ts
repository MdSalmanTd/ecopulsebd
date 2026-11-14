import { withUser, limit } from "@/lib/server/auth";
import { joinMission, leaveMission } from "@/lib/server/data";

// POST /api/missions/:id/join → join;  DELETE → leave
export const POST = withUser<{ id: string }>(async (_req, { params }, user) => {
  await limit(`act:${user.id}`, 60, 60, "clicks");
  const { id } = await params;
  return Response.json({ mission: await joinMission(user.id, id) });
});

export const DELETE = withUser<{ id: string }>(async (_req, { params }, user) => {
  await limit(`act:${user.id}`, 60, 60, "clicks");
  const { id } = await params;
  return Response.json({ mission: await leaveMission(user.id, id) });
});
