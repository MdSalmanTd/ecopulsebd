import { withOptionalUser, readJson, limit } from "@/lib/server/auth";
import { applyPartner } from "@/lib/server/shop";

// POST /api/partners → "Be our partner" application (public, no account needed)
export const POST = withOptionalUser(async (req, _ctx, user) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  await limit(`partner:${user ? `u${user.id}` : ip}`, 5, 60 * 60, "applications");
  await applyPartner(await readJson(req), user?.id ?? null);
  return Response.json({ ok: true }, { status: 201 });
});
