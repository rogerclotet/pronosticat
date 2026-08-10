import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlProxy = createMiddleware(routing);

export function proxy(request: NextRequest) {
  // API routes carry no locale: leave them untouched.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  return intlProxy(request);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
