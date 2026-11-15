import { withUser, limit, HttpError } from "@/lib/server/auth";
import { createPartnerProduct, getPartnerDashboard } from "@/lib/server/partner";

// POST /api/partner/products (multipart/form-data: name, category, description, price, unit, stock, badge, photo)
// → adds a product to your store; returns the fresh dashboard
export const POST = withUser(async (req, _ctx, user) => {
  await limit(`partner-add:${user.id}`, 30, 60 * 60, "new products this hour");
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new HttpError(400, "Send the product as multipart/form-data.");
  }
  const file = form.get("photo");
  const hasFile = file && typeof file === "object" && file.size > 0;
  await createPartnerProduct(user, {
    name: form.get("name"),
    category: form.get("category"),
    description: form.get("description"),
    price: form.get("price"),
    unit: form.get("unit"),
    stock: form.get("stock"),
    badge: form.get("badge"),
    photo: hasFile ? Buffer.from(await file.arrayBuffer()) : null,
    photoType: hasFile ? file.type : null,
  });
  return Response.json(await getPartnerDashboard(user), { status: 201 });
});
