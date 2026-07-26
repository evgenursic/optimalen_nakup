/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.{js,ts}");

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

describe("tenant isolation and authorization", () => {
  it("prevents one tenant from writing into another tenant", async () => {
    const testBackend = convexTest(schema, modules);
    const alice = testBackend.withIdentity({
      subject: "clerk-alice",
      tokenIdentifier: "test|alice",
    });
    const bob = testBackend.withIdentity({
      subject: "clerk-bob",
      tokenIdentifier: "test|bob",
    });

    await alice.mutation(api.users.syncCurrentUser, {
      displayName: "Alice",
      locale: "sl",
    });
    await bob.mutation(api.users.syncCurrentUser, {
      displayName: "Bob",
      locale: "sl",
    });
    const aliceOrganizationId = await alice.mutation(api.organizations.create, {
      name: "Alice raziskave",
      slug: "alice-raziskave",
    });
    const bobOrganizationId = await bob.mutation(api.organizations.create, {
      name: "Bob raziskave",
      slug: "bob-raziskave",
    });

    await expect(
      alice.mutation(api.research.createDraft, {
        organizationId: bobOrganizationId,
        title: "Nedovoljen vpis",
        originalInput: "To ne sme biti shranjeno v Bobovem prostoru",
        locale: "sl",
        category: "computers",
        filterSpec: confirmedFilter,
      }),
    ).rejects.toThrow();

    const aliceDraft = await alice.mutation(api.research.createDraft, {
      organizationId: aliceOrganizationId,
      title: "Razvojni prenosnik",
      originalInput: "Iščem hiter prenosnik z vsaj 32 GB RAM",
      locale: "sl",
      category: "computers",
      filterSpec: confirmedFilter,
    });
    expect(aliceDraft.researchRequestId).toBeTruthy();

    const bobJobs = await bob.query(api.research.listJobs, {
      organizationId: bobOrganizationId,
      paginationOpts: { cursor: null, numItems: 20 },
    });
    expect(bobJobs.items).toEqual([]);
  });

  it("requires authentication for organization data", async () => {
    const testBackend = convexTest(schema, modules);
    await expect(testBackend.query(api.organizations.listMine, {})).rejects.toThrow();
  });
});
