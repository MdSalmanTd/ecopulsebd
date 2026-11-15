import { withUser, readJson, limit } from "@/lib/server/auth";
import { createPartnerVoucher, getPartnerDashboard } from "@/lib/server/partner";

// POST /api/partner/vouchers { code, title, percent, minSpend?, maxDiscount?, coinCost?, inStore? }
// → creates a voucher for your store; returns the fresh dashboard
export const POST = withUser(async (req, _ctx, user) => {
  await limit(`partner-voucher:${user.id}`, 30, 60 * 60, "new vouchers this hour");
  await createPartnerVoucher(user, await readJson(req));
  return Response.json(await getPartnerDashboard(user), { status: 201 });
});
