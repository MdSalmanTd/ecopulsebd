import { withUser } from "@/lib/server/auth";
import { reportPhoto } from "@/lib/server/data";

// GET /api/reports/R-1043/photo → the report's photo (owner only)
export const GET = withUser(async (_req, { params }, user) => {
  const { id } = await params;
  const photo = await reportPhoto(user.id, id);
  if (!photo) return Response.json({ error: "Not found." }, { status: 404 });
  return new Response(photo.body, {
    headers: {
      "Content-Type": photo.type,
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
