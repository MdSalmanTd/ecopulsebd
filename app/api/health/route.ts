import { query } from "@/lib/server/db";
import { redisStatus } from "@/lib/server/redis";

// GET /api/health → checks the database connection (no auth; no data exposed)
export async function GET() {
  try {
    await query("SELECT 1");
    return Response.json({
      ok: true,
      database: process.env.DATABASE_URL ? "postgres" : "pglite",
      rateLimits: await redisStatus(),
    });
  } catch (e) {
    console.error(e);
    return Response.json({ ok: false }, { status: 503 });
  }
}
