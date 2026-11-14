import { withUser, HttpError, limit } from "@/lib/server/auth";
import { setAvatar } from "@/lib/server/data";

// PUT /api/me/avatar (multipart: photo) → set your profile photo;  DELETE → remove it
export const PUT = withUser(async (req, _ctx, user) => {
  await limit(`photo:${user.id}`, 20, 60 * 60, "photo changes this hour");
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new HttpError(400, "Send the photo as multipart/form-data.");
  }
  const file = form.get("photo");
  if (!file || typeof file !== "object") throw new HttpError(400, "Choose a photo.");
  const user2 = await setAvatar(user.id, Buffer.from(await file.arrayBuffer()), file.type);
  return Response.json({ user: user2 });
});

export const DELETE = withUser(async (_req, _ctx, user) => {
  return Response.json({ user: await setAvatar(user.id, null) });
});
