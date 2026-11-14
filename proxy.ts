import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/session";

// App pages that need a signed-in user. The public website stays open.
const PROTECTED = ["/map", "/profile", "/feed", "/reports", "/missions", "/rewards", "/assistant", "/shop/checkout", "/shop/orders"];

const isProtected = (path: string): boolean => PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));

export default async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname, search } = req.nextUrl;
  const token = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
  const session = token?.uid ? token : null; // sessions must belong to a database user

  // Not signed in → send to sign-in, remembering where they wanted to go.
  if (isProtected(pathname) && !session) {
    const url = new URL("/sign-in", req.nextUrl);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  // Already signed in → skip the sign-in page.
  if (pathname === "/sign-in" && session) {
    return NextResponse.redirect(new URL("/feed", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/map/:path*", "/profile/:path*", "/feed/:path*", "/reports/:path*", "/missions/:path*", "/rewards/:path*", "/assistant/:path*", "/shop/checkout/:path*", "/shop/orders/:path*", "/sign-in"],
};
