import { createHash, randomBytes } from "node:crypto";

import { createEmailProvider } from "@optimalen-nakup/providers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

import { getAuthenticatedConvex, hasSameOrigin } from "@/lib/server-auth";

const invitationSchema = z.object({
  organizationId: z.string().min(1),
  email: z.email().max(320),
  role: z.enum(["admin", "researcher", "viewer"]),
  locale: z.enum(["sl", "en"]),
});

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  const authenticated = await getAuthenticatedConvex();
  if (!authenticated) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
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
  const parsed = invitationSchema.safeParse(decoded);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const provider = createEmailProvider(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM;
  if (!provider.configured || !from) {
    return NextResponse.json({ error: "email_not_configured" }, { status: 503 });
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1_000;
  let invitationId: Id<"invitations"> | undefined;
  try {
    invitationId = await authenticated.client.mutation(api.organizations.createInvitation, {
      organizationId: parsed.data.organizationId as never,
      email: normalizedEmail,
      emailHash: sha256(normalizedEmail),
      tokenHash: sha256(token),
      role: parsed.data.role,
      expiresAt,
    });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const invitationUrl = new URL(`/${parsed.data.locale}/invite/${token}`, appUrl).toString();
    const subject =
      parsed.data.locale === "sl" ? "Vabilo v Optimalen Nakup" : "Your Optimalen Nakup invitation";
    const text =
      parsed.data.locale === "sl"
        ? `Povabljeni ste v delovni prostor Optimalen Nakup z vlogo ${parsed.data.role}. Vabilo sprejmite v sedmih dneh: ${invitationUrl}`
        : `You were invited to an Optimalen Nakup workspace as ${parsed.data.role}. Accept within seven days: ${invitationUrl}`;
    const delivery = await provider.send({
      from,
      to: [normalizedEmail],
      subject,
      text,
      idempotencyKey: `workspace-invitation/${invitationId}`,
      tags: [{ name: "category", value: "workspace-invitation" }],
    });
    if (delivery.status !== "sent") {
      throw new Error("Invitation email was not sent");
    }
  } catch {
    if (invitationId) {
      await authenticated.client
        .mutation(api.organizations.revokeInvitation, {
          organizationId: parsed.data.organizationId as never,
          invitationId,
        })
        .catch(() => undefined);
    }
    return NextResponse.json({ error: "invitation_failed" }, { status: 502 });
  }

  return NextResponse.json(
    { status: "sent" },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
