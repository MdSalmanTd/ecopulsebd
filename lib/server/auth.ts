import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifyToken } from "../session";
import { getUser } from "./data";
import { HttpError } from "./errors";
import { rateLimit, waitText } from "./redis";
import type { User } from "../types";

export { HttpError };

/** Route context: Next passes dynamic segments as a promise. */
export interface RouteContext<P extends Record<string, string> = Record<string, string>> {
  params: Promise<P>;
}

type Handler<P extends Record<string, string>> = (
  req: Request,
  ctx: RouteContext<P>,
  user: User,
) => Promise<Response> | Response;

/** The signed-in user ({ id, name, login }) or null. Re-checks the user still exists. */
export async function currentUser(): Promise<User | null> {
  const session = await verifyToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session?.uid) return null;
  return getUser(session.uid);
}

/** Wraps a route handler: requires a signed-in user and turns errors into JSON responses. */
export function withUser<P extends Record<string, string> = Record<string, string>>(handler: Handler<P>) {
  return async (req: Request, ctx: RouteContext<P>): Promise<Response> => {
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

type OpenHandler<P extends Record<string, string>> = (
  req: Request,
  ctx: RouteContext<P>,
  user: User | null,
) => Promise<Response> | Response;

/** Like withUser, but for public endpoints: `user` is null when nobody is signed in. */
export function withOptionalUser<P extends Record<string, string> = Record<string, string>>(handler: OpenHandler<P>) {
  return async (req: Request, ctx: RouteContext<P>): Promise<Response> => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") {
        const origin = req.headers.get("origin");
        if (origin && origin !== new URL(req.url).origin) {
          return Response.json({ error: "Cross-site request blocked." }, { status: 403 });
        }
      }
      return await handler(req, ctx, await currentUser());
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      console.error(e);
      return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}

/** Throws 429 when `key` has been used more than `limit` times in `windowSec`. */
export async function limit(key: string, max: number, windowSec: number, what = "requests"): Promise<void> {
  const r = await rateLimit(key, max, windowSec);
  if (!r.ok) throw new HttpError(429, `Too many ${what}. Please try again in ${waitText(r.retryAfter)}.`);
}

/** Parses a JSON body or throws 400. */
export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
}
