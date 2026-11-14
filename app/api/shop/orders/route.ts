import { withUser, readJson, limit } from "@/lib/server/auth";
import { createOrder, listOrders } from "@/lib/server/shop";

// GET /api/shop/orders → your orders, newest first
export const GET = withUser(async (_req, _ctx, user) => Response.json({ orders: await listOrders(user.id) }));

// POST /api/shop/orders { items, name, phone, address, payment, voucher?, coins? } → place an order
export const POST = withUser(async (req, _ctx, user) => {
  await limit(`order:${user.id}`, 20, 60 * 60, "orders this hour");
  return Response.json(await createOrder(user, await readJson(req)), { status: 201 });
});
