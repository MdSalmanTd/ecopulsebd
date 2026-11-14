import { withUser, readJson, limit } from "@/lib/server/auth";
import { payOrder } from "@/lib/server/shop";

// POST /api/shop/orders/:id/pay { channel } → pay an online order (demo gateway, see payOrder)
export const POST = withUser<{ id: string }>(async (req, { params }, user) => {
  await limit(`act:${user.id}`, 60, 60, "clicks");
  const { id } = await params;
  const { channel } = await readJson<{ channel?: unknown }>(req);
  return Response.json({ order: await payOrder(user.id, id, channel) });
});
