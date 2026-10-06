import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (
    !request.cookies.has("origin_session") &&
    !request.cookies.has("__Host-origin_session")
  ) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/stones/:path*",
    "/workshops/:path*",
    "/custody/:path*",
    "/stocktake/:path*",
    "/quality/:path*",
    "/salesman-trials/:path*",
    "/jewellery/:path*",
    "/promotions/:path*",
    "/reports/:path*",
    "/directory/:path*",
    "/categories/:path*",
  ],
};
