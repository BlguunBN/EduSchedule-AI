import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "./src/auth";

export default auth((req: NextRequest & { auth?: unknown }) => {
  const { pathname } = req.nextUrl;

  // Protect dashboard pages
  if (!req.auth && pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Protect API routes (api/... except NextAuth's own /api/auth endpoints)
  // In production the DEV_AUTH_BYPASS is always off, so real sessions are required.
  // In dev with DEV_AUTH_BYPASS=true, requireCurrentStudent() handles the bypass
  // internally, so the middleware just lets all API requests through.
  const isApiRoute = pathname.startsWith("/api/") && !pathname.startsWith("/api/auth");
  if (isApiRoute && !req.auth) {
    const bypassActive = process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS === "true";
    if (!bypassActive) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Sign in required" } }, { status: 401 });
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
