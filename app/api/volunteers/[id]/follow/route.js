import { withUser, limit } from "@/lib/server/auth";
import { setFollow } from "@/lib/server/feed";

// POST /api/volunteers/:id/follow → follow;  DELETE → unfollow
export const POST = withUser(async (_req, { params }, user) => {
  await limit(`act:${user.id}`, 60, 60, "clicks");
  const { id } = await params;
  return Response.json({ volunteers: await setFollow(user.id, id, true) });
});

export const DELETE = withUser(async (_req, { params }, user) => {
  await limit(`act:${user.id}`, 60, 60, "clicks");
  const { id } = await params;
  return Response.json({ volunteers: await setFollow(user.id, id, false) });
});
