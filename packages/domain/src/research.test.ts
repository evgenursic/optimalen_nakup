import { describe, expect, it } from "vitest";

import {
  defaultScoringWeights,
  evidenceRecordV1Schema,
  filterSpecV1Schema,
  offerV1Schema,
} from "./index.js";
import {
  detectEvidenceConflicts,
  estimateTotalCostOfOwnership,
  evaluateOfferAgainstFilter,
  rankOffers,
} from "./research.js";

const offer = offerV1Schema.parse({
  schemaVersion: 1,
  sourceId: "fixture",
  sourceOfferId: "1",
  canonicalUrl: "https://example.com/products/1",
  title: "Prenosnik Primer",
  category: "computers",
  offerType: "product",
  providerName: "Primer",
  sellerName: "Prodajalec",
  basePrice: { amount: 1_200, currency: "EUR" },
  recurringPrice: null,
  tax: null,
  shipping: null,
  installation: null,
  mandatoryFees: null,
  totalInitialCost: { amount: 1_200, currency: "EUR" },
  estimatedTotalCost: { amount: 1_200, currency: "EUR" },
  location: "Ljubljana",
  availability: "in_stock",
  deliveryOrStartDate: null,
  warranty: "24 mesecev",
  collectedAt: "2026-07-26T12:00:00.000Z",
  staleAfter: "2099-07-27T12:00:00.000Z",
  attributes: { ramGb: 32, condition: "new", sku: "TEST-1" },
});

const filter = filterSpecV1Schema.parse({
  schemaVersion: 1,
  category: "computers",
  mode: "best_overall",
  query: "Prenosnik z 32 GB",
  hardRequirements: [{ field: "ramGb", operator: "gte", value: 32, label: "Vsaj 32 GB RAM" }],
  preferences: [],
  exclusions: [],
  budget: {
    currency: "EUR",
    minimum: null,
    maximum: 1_500,
    includeRecurringMonths: 0,
  },
  geography: { countries: ["SI"], maximumDistanceKm: null, origin: null },
  acceptableConditions: ["new"],
  timing: { neededBy: null, maximumDeliveryDays: null },
  riskTolerance: "low",
  weights: defaultScoringWeights,
  confirmedAt: "2026-07-26T12:00:00.000Z",
});

const evidence = evidenceRecordV1Schema.parse({
  schemaVersion: 1,
  offerSourceId: "fixture",
  field: "basePrice",
  sourceUrl: offer.canonicalUrl,
  sourceName: "Fixture",
  collectedAt: offer.collectedAt,
  status: "verified",
  confidence: 1,
  method: "json_ld",
  excerpt: "1200 EUR",
  contentHash: "a".repeat(64),
  staleAt: offer.staleAfter,
});

describe("deterministic research decisions", () => {
  it("rejects unknown hard requirements instead of guessing", () => {
    expect(evaluateOfferAgainstFilter(offer, filter).accepted).toBe(true);
    expect(
      evaluateOfferAgainstFilter({ ...offer, attributes: { condition: "new" } }, filter).accepted,
    ).toBe(false);
  });

  it("ranks only hard-filter-compliant offers with visible components", () => {
    const ranked = rankOffers(
      [
        { offer, evidence: [evidence] },
        {
          offer: {
            ...offer,
            sourceOfferId: "2",
            title: "Premalo pomnilnika",
            attributes: { ramGb: 16, condition: "new" },
          },
          evidence: [evidence],
        },
      ],
      filter,
    );
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.score.components.hardFilterCompliance).toBe(100);
  });

  it("marks contradictory evidence for the same product", () => {
    const conflicts = detectEvidenceConflicts([
      { offer, evidence: [evidence] },
      {
        offer: { ...offer, sourceId: "other", sourceOfferId: "2" },
        evidence: [{ ...evidence, sourceName: "Other", excerpt: "1250 EUR" }],
      },
    ]);
    expect(conflicts.every((bundle) => bundle.evidence[0]?.status === "conflicting")).toBe(true);
  });

  it("returns explicit missing TCO inputs instead of hidden assumptions", () => {
    const whiteGood = {
      ...offer,
      category: "white_goods" as const,
      attributes: { annualEnergyKwh: 150 },
    };
    expect(
      estimateTotalCostOfOwnership(whiteGood, {
        horizonMonths: 60,
        electricityPriceEurPerKwh: 0.2,
      }),
    ).toMatchObject({ totalEur: 1_350, missingInputs: [] });
    expect(estimateTotalCostOfOwnership(whiteGood, { horizonMonths: 60 })).toMatchObject({
      totalEur: 1_200,
      missingInputs: expect.arrayContaining(["electricityPriceEurPerKwh"]),
    });
  });
});
