import { withUser } from "@/lib/server/auth";
import { postPhoto } from "@/lib/server/feed";

// GET /api/posts/:id/photo → the post's uploaded photo (signed-in users)
export const GET = withUser<{ id: string }>(async (_req, { params }) => {
  const { id } = await params;
  const photo = await postPhoto(id);
  if (!photo) return Response.json({ error: "Not found." }, { status: 404 });
  return new Response(photo.body, {
    headers: { "Content-Type": photo.type, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" },
  });
});
