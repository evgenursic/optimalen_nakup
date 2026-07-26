/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.{js,ts}");
const hash = (character: string) => character.repeat(64);

const confirmedFilter = {
  schemaVersion: 1 as const,
  category: "computers" as const,
  mode: "best_overall" as const,
  query: "Prenosnik za razvoj programske opreme",
  hardRequirementsJson: JSON.stringify([{ field: "ram", operator: "gte", value: 32 }]),
  preferencesJson: "[]",
  exclusionsJson: "[]",
  budgetJson: JSON.stringify({ currency: "EUR", maximum: 2_000 }),
  geographyJson: JSON.stringify({ countries: ["SI"] }),
  acceptableConditionsJson: JSON.stringify(["new"]),
  timingJson: JSON.stringify({ maximumDeliveryDays: 14 }),
  riskTolerance: "low" as const,
  weightsJson: JSON.stringify({
    hardFilterCompliance: 0.2,
    priceCompetitiveness: 0.16,
    qualityFit: 0.16,
    sellerConfidence: 0.1,
    evidenceConfidence: 0.14,
    reliability: 0.08,
    totalCostOfOwnership: 0.08,
    preferenceFit: 0.08,
  }),
  confirmedAt: Date.now(),
};

describe("commercial safeguards", () => {
  it("binds invitations to the normalized verified identity email", async () => {
    const testBackend = convexTest(schema, modules);
    const owner = testBackend.withIdentity({
      subject: "clerk-owner",
      tokenIdentifier: "test|owner",
      email: "owner@example.test",
    });
    await owner.mutation(api.users.syncCurrentUser, {
      displayName: "Owner",
      locale: "sl",
    });
    const organizationId = await owner.mutation(api.organizations.create, {
      name: "Varen prostor",
      slug: "varen-prostor",
    });
    const tokenHash = hash("a");
    await owner.mutation(api.organizations.createInvitation, {
      organizationId,
      email: "Researcher@Example.test",
      emailHash: hash("b"),
      tokenHash,
      role: "researcher",
      expiresAt: Date.now() + 60 * 60 * 1_000,
    });

    await expect(
      owner.mutation(api.organizations.createInvitation, {
        organizationId,
        email: "researcher@example.test",
        emailHash: hash("c"),
        tokenHash: hash("d"),
        role: "researcher",
        expiresAt: Date.now() + 60 * 60 * 1_000,
      }),
    ).rejects.toThrow();

    const wrongIdentity = testBackend.withIdentity({
      subject: "clerk-researcher",
      tokenIdentifier: "test|researcher",
      email: "wrong@example.test",
    });
    await wrongIdentity.mutation(api.users.syncCurrentUser, {
      displayName: "Researcher",
      locale: "sl",
    });
    await expect(
      wrongIdentity.mutation(api.organizations.acceptInvitation, { tokenHash }),
    ).rejects.toThrow();

    const invitedIdentity = testBackend.withIdentity({
      subject: "clerk-researcher",
      tokenIdentifier: "test|researcher",
      email: "researcher@example.test",
    });
    await expect(
      invitedIdentity.mutation(api.organizations.acceptInvitation, { tokenHash }),
    ).resolves.toEqual(organizationId);
  });

  it("deduplicates waitlist email independently of caller-supplied hashes and rate limits", async () => {
    const testBackend = convexTest(schema, modules);
    const rateLimitKey = hash("e");
    const first = await testBackend.mutation(api.public.joinWaitlist, {
      email: "Buyer@Example.test",
      emailHash: hash("f"),
      locale: "sl",
      categories: ["computers"],
      source: "pricing",
      rateLimitKey,
    });
    const duplicate = await testBackend.mutation(api.public.joinWaitlist, {
      email: "buyer@example.test",
      emailHash: hash("1"),
      locale: "en",
      categories: ["vehicles"],
      source: "pricing",
      rateLimitKey,
    });
    expect(first).toEqual({ created: true });
    expect(duplicate).toEqual({ created: false });

    for (let index = 0; index < 3; index += 1) {
      await testBackend.mutation(api.public.joinWaitlist, {
        email: `buyer-${index}@example.test`,
        emailHash: `${index + 2}`.repeat(64),
        locale: "sl",
        categories: [],
        source: "pricing",
        rateLimitKey,
      });
    }
    await expect(
      testBackend.mutation(api.public.joinWaitlist, {
        email: "rate-limited@example.test",
        emailHash: hash("9"),
        locale: "sl",
        categories: [],
        source: "pricing",
        rateLimitKey,
      }),
    ).rejects.toThrow();
  });

  it("applies each signed subscription event exactly once", async () => {
    const testBackend = convexTest(schema, modules);
    const owner = testBackend.withIdentity({
      subject: "clerk-billing-owner",
      tokenIdentifier: "test|billing-owner",
      email: "billing-owner@example.test",
    });
    await owner.mutation(api.users.syncCurrentUser, {
      displayName: "Billing owner",
      locale: "sl",
    });
    const organizationId = await owner.mutation(api.organizations.create, {
      name: "Plačljivi prostor",
      slug: "placljivi-prostor",
    });
    const event = {
      externalEventId: "evt_subscription_1",
      eventType: "subscription_created",
      payloadHash: hash("a"),
      organizationId,
      externalCustomerId: "customer_1",
      externalSubscriptionId: "subscription_1",
      externalVariantId: "variant_pro",
      plan: "pro" as const,
      status: "active",
      receivedAt: Date.now(),
    };

    const applied = await testBackend.mutation(internal.billing.processSubscriptionEvent, event);
    const replayed = await testBackend.mutation(internal.billing.processSubscriptionEvent, event);
    expect(applied).toEqual({ duplicate: false, applied: true });
    expect(replayed).toEqual({ duplicate: true, applied: true });
    await expect(
      testBackend.mutation(internal.billing.processSubscriptionEvent, {
        ...event,
        payloadHash: hash("b"),
      }),
    ).rejects.toThrow();

    const billingContext = await owner.query(api.organizations.billingContext, {
      organizationId,
    });
    expect(billingContext.plan).toBe("pro");
    expect(billingContext.externalCustomerId).toBe("customer_1");
  });
});

describe("worker protocol safeguards", () => {
  it("replays a completed idempotent request and rejects a changed body", async () => {
    const testBackend = convexTest(schema, modules);
    const started = await testBackend.mutation(internal.worker.beginRequest, {
      workerId: "worker-1",
      idempotencyKey: "request-1",
      path: "/worker/events",
      bodyHash: hash("a"),
      now: 1_000,
    });
    expect(started.status).toBe("started");
    if (started.status !== "started") {
      throw new Error("Expected a newly started worker request");
    }
    await testBackend.mutation(internal.worker.completeRequest, {
      requestId: started.requestId,
      responseJson: JSON.stringify({ accepted: true }),
      now: 1_100,
    });

    const replayed = await testBackend.mutation(internal.worker.beginRequest, {
      workerId: "worker-1",
      idempotencyKey: "request-1",
      path: "/worker/events",
      bodyHash: hash("a"),
      now: 1_200,
    });
    const conflict = await testBackend.mutation(internal.worker.beginRequest, {
      workerId: "worker-1",
      idempotencyKey: "request-1",
      path: "/worker/events",
      bodyHash: hash("b"),
      now: 1_200,
    });
    expect(replayed).toEqual({
      status: "replay",
      responseJson: JSON.stringify({ accepted: true }),
    });
    expect(conflict).toEqual({ status: "conflict" });
  });

  it("claims one queued job and requests cancellation at the page budget", async () => {
    const testBackend = convexTest(schema, modules);
    const researcher = testBackend.withIdentity({
      subject: "clerk-worker-owner",
      tokenIdentifier: "test|worker-owner",
      email: "worker-owner@example.test",
    });
    await researcher.mutation(api.users.syncCurrentUser, {
      displayName: "Worker owner",
      locale: "sl",
    });
    const organizationId = await researcher.mutation(api.organizations.create, {
      name: "Worker prostor",
      slug: "worker-prostor",
    });
    const draft = await researcher.mutation(api.research.createDraft, {
      organizationId,
      title: "Razvojni prenosnik",
      originalInput: "Iščem razvojni prenosnik z vsaj 32 GB pomnilnika",
      locale: "sl",
      category: "computers",
      filterSpec: confirmedFilter,
    });
    const jobId = await researcher.mutation(api.research.confirmAndQueue, {
      organizationId,
      researchRequestId: draft.researchRequestId,
      idempotencyKey: "job-worker-test",
      maxPages: 2,
      maxRuntimeSeconds: 300,
      maxAiCostEur: 1,
    });
    const leaseTokenHash = hash("c");
    const now = Date.now() + 1_000;
    const claimed = await testBackend.mutation(internal.worker.claimJob, {
      workerId: "worker-lease-test",
      leaseTokenHash,
      now,
      leaseDurationMs: 30_000,
    });
    expect(claimed?.jobId).toEqual(jobId);

    const heartbeat = await testBackend.mutation(internal.worker.heartbeat, {
      jobId,
      workerId: "worker-lease-test",
      leaseTokenHash,
      now: now + 1_000,
      leaseDurationMs: 30_000,
      stage: "collection",
      progress: 40,
      pagesVisited: 2,
      runtimeSeconds: 10,
      aiCostEur: 0,
      coverageJson: JSON.stringify({ sourcesAttempted: 1, sourcesSuccessful: 1 }),
    });
    expect(heartbeat.cancelRequested).toBe(true);

    const status = await testBackend.query(internal.worker.jobStatus, { jobId });
    expect(status?.state).toBe("running");
    expect(status?.cancelRequested).toBe(true);
  });
});
