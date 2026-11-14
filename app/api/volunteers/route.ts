import { withUser } from "@/lib/server/auth";
import { listVolunteers } from "@/lib/server/feed";

// GET /api/volunteers → suggested volunteers with your follow state
export const GET = withUser(async (_req, _ctx, user) => Response.json({ volunteers: await listVolunteers(user.id) }));
