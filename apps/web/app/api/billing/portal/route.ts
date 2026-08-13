import { createBillingProvider } from "@optimalen-nakup/providers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { api } from "@convex/_generated/api";

import { getAuthenticatedConvex, hasSameOrigin } from "@/lib/server-auth";

const portalRequestSchema = z.object({
  organizationId: z.string().min(1),
});

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  const authenticated = await getAuthenticatedConvex();
  if (!authenticated) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  const parsed = portalRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const billingContext = await authenticated.client.query(api.organizations.billingContext, {
    organizationId: parsed.data.organizationId as never,
  });
  if (!billingContext.externalCustomerId) {
    return NextResponse.json({ error: "billing_customer_missing" }, { status: 404 });
  }
  const provider = createBillingProvider({
    apiKey: process.env.LEMON_SQUEEZY_API_KEY,
    storeId: process.env.LEMON_SQUEEZY_STORE_ID,
    testMode: process.env.NODE_ENV !== "production",
  });
  if (!provider.configured) {
    return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });
  }
  const portal = await provider.createCustomerPortal(billingContext.externalCustomerId);
  return NextResponse.json(
    { url: portal.url },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
