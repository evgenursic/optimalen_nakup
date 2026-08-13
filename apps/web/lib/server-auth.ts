import "server-only";

import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

export interface AuthenticatedConvex {
  client: ConvexHttpClient;
  clerkUserId: string;
}

export async function getAuthenticatedConvex(): Promise<AuthenticatedConvex | null> {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!convexUrl || !clerkKey) {
    return null;
  }
  const session = await auth();
  if (!session.userId) {
    return null;
  }
  const token = await session.getToken({ template: "convex" });
  if (!token) {
    return null;
  }
  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(token);
  return { client, clerkUserId: session.userId };
}

export function hasSameOrigin(request: Request): boolean {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const expectedOrigin = new URL(configuredUrl).origin;
  return request.headers.get("origin") === expectedOrigin;
}
