import { withUser, readJson, limit } from "@/lib/server/auth";
import { updateHelp } from "@/lib/server/help";

// PATCH /api/help/:id { lat, lng, accuracy } → update your live location
// PATCH /api/help/:id { status: "resolved" | "cancelled" } → you're safe / stop sharing
export const PATCH = withUser<{ id: string }>(async (req, { params }, user) => {
  await limit(`helploc:${user.id}`, 240, 60 * 60, "location updates");
  const { id } = await params;
  return Response.json({ help: await updateHelp(user.id, id, await readJson(req)) });
});
