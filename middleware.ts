import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/square/webhook", "/api/gohighlevel/webhook", "/api/cron"];
function secret() {
  return new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("session")?.value;
  if (token) {
    try {
      await jwtVerify(token, secret());
      return NextResponse.next();
    } catch {
      // fall through to redirect
    }
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
