import { withUser } from "@/lib/server/auth";
import { withdrawReport } from "@/lib/server/data";

// DELETE /api/reports/R-1043 → withdraw your own, not-yet-reviewed report
export const DELETE = withUser<{ id: string }>(async (_req, { params }, user) => {
  const { id } = await params;
  await withdrawReport(user.id, id);
  return new Response(null, { status: 204 });
});
