/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.{js,ts}");

const confirmedFilter = {
  schemaVersion: 1 as const,
  category: "computers" as const,
  mode: "best_overall" as const,
  query: "Prenosnik za razvoj programske opreme",
  hardRequirementsJson: "[]",
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

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("authenticated application experience", () => {
  it("persists intake model usage exactly once and includes it in the account export", async () => {
    vi.stubEnv("AI_COST_INGEST_SECRET", "a".repeat(32));
    const testBackend = convexTest(schema, modules);
    const owner = testBackend.withIdentity({
      subject: "clerk-experience-owner",
      tokenIdentifier: "test|experience-owner",
      email: "experience-owner@example.test",
    });
    await owner.mutation(api.users.syncCurrentUser, {
      displayName: "Experience owner",
      locale: "sl",
    });
    const organizationId = await owner.mutation(api.organizations.create, {
      name: "Experience workspace",
      slug: "experience-workspace",
    });
    const cost = {
      organizationId,
      model: "gpt-5.6-luna",
      inputTokens: 800,
      cachedInputTokens: 100,
      cacheWriteTokens: 0,
      outputTokens: 120,
      reasoningTokens: 0,
      estimatedCostUsd: 0.00142,
      estimatedCostEur: 0.001207,
      usdToEurRate: 0.85,
      pricingVersion: "openai-model-catalog-2026-07-26",
      requestId: "resp_filter_1",
      ingestSecret: "a".repeat(32),
    };
    await expect(owner.mutation(api.research.recordIntakeModelCost, cost)).resolves.toBe(true);
    await expect(owner.mutation(api.research.recordIntakeModelCost, cost)).resolves.toBe(false);

    const stored = await testBackend.run(async (ctx) => ({
      costs: await ctx.db.query("modelCosts").collect(),
      usage: await ctx.db.query("usageLedger").collect(),
    }));
    expect(stored.costs).toHaveLength(1);
    expect(stored.usage).toHaveLength(2);

    const exported = JSON.parse(await owner.query(api.users.exportMyData, {})) as {
      account: { primaryEmail?: string };
      workspaces: unknown[];
    };
    expect(exported.account.primaryEmail).toBe("experience-owner@example.test");
    expect(exported.workspaces).toHaveLength(1);
  });

  it("keeps pins tenant-bound and private to the current user", async () => {
    const testBackend = convexTest(schema, modules);
    const owner = testBackend.withIdentity({
      subject: "clerk-pin-owner",
      tokenIdentifier: "test|pin-owner",
      email: "pin-owner@example.test",
    });
    await owner.mutation(api.users.syncCurrentUser, { displayName: "Pin owner", locale: "sl" });
    const organizationId = await owner.mutation(api.organizations.create, {
      name: "Pin workspace",
      slug: "pin-workspace",
    });
    const draft = await owner.mutation(api.research.createDraft, {
      organizationId,
      title: "Pinned laptop",
      originalInput: "Find a laptop worth pinning",
      locale: "en",
      category: "computers",
      filterSpec: confirmedFilter,
    });
    const jobId = await owner.mutation(api.research.confirmAndQueue, {
      organizationId,
      researchRequestId: draft.researchRequestId,
      idempotencyKey: "pin-job",
      maxPages: 20,
      maxRuntimeSeconds: 300,
      maxAiCostEur: 1,
    });
    const offerId = await testBackend.run(async (ctx) => {
      const now = Date.now();
      return await ctx.db.insert("offers", {
        organizationId,
        researchJobId: jobId,
        schemaVersion: 1,
        sourceId: "fixture",
        sourceOfferId: "fixture-1",
        identityKey: "fixture:laptop",
        canonicalUrl: "https://example.test/laptop",
        title: "Fixture laptop",
        category: "computers",
        offerType: "product",
        providerName: "Fixture",
        sellerName: "Fixture",
        basePrice: { amount: 1_500, currency: "EUR" },
        recurringPrice: null,
        totalInitialCost: { amount: 1_500, currency: "EUR" },
        estimatedTotalCost: { amount: 1_500, currency: "EUR" },
        location: "SI",
        availability: "in_stock",
        warranty: "24 months",
        attributesJson: JSON.stringify({ ramGb: 32 }),
        collectedAt: now,
        staleAfter: now + 86_400_000,
        currentVersion: 1,
        createdAt: now,
        updatedAt: now,
      });
    });
    await owner.mutation(api.research.setOfferPinned, {
      organizationId,
      jobId,
      offerId,
      pinned: true,
    });
    await expect(
      owner.query(api.research.listPinnedOffers, { organizationId, jobId }),
    ).resolves.toEqual([offerId]);
    await owner.mutation(api.research.setOfferPinned, {
      organizationId,
      jobId,
      offerId,
      pinned: false,
    });
    await expect(
      owner.query(api.research.listPinnedOffers, { organizationId, jobId }),
    ).resolves.toEqual([]);

    const outsider = testBackend.withIdentity({
      subject: "clerk-pin-outsider",
      tokenIdentifier: "test|pin-outsider",
    });
    await outsider.mutation(api.users.syncCurrentUser, { locale: "en" });
    await expect(
      outsider.mutation(api.research.setOfferPinned, {
        organizationId,
        jobId,
        offerId,
        pinned: true,
      }),
    ).rejects.toThrow();
  });

  it("queues due monitoring, deduplicates completion alerts, and never claims unsent email", async () => {
    const testBackend = convexTest(schema, modules);
    const owner = testBackend.withIdentity({
      subject: "clerk-monitor-owner",
      tokenIdentifier: "test|monitor-owner",
      email: "monitor-owner@example.test",
    });
    await owner.mutation(api.users.syncCurrentUser, { displayName: "Monitor owner", locale: "en" });
    const organizationId = await owner.mutation(api.organizations.create, {
      name: "Monitor workspace",
      slug: "monitor-workspace",
    });
    const draft = await owner.mutation(api.research.createDraft, {
      organizationId,
      title: "Monitored laptop",
      originalInput: "Monitor suitable development laptops",
      locale: "en",
      category: "computers",
      filterSpec: confirmedFilter,
    });
    const jobId = await owner.mutation(api.research.confirmAndQueue, {
      organizationId,
      researchRequestId: draft.researchRequestId,
      idempotencyKey: "monitor-initial-job",
      maxPages: 20,
      maxRuntimeSeconds: 300,
      maxAiCostEur: 1,
    });
    const savedSearchId = await owner.mutation(api.research.saveSearch, {
      organizationId,
      researchRequestId: draft.researchRequestId,
      name: "Development laptop watch",
    });
    await owner.mutation(api.research.configureSavedSearch, {
      organizationId,
      savedSearchId,
      active: true,
      emailEnabled: true,
      monitoringIntervalHours: 24,
    });

    const now = Date.now();
    const leaseTokenHash = "f".repeat(64);
    await testBackend.mutation(internal.worker.claimJob, {
      workerId: "monitor-worker",
      leaseTokenHash,
      now,
      leaseDurationMs: 30_000,
    });
    await testBackend.mutation(internal.worker.complete, {
      jobId,
      workerId: "monitor-worker",
      leaseTokenHash,
      now: now + 1_000,
      partial: false,
      coverageJson: JSON.stringify({ sourcesAttempted: 1, sourcesSuccessful: 1 }),
    });
    const alerts = await owner.query(api.research.listAlerts, { organizationId });
    expect(alerts.map((alert) => [alert.channel, alert.state])).toEqual(
      expect.arrayContaining([
        ["in_app", "sent"],
        ["email", "pending"],
      ]),
    );

    const dispatch = await testBackend.action(internal.alerts.dispatchPendingEmailAlerts, {});
    expect(dispatch).toEqual({ sent: 0, failed: 0, skipped: 1 });
    const afterDispatch = await owner.query(api.research.listAlerts, { organizationId });
    expect(afterDispatch.find((alert) => alert.channel === "email")?.state).toBe("skipped");

    await testBackend.run(async (ctx) => {
      await ctx.db.patch(jobId, { createdAt: now - 25 * 60 * 60 * 1_000 });
      await ctx.db.patch(savedSearchId, {
        lastScheduledAt: now - 25 * 60 * 60 * 1_000,
      });
    });
    const monitoring = await testBackend.mutation(internal.monitoring.queueDueSavedSearches, {});
    expect(monitoring.queued).toBe(1);
    const jobs = await owner.query(api.research.listJobs, {
      organizationId,
      paginationOpts: { cursor: null, numItems: 20 },
    });
    expect(jobs.page).toHaveLength(2);
  });

  it("publishes only valid configured EUR pricing and protects operator settings", async () => {
    const testBackend = convexTest(schema, modules);
    await expect(testBackend.query(api.public.getPublicPricing, {})).resolves.toBeNull();
    await testBackend.run(async (ctx) => {
      await ctx.db.insert("applicationSettings", {
        key: "billing.publicPricing",
        valueJson: JSON.stringify({
          currency: "EUR",
          starter: { monthly: 19, annual: 190 },
          pro: { monthly: 49, annual: 490 },
          business: { monthly: 129, annual: 1290 },
        }),
        sensitive: false,
        updatedAt: Date.now(),
      });
    });
    const pricing = await testBackend.query(api.public.getPublicPricing, {});
    expect(pricing?.pro.monthly).toBe(49);

    const operator = testBackend.withIdentity({
      subject: "clerk-platform-operator",
      tokenIdentifier: "test|platform-operator",
    });
    await operator.mutation(api.users.syncCurrentUser, { locale: "en" });
    await expect(operator.query(api.admin.isPlatformAdmin, {})).resolves.toBe(false);
    await expect(
      operator.mutation(api.admin.setApplicationSetting, {
        key: "worker.killSwitch",
        valueJson: "true",
      }),
    ).rejects.toThrow();

    vi.stubEnv("PLATFORM_ADMIN_CLERK_USER_IDS", "clerk-platform-operator");
    await expect(operator.query(api.admin.isPlatformAdmin, {})).resolves.toBe(true);
    await expect(
      operator.mutation(api.admin.setApplicationSetting, {
        key: "worker.killSwitch",
        valueJson: "true",
      }),
    ).resolves.toBeTruthy();
  });

  it("blocks deletion for the last owner and anonymizes an eligible account", async () => {
    vi.stubEnv("ACCOUNT_DELETION_INGEST_SECRET", "d".repeat(32));
    const testBackend = convexTest(schema, modules);
    const owner = testBackend.withIdentity({
      subject: "clerk-delete-owner",
      tokenIdentifier: "test|delete-owner",
      email: "delete-owner@example.test",
    });
    await owner.mutation(api.users.syncCurrentUser, { displayName: "Delete owner", locale: "en" });
    await owner.mutation(api.organizations.create, {
      name: "Owned workspace",
      slug: "owned-workspace",
    });
    await expect(owner.mutation(api.users.requestAccountDeletion, {})).rejects.toThrow();

    const eligible = testBackend.withIdentity({
      subject: "clerk-delete-eligible",
      tokenIdentifier: "test|delete-eligible",
      email: "delete-eligible@example.test",
    });
    await eligible.mutation(api.users.syncCurrentUser, {
      displayName: "Eligible account",
      locale: "en",
    });
    await eligible.mutation(api.users.requestAccountDeletion, {});
    await testBackend.mutation(api.users.finalizeAccountDeletion, {
      clerkUserId: "clerk-delete-eligible",
      ingestSecret: "d".repeat(32),
    });
    await expect(eligible.query(api.users.me, {})).resolves.toBeNull();
    const deletedUser = await testBackend.run(async (ctx) => {
      const users = await ctx.db.query("users").collect();
      return users.find((user) => user.status === "deleted");
    });
    expect(deletedUser?.status).toBe("deleted");
    expect(deletedUser).not.toHaveProperty("primaryEmail");
    expect(deletedUser).not.toHaveProperty("displayName");
    expect(deletedUser?.clerkUserId.startsWith("deleted:")).toBe(true);
  });
});
