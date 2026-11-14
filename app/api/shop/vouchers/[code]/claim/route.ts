import { withUser, limit } from "@/lib/server/auth";
import { claimVoucher } from "@/lib/server/shop";

// POST /api/shop/vouchers/:code/claim → add a partner voucher to your account (may cost Eco Coins)
export const POST = withUser<{ code: string }>(async (_req, { params }, user) => {
  await limit(`act:${user.id}`, 60, 60, "clicks");
  const { code } = await params;
  return Response.json(await claimVoucher(user.id, code));
});
