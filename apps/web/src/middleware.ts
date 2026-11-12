import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const STAFF_HOST = "pms.phoenixstorageyards.com";
const CUSTOMER_HOST = "www.phoenixstorageyards.com";

const STAFF_PREFIXES = [
  "/login",
  "/dashboard",
  "/bookings",
  "/customers",
  "/collections",
  "/leases",
  "/lots",
  "/invoices",
  "/notifications",
  "/properties",
  "/compliance",
  "/profile",
  "/leads",
];

function isStaffPath(pathname: string) {
  return STAFF_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const { pathname } = request.nextUrl;

  if (host === STAFF_HOST) {
    if (pathname === "/" || pathname === "/auth/signin") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (pathname === "/portal" || pathname.startsWith("/portal/") || pathname === "/book" || pathname.startsWith("/book/")) {
      return NextResponse.redirect(new URL(`https://${CUSTOMER_HOST}${pathname}${request.nextUrl.search}`));
    }
    return NextResponse.next();
  }

  if (host === CUSTOMER_HOST) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/book", request.url));
    }
    if (isStaffPath(pathname)) {
      return NextResponse.redirect(new URL(`https://${STAFF_HOST}${pathname}${request.nextUrl.search}`));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|uploads|favicon.ico|.*\\..*).*)"],
};
