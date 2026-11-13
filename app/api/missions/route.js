import { withUser, readJson, limit } from "@/lib/server/auth";
import { createMission, listMissions } from "@/lib/server/data";

// GET /api/missions → all missions with the viewer's joined/saved flags
export const GET = withUser(async (_req, _ctx, user) => Response.json({ missions: await listMissions(user.id) }));

// POST /api/missions → create a mission (the creator is the organizer and auto-joins)
export const POST = withUser(async (req, _ctx, user) => {
  await limit(`mission:${user.id}`, 10, 60 * 60, "new missions this hour");
  const mission = await createMission(user, await readJson(req));
  return Response.json({ mission }, { status: 201 });
});
