import { withUser } from "@/lib/server/auth";
import { getPartnerDashboard } from "@/lib/server/partner";

// GET /api/partner → the signed-in partner's store: products, recent orders, sales totals
export const GET = withUser(async (_req, _ctx, user) => Response.json(await getPartnerDashboard(user)));
