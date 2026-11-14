import { withOptionalUser } from "@/lib/server/auth";
import { listShop } from "@/lib/server/shop";

// GET /api/shop → products, partners and vouchers (public). Signed-in users also get their
// Eco Coin balance and which vouchers they have claimed.
export const GET = withOptionalUser(async (_req, _ctx, user) => Response.json(await listShop(user?.id ?? null)));
