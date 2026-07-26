import { clerkMiddleware } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);
const hasClerkConfiguration = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default hasClerkConfiguration
  ? clerkMiddleware((_auth, request) => intlMiddleware(request), {
      authorizedParties: process.env.NEXT_PUBLIC_APP_URL
        ? [process.env.NEXT_PUBLIC_APP_URL]
        : ["http://localhost:3000"],
    })
  : intlMiddleware;

export const config = {
  matcher: [
    "/",
    "/(sl|en)/:path*",
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|webmanifest)).*)",
    "/(api)(.*)",
    "/__clerk/(.*)",
  ],
};
