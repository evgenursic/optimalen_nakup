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
    `script-src-elem 'self' 'nonce-${nonce}' 'sha256-1UeS9+RokFiZJmjlnTVB1HgRiZ50qEk39Ou8WFItPOc=' 'sha256-7b3Fgmf+FPS3bS4GKrTPMCeSFCu0b4j2Vh0hAII4ntw=' 'sha256-A5MScHVaRj+q0elWj+nwmSMOyfOb4BFSRI2aPyTIbtI=' 'sha256-CkN3D5tdU1XREoL+A4v2CaCZ+Jx5VS892wYwFWT4XMw=' 'sha256-EpGefapPycA2+P/kBwea+s64k/55Jz6WXzIsfq7OHU8=' 'sha256-IxAoaB0IVTgZupmxBeNjlf5YgUPi1+8cKoBgj6Z/ZYA=' 'sha256-Ki7d++ZEh2z95+Qw9YiyzR7Gj2daLlznX8knM/upQGk=' 'sha256-LYkcz78l1n2P8tIEHHqU4rGdqr5x2979aJIj6jHh8Zw=' 'sha256-LnV7SmD/5ICOtBRGpSJAbXS1MZI1Z319816fVwKGdvY=' 'sha256-OBTN3RiyCV4Bq7dFqZ5a2pAXjnCcCYeTJMO2I/LYKeo=' 'sha256-PFY+KYTfevUKu7S74rvz1uv5U4Y7ZCosU2qcyfBm/uo=' 'sha256-Yc9B9DSn/4lC/lnPBwJhxb9BKKipXNUVasM8hQ8V1do=' 'sha256-aothaO7jz9NZxlcrJ5VBADBu3RMQsuhfJZ85gOsuBOg=' 'sha256-caGX/qlmYd2xdjassGET7+5ey8y0fX4NZzupeoWcJm8=' 'sha256-hjz0wMWLy0c7eNlotiUiHVBEdG/W7/74XEEaWRtX7Ag=' 'sha256-lxhDnbc+JW5RwiDmzNe/E4uZzX9gV+a8L4bZBBCo1D4=' 'sha256-mqvFaWBYk78zyftPUsm7P7fctrpFMz0XRewq0SEPWVo=' 'sha256-p2Zwn9GKPuVutUzL2V4EDzCwe1Gg2k9mON3i0ItjBBY=' 'sha256-qtOg+zJntCi21YRR+Z2TsoHC5S499hvr2ucD3tJ4lgs=' 'sha256-v2WrlTdFaHcs020KIUF5jOyRicpdpvJDReXseiFtMJA=' 'sha256-wf7q/3i2/shHIMDN8/IGcWSv/5hy75GGvaAsBl4Vy1Q=' 'sha256-whv5B/gGikAVTH4Bw3T6RWqML45ttYoOV5K+PywOyS4='`,
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
