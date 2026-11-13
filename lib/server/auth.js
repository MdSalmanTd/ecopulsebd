import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifyToken } from "../session";
import { getUser } from "./data";
import { HttpError } from "./errors";
import { rateLimit, waitText } from "./redis";

export { HttpError };

/** The signed-in user ({ id, name, login }) or null. Re-checks the user still exists. */
export async function currentUser() {
  const session = await verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session?.uid) return null;
  return getUser(session.uid);
}

/** Wraps a route handler: requires a signed-in user and turns errors into JSON responses. */
export function withUser(handler) {
  return async (req, ctx) => {
    try {
      // Block cross-site writes (CSRF): browsers send Origin on POST/DELETE.
      if (req.method !== "GET" && req.method !== "HEAD") {
        const origin = req.headers.get("origin");
        if (origin && origin !== new URL(req.url).origin) {
          return Response.json({ error: "Cross-site request blocked." }, { status: 403 });
        }
      }
      const user = await currentUser();
      if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
      return await handler(req, ctx, user);
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      console.error(e);
      return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

/** Throws 429 when `key` has been used more than `limit` times in `windowSec`. */
export async function limit(key, max, windowSec, what = "requests") {
  const r = await rateLimit(key, max, windowSec);
  if (!r.ok) throw new HttpError(429, `Too many ${what}. Please try again in ${waitText(r.retryAfter)}.`);
}

/** Parses a JSON body or throws 400. */
export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
}
