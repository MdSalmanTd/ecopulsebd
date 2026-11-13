import { cookies } from "next/headers";
import { withUser, readJson, limit } from "@/lib/server/auth";
import { getProfile, updateProfile, PROFILE_AREAS } from "@/lib/server/data";
import { PROFILE_COOKIE, SESSION_DAYS } from "@/lib/session";

// GET /api/me → the signed-in user's profile + activity stats
export const GET = withUser(async (_req, _ctx, user) =>
  Response.json({ user: await getProfile(user.id), areas: PROFILE_AREAS }),
);

// PATCH /api/me { name, bio, area, organization? } → update your profile
export const PATCH = withUser(async (req, _ctx, user) => {
  await limit(`profile:${user.id}`, 20, 60 * 60, "profile updates");
  const profile = await updateProfile(user, await readJson(req));
  // keep the display-name cookie in sync
  (await cookies()).set(PROFILE_COOKIE, encodeURIComponent(profile.name), {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return Response.json({ user: profile, areas: PROFILE_AREAS });
});
