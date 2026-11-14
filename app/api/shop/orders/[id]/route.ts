import { withUser, limit } from "@/lib/server/auth";
import { cancelOrder } from "@/lib/server/shop";

// DELETE /api/shop/orders/:id → cancel the order (stock, Eco Coins and voucher are returned)
export const DELETE = withUser<{ id: string }>(async (_req, { params }, user) => {
  await limit(`act:${user.id}`, 60, 60, "clicks");
  const { id } = await params;
  return Response.json(await cancelOrder(user.id, id));
});
