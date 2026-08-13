import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { api } from "@convex/_generated/api";

import { getAuthenticatedConvex, hasSameOrigin } from "@/lib/server-auth";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  const authenticated = await getAuthenticatedConvex();
  if (!authenticated) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const ingestSecret = process.env.ACCOUNT_DELETION_INGEST_SECRET;
  if (!ingestSecret || ingestSecret.length < 32) {
    return NextResponse.json({ error: "deletion_not_configured" }, { status: 503 });
  }

  try {
    await authenticated.client.mutation(api.users.requestAccountDeletion, {});
  } catch {
    return NextResponse.json(
      { error: "ownership_transfer_required" },
      { status: 409, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(authenticated.clerkUserId);
  } catch {
    await authenticated.client
      .mutation(api.users.restoreFailedAccountDeletion, {
        clerkUserId: authenticated.clerkUserId,
        ingestSecret,
      })
      .catch(() => undefined);
    return NextResponse.json({ error: "identity_deletion_failed" }, { status: 502 });
  }

  try {
    await authenticated.client.mutation(api.users.finalizeAccountDeletion, {
      clerkUserId: authenticated.clerkUserId,
      ingestSecret,
    });
  } catch {
    return NextResponse.json({ error: "data_finalization_failed" }, { status: 502 });
  }
  return new NextResponse(null, {
    status: 204,
    headers: { "cache-control": "no-store" },
  });
}
