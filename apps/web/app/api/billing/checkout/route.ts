import { currentUser } from "@clerk/nextjs/server";
import { createBillingProvider } from "@optimalen-nakup/providers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { api } from "@convex/_generated/api";

import { getAuthenticatedConvex, hasSameOrigin } from "@/lib/server-auth";

const checkoutRequestSchema = z.object({
  organizationId: z.string().min(1),
  plan: z.enum(["starter", "pro", "business"]),
  interval: z.enum(["monthly", "annual"]),
  locale: z.enum(["sl", "en"]),
});

const variants = {
  starter: {
    monthly: process.env.LEMON_SQUEEZY_STARTER_MONTHLY_VARIANT_ID,
    annual: process.env.LEMON_SQUEEZY_STARTER_ANNUAL_VARIANT_ID,
  },
  pro: {
    monthly: process.env.LEMON_SQUEEZY_PRO_MONTHLY_VARIANT_ID,
    annual: process.env.LEMON_SQUEEZY_PRO_ANNUAL_VARIANT_ID,
  },
  business: {
    monthly: process.env.LEMON_SQUEEZY_BUSINESS_MONTHLY_VARIANT_ID,
    annual: process.env.LEMON_SQUEEZY_BUSINESS_ANNUAL_VARIANT_ID,
  },
} as const;

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  const authenticated = await getAuthenticatedConvex();
  if (!authenticated) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  const parsed = checkoutRequestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const billingContext = await authenticated.client.query(api.organizations.billingContext, {
    organizationId: parsed.data.organizationId as never,
  });
  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress;
  if (!email) {
    return NextResponse.json({ error: "verified_email_required" }, { status: 422 });
  }

  const provider = createBillingProvider({
    apiKey: process.env.LEMON_SQUEEZY_API_KEY,
    storeId: process.env.LEMON_SQUEEZY_STORE_ID,
    testMode: process.env.NODE_ENV !== "production",
  });
  const variantId = variants[parsed.data.plan][parsed.data.interval];
  if (!provider.configured || !variantId) {
    return NextResponse.json({ error: "billing_not_configured" }, { status: 503 });
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const checkout = await provider.createCheckout({
    organizationId: parsed.data.organizationId,
    userId: billingContext.userId,
    customerEmail: email,
    variantId,
    locale: parsed.data.locale,
    redirectUrl: new URL(`/${parsed.data.locale}/app/billing?checkout=success`, appUrl).toString(),
  });
  return NextResponse.json(
    { url: checkout.url },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
