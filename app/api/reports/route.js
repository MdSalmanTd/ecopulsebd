import { withUser, HttpError, limit } from "@/lib/server/auth";
import { createReport, listReports } from "@/lib/server/data";

// GET /api/reports → the signed-in user's reports
export const GET = withUser(async (_req, _ctx, user) => Response.json({ reports: await listReports(user.id) }));

// POST /api/reports (multipart/form-data: issue, location, description, photo, shareToFeed=true|false)
export const POST = withUser(async (req, _ctx, user) => {
  await limit(`report:${user.id}`, 20, 60 * 60, "reports this hour");
  let form;
  try {
    form = await req.formData();
  } catch {
    throw new HttpError(400, "Send the report as multipart/form-data.");
  }
  const file = form.get("photo");
  const photo = file && typeof file === "object" ? Buffer.from(await file.arrayBuffer()) : null;
  const report = await createReport(user, {
    issue: form.get("issue"),
    location: form.get("location"),
    description: form.get("description"),
    photo,
    photoType: file?.type,
    shareToFeed: form.get("shareToFeed") !== "false",
  });
  return Response.json({ report }, { status: 201 });
});
