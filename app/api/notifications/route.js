import { withUser, readJson } from "@/lib/server/auth";
import { listNotifications, markNotificationsRead } from "@/lib/server/data";

// GET /api/notifications → notifications with read flags
export const GET = withUser(async (_req, _ctx, user) => Response.json({ notifications: await listNotifications(user.id) }));

// POST /api/notifications { read: ["n1", ...] } → mark as read
export const POST = withUser(async (req, _ctx, user) => {
  const body = await readJson(req);
  return Response.json({ notifications: await markNotificationsRead(user.id, body.read) });
});
