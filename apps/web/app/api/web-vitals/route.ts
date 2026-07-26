import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { api } from "@convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

import { hasSameOrigin } from "@/lib/server-auth";

const metricSchema = z.object({
  route: z.string().max(300),
  metric: z.enum(["LCP", "INP", "CLS", "TTFB"]),
  value: z.number().finite().nonnegative().max(10_000_000),
  rating: z.enum(["good", "needs-improvement", "poor"]),
  navigationType: z.string().max(80),
});

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 8 * 1024) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = metricSchema.safeParse(decoded);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_metric" }, { status: 400 });
  }
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const ingestSecret = process.env.WEB_VITALS_INGEST_SECRET;
  if (!convexUrl || !ingestSecret || ingestSecret.length < 32) {
    return NextResponse.json({ error: "telemetry_not_configured" }, { status: 503 });
  }
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientAddress = request.headers.get("cf-connecting-ip") ?? forwardedFor ?? "unknown";
  const client = new ConvexHttpClient(convexUrl);
  await client.mutation(api.public.recordWebVital, {
    ...parsed.data,
    appVersion: (process.env.APP_VERSION ?? "development").slice(0, 100),
    rateLimitKey: sha256(`${ingestSecret}:web-vitals:${clientAddress}`),
    ingestSecret,
  });
  return new NextResponse(null, {
    status: 204,
    headers: { "cache-control": "no-store" },
  });
}
