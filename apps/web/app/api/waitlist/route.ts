import { createHash } from "node:crypto";

import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { z } from "zod";

import { api } from "@convex/_generated/api";

import { hasSameOrigin } from "@/lib/server-auth";

const requestSchema = z.object({
  email: z.email().max(320),
  locale: z.enum(["sl", "en"]),
  categories: z
    .array(z.enum(["vehicles", "computers", "white_goods", "services"]))
    .max(4)
    .default([]),
  website: z.string().max(0),
});

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 16 * 1024) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(decoded);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ error: "waitlist_not_configured" }, { status: 503 });
  }
  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientAddress = request.headers.get("cf-connecting-ip") ?? forwardedFor ?? "unknown";
  const rateLimitSecret = process.env.RATE_LIMIT_HASH_SECRET;
  if (process.env.NODE_ENV === "production" && !rateLimitSecret) {
    return NextResponse.json({ error: "waitlist_not_configured" }, { status: 503 });
  }
  const effectiveRateLimitSecret = rateLimitSecret ?? "local-development-rate-limit-secret";
  const client = new ConvexHttpClient(convexUrl);
  const result = await client.mutation(api.public.joinWaitlist, {
    email: normalizedEmail,
    emailHash: sha256(normalizedEmail),
    locale: parsed.data.locale,
    categories: parsed.data.categories,
    source: "pricing",
    rateLimitKey: sha256(`${effectiveRateLimitSecret}:${clientAddress}`),
  });
  return NextResponse.json(result, {
    headers: {
      "cache-control": "no-store",
    },
  });
}
