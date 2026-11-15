import { withUser, readJson, limit } from "@/lib/server/auth";
import { getPartnerDashboard, updatePartnerProduct } from "@/lib/server/partner";

// PATCH /api/partner/products/:id { price, stock } → update one of your products; returns the fresh dashboard
export const PATCH = withUser<{ id: string }>(async (req, { params }, user) => {
  await limit(`partner:${user.id}`, 120, 60 * 60, "product updates");
  const { id } = await params;
  await updatePartnerProduct(user, id, await readJson(req));
  return Response.json(await getPartnerDashboard(user));
});
