import { withUser, readJson, limit } from "@/lib/server/auth";
import { getPartnerDashboard, setPartnerVoucherActive } from "@/lib/server/partner";

// PATCH /api/partner/vouchers/:code { active } → turn one of your vouchers on or off; returns the fresh dashboard
export const PATCH = withUser<{ code: string }>(async (req, { params }, user) => {
  await limit(`partner:${user.id}`, 120, 60 * 60, "updates");
  const { code } = await params;
  await setPartnerVoucherActive(user, code, await readJson(req));
  return Response.json(await getPartnerDashboard(user));
});
