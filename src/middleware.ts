import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_COOKIE = "session";
const PUBLIC_PATHS = ["/", "/login", "/api/auth/login", "/api/auth/logout", "/api/auth/me", "/api/presence/event"];

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) return new Uint8Array(0);
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "?"))) {
    if (pathname === "/" || pathname === "/login") {
      const token = request.cookies.get(JWT_COOKIE)?.value;
      if (token) {
        try {
          const { payload } = await jwtVerify(token, getSecret());
          if (payload.role === "ADMIN") {
            return NextResponse.redirect(new URL("/dashboard", request.url));
          }
        } catch {
          // invalid token, allow access to login
        }
      }
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/api/admin")) {
    const token = request.cookies.get(JWT_COOKIE)?.value;
    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
    try {
      const { payload } = await jwtVerify(token, getSecret());
      if (pathname.startsWith("/dashboard") || pathname.startsWith("/api/admin")) {
        if (payload.role !== "ADMIN") {
          if (pathname.startsWith("/api/")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
          }
          return NextResponse.redirect(new URL("/login", request.url));
        }
      }
    } catch {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const res = NextResponse.redirect(new URL("/login", request.url));
      res.cookies.delete(JWT_COOKIE);
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/admin/:path*", "/", "/login", "/api/auth/:path*", "/api/presence/event"],
};
