import { withUser } from "@/lib/server/auth";
import { getAvatar } from "@/lib/server/data";

// GET /api/users/:id/avatar → the user's profile photo (signed-in users). ?v= busts the cache after changes.
export const GET = withUser<{ id: string }>(async (_req, { params }) => {
  const { id } = await params;
  const photo = await getAvatar(id);
  if (!photo) return Response.json({ error: "Not found." }, { status: 404 });
  return new Response(photo.body, {
    headers: {
      "Content-Type": photo.type,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
