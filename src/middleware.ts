import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth",
  "/api/book",
  "/book",
  "/manifest.json",
  "/sw.js",
  "/icon-",
  "/apple-touch-icon.png",
  "/favicon-32.png",
  "/logo-source.png",
];

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;

  if (!claims) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/settings") && claims.role !== "owner") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
