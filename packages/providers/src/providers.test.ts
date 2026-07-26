import { describe, expect, it, vi } from "vitest";

import {
  ClosedBetaBillingProvider,
  LemonSqueezyBillingProvider,
  LocalEmailProvider,
  ResendEmailProvider,
} from "./index.js";

describe("provider adapters", () => {
  it("creates a tenant-bound Lemon Squeezy test checkout", async () => {
    const providerFetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        data: {
          attributes: { checkout_data: { custom: Record<string, string> }; test_mode: boolean };
        };
      };
      expect(body.data.attributes.checkout_data.custom).toEqual({
        organization_id: "org_123",
        user_id: "user_456",
      });
      expect(body.data.attributes.test_mode).toBe(true);
      return new Response(
        JSON.stringify({
          data: {
            id: "checkout-1",
            attributes: { url: "https://example.lemonsqueezy.com/checkout/1" },
          },
        }),
        { status: 201 },
      );
    });
    const provider = new LemonSqueezyBillingProvider({
      apiKey: "test-key",
      storeId: "42",
      testMode: true,
      fetch: providerFetch,
    });

    const result = await provider.createCheckout({
      organizationId: "org_123",
      userId: "user_456",
      customerEmail: "buyer@example.test",
      variantId: "7",
      locale: "sl",
      redirectUrl: "https://optimalen-nakup.example/sl/app/billing/success",
    });

    expect(result.checkoutId).toBe("checkout-1");
    expect(providerFetch).toHaveBeenCalledOnce();
  });

  it("uses Resend idempotency and never claims a local email was sent", async () => {
    const providerFetch = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("idempotency-key")).toBe("invite/org-1/member-1");
      return new Response(JSON.stringify({ id: "email-1" }), { status: 200 });
    });
    const resend = new ResendEmailProvider("re_test", providerFetch);
    const sent = await resend.send({
      from: "Optimalen Nakup <noreply@example.test>",
      to: ["member@example.test"],
      subject: "Vabilo",
      text: "Povabljeni ste.",
      idempotencyKey: "invite/org-1/member-1",
    });
    expect(sent).toEqual({ status: "sent", providerMessageId: "email-1" });

    const recorded: string[] = [];
    const local = new LocalEmailProvider((message) => recorded.push(message.subject));
    const localResult = await local.send({
      from: "noreply@example.test",
      to: ["member@example.test"],
      subject: "Local",
      text: "Recorded only",
      idempotencyKey: "local-1",
    });
    expect(localResult).toEqual({ status: "recorded" });
    expect(recorded).toEqual(["Local"]);
    expect(new ClosedBetaBillingProvider().configured).toBe(false);
  });
});
