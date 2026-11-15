import { productImage } from "@/lib/server/partner";

// GET /api/shop/products/:id/photo → a partner-uploaded product photo (public, like the shop)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const photo = await productImage(id);
  if (!photo) return Response.json({ error: "Not found." }, { status: 404 });
  return new Response(photo.body as BodyInit, {
    headers: { "Content-Type": photo.type, "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" },
  });
}
