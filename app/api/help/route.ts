import { withUser, readJson, limit } from "@/lib/server/auth";
import { createHelp, listHelp } from "@/lib/server/help";

// GET /api/help → active help requests (live locations) + the viewer's own active request
export const GET = withUser(async (_req, _ctx, user) => {
  const data = await listHelp(user.id);
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
});

// POST /api/help { kind, note, people, lat, lng, accuracy } → start a help request
export const POST = withUser(async (req, _ctx, user) => {
  await limit(`help:${user.id}`, 5, 60 * 60, "help requests this hour");
  const help = await createHelp(user.id, await readJson(req));
  return Response.json({ help }, { status: 201 });
});
