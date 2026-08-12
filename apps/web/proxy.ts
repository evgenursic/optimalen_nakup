import { clerkMiddleware } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);
const hasClerkConfiguration = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'sha256-p2Zwn9GKPuVutUzL2V4EDzCwe1Gg2k9mON3i0ItjBBY=' 'strict-dynamic' https:`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://*.convex.cloud https://*.convex.site wss://*.clerk.accounts.dev wss://*.clerk.com wss://*.convex.cloud",
    "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self'",
  ].join("; ");
}

function bypassesLocalization(request: NextRequest) {
  return (
    request.nextUrl.pathname.startsWith("/api/") || request.nextUrl.pathname.startsWith("/__clerk/")
  );
}

function withContentSecurityPolicy(request: NextRequest): NextResponse {
  const nonce = btoa(crypto.randomUUID());
  const policy = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("content-security-policy", policy);
  requestHeaders.set("x-nonce", nonce);

  const response = bypassesLocalization(request)
    ? NextResponse.next({ request: { headers: requestHeaders } })
    : intlMiddleware(new NextRequest(request, { headers: requestHeaders }));

  const requestOverride = NextResponse.next({ request: { headers: requestHeaders } });
  for (const [key, value] of requestOverride.headers) {
    if (key === "x-middleware-override-headers" || key.startsWith("x-middleware-request-")) {
      response.headers.set(key, value);
    }
  }
  response.headers.set("content-security-policy", policy);
  return response;
}

export default hasClerkConfiguration
  ? clerkMiddleware((_auth, request) => withContentSecurityPolicy(request), {
      authorizedParties: process.env.NEXT_PUBLIC_APP_URL
        ? [process.env.NEXT_PUBLIC_APP_URL]
        : ["http://localhost:3000"],
    })
  : withContentSecurityPolicy;

export const config = {
  matcher: [
    "/",
    "/(sl|en)/:path*",
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|webmanifest)).*)",
    "/(api)(.*)",
    "/__clerk/(.*)",
  ],
};
