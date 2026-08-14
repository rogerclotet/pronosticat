import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const intlProxy = createMiddleware(routing);

const CREST_HOST = "https://crests.football-data.org";

/**
 * A fresh nonce per request is what lets the policy stay strict: Next tags its
 * own inline bootstrap scripts with it, so nothing else inline can run.
 * Incompatible with `cacheComponents` (PPR) — the static shell has no nonce.
 */
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    // React uses eval in development to rebuild server stacks; never in production.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    // Crest images are rendered with plain <img>, so they need an explicit source.
    `img-src 'self' blob: data: ${CREST_HOST}`,
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Progress bars set width through a style attribute, which no nonce can cover.
    "style-src-attr 'unsafe-inline'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  // API routes carry no locale: leave them untouched.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const nonce = crypto.randomUUID().replaceAll("-", "");
  const csp = buildCsp(nonce);

  // Next reads the nonce back off the request header to tag its own scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = intlProxy(
    new NextRequest(request, { headers: requestHeaders }),
  );
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
