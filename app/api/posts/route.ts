import { withUser, HttpError, limit } from "@/lib/server/auth";
import { createPost, listPosts } from "@/lib/server/feed";

// GET /api/posts?filter=all|nearby|saved|mine
export const GET = withUser(async (req, _ctx, user) => {
  const filter = new URL(req.url).searchParams.get("filter") || "all";
  return Response.json({ posts: await listPosts(user.id, filter) });
});

// POST /api/posts (multipart/form-data: body, area, photo?)
export const POST = withUser(async (req, _ctx, user) => {
  await limit(`post:${user.id}`, 10, 60 * 60, "posts this hour");
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new HttpError(400, "Send the post as multipart/form-data.");
  }
  const file = form.get("photo");
  const hasFile = file && typeof file === "object" && file.size > 0;
  const post = await createPost(user, {
    body: form.get("body"),
    area: form.get("area"),
    photo: hasFile ? Buffer.from(await file.arrayBuffer()) : null,
    photoType: hasFile ? file.type : null,
  });
  return Response.json({ post }, { status: 201 });
});
