import { z } from "zod";

export const evaluationScenarioV1Schema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^eval-[0-9]{2}-[a-z0-9-]+$/),
  title: z.string().min(1).max(200),
  category: z.enum(["vehicles", "computers", "white_goods", "services"]),
  focus: z
    .array(
      z.enum([
        "intake",
        "hard_filters",
        "extraction",
        "deduplication",
        "evidence",
        "conflicts",
        "partial_coverage",
        "freshness",
        "scoring",
        "unsupported_claims",
      ]),
    )
    .min(1),
  materialFields: z.array(z.string().min(1).max(120)).min(1),
  expectedBehaviour: z.string().min(1).max(500),
});
export type EvaluationScenarioV1 = z.infer<typeof evaluationScenarioV1Schema>;

export const evaluationScenariosV1 = evaluationScenarioV1Schema
  .array()
  .length(10)
  .parse([
    {
      schemaVersion: 1,
      id: "eval-01-bmw-estate-equipment",
      title: "BMW estate car with equipment verification",
      category: "vehicles",
      focus: ["hard_filters", "extraction", "evidence"],
      materialFields: ["bodyStyle", "equipment", "totalInitialCost"],
      expectedBehaviour: "Reject non-estates and expose direct evidence for every required option.",
    },
    {
      schemaVersion: 1,
      id: "eval-02-bmw-x3-m-sport",
      title: "BMW X3 with M Sport verification",
      category: "vehicles",
      focus: ["hard_filters", "extraction", "evidence"],
      materialFields: ["model", "mSport", "mileageKm", "warranty"],
      expectedBehaviour: "Accept M Sport only when the detail-page evidence supports the claim.",
    },
    {
      schemaVersion: 1,
      id: "eval-03-laptop-sku-delivered-price",
      title: "Laptop SKU and delivered-price comparison",
      category: "computers",
      focus: ["extraction", "deduplication", "scoring"],
      materialFields: ["sku", "ramGb", "storageGb", "totalInitialCost"],
      expectedBehaviour:
        "Merge identical SKUs and rank by verified delivered cost, not sticker price.",
    },
    {
      schemaVersion: 1,
      id: "eval-04-washing-machine-energy-installation",
      title: "Washing machine energy and installation costs",
      category: "white_goods",
      focus: ["extraction", "scoring", "evidence"],
      materialFields: ["annualEnergyKwh", "installation", "estimatedTotalCost"],
      expectedBehaviour: "Show the TCO assumptions and mark missing energy or installation inputs.",
    },
    {
      schemaVersion: 1,
      id: "eval-05-ambiguous-intake",
      title: "Ambiguous natural-language request",
      category: "computers",
      focus: ["intake", "hard_filters", "unsupported_claims"],
      materialFields: ["budget", "condition", "primaryUse"],
      expectedBehaviour: "Request confirmation instead of inventing material constraints.",
    },
    {
      schemaVersion: 1,
      id: "eval-06-service-provider",
      title: "Service-provider comparison",
      category: "services",
      focus: ["hard_filters", "extraction", "evidence"],
      materialFields: ["mandatoryFees", "recurringPrice", "availability"],
      expectedBehaviour: "Apply the same evidence contract without assuming product-only fields.",
    },
    {
      schemaVersion: 1,
      id: "eval-07-conflicting-sources",
      title: "Conflicting-source evidence",
      category: "computers",
      focus: ["conflicts", "evidence", "unsupported_claims"],
      materialFields: ["totalInitialCost", "availability"],
      expectedBehaviour: "Mark contradictory material fields as conflicting and reduce confidence.",
    },
    {
      schemaVersion: 1,
      id: "eval-08-partial-source-access",
      title: "Partial source access",
      category: "white_goods",
      focus: ["partial_coverage", "evidence", "unsupported_claims"],
      materialFields: ["coverage", "availability", "totalInitialCost"],
      expectedBehaviour: "Preserve partial results and report numerical source/page coverage.",
    },
    {
      schemaVersion: 1,
      id: "eval-09-cross-source-duplicate",
      title: "Duplicate cross-source listing",
      category: "vehicles",
      focus: ["deduplication", "evidence", "scoring"],
      materialFields: ["sourceOfferId", "vinHash", "mileageKm", "totalInitialCost"],
      expectedBehaviour: "Group the same vehicle without discarding source-specific evidence.",
    },
    {
      schemaVersion: 1,
      id: "eval-10-stale-price",
      title: "Stale price",
      category: "computers",
      focus: ["freshness", "scoring", "evidence"],
      materialFields: ["totalInitialCost", "collectedAt", "staleAfter"],
      expectedBehaviour: "Apply a visible freshness penalty and never call a stale price verified.",
    },
  ]);

const comparableValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const evaluationObservationV1Schema = z.object({
  schemaVersion: z.literal(1),
  scenarioId: z.string(),
  expectedAcceptedOfferIds: z.array(z.string()),
  actualAcceptedOfferIds: z.array(z.string()),
  expectedFields: z.record(z.string(), comparableValueSchema),
  actualFields: z.record(z.string(), comparableValueSchema),
  expectedDuplicateGroups: z.array(z.array(z.string()).min(2)),
  actualDuplicateGroups: z.array(z.array(z.string()).min(2)),
  expectedEvidenceFields: z.array(z.string()),
  supportedEvidenceFields: z.array(z.string()),
  materialClaimCount: z.number().int().nonnegative(),
  unsupportedMaterialClaimCount: z.number().int().nonnegative(),
  completed: z.boolean(),
  latencyMs: z.number().nonnegative(),
  costEur: z.number().nonnegative(),
  rankings: z.array(z.array(z.string())).min(1),
});
export type EvaluationObservationV1 = z.infer<typeof evaluationObservationV1Schema>;

export interface EvaluationMetricsV1 {
  schemaVersion: 1;
  scenarioCount: number;
  hardFilterRecall: number;
  fieldExtractionAccuracy: number;
  duplicatePrecision: number;
  duplicateRecall: number;
  evidenceCoverage: number;
  unsupportedClaimRate: number;
  recommendationConsistency: number;
  completionRate: number;
  medianLatencyMs: number;
  meanCostEur: number;
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 1 : numerator / denominator;
}

function rounded(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function normalizedPairs(groups: string[][]): Set<string> {
  const pairs = new Set<string>();
  for (const group of groups) {
    const unique = [...new Set(group)].sort();
    for (let left = 0; left < unique.length; left += 1) {
      for (let right = left + 1; right < unique.length; right += 1) {
        pairs.add(`${unique[left]}\u0000${unique[right]}`);
      }
    }
  }
  return pairs;
}

function intersectCount(left: Set<string>, right: Set<string>): number {
  let count = 0;
  for (const value of left) {
    if (right.has(value)) count += 1;
  }
  return count;
}

function rankingConsistency(rankings: string[][]): number {
  if (rankings.length <= 1) return 1;
  const topChoices = rankings.map((ranking) => ranking[0]).filter((value) => value !== undefined);
  if (topChoices.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const choice of topChoices) counts.set(choice, (counts.get(choice) ?? 0) + 1);
  return Math.max(...counts.values()) / topChoices.length;
}

export function calculateEvaluationMetrics(
  rawObservations: EvaluationObservationV1[],
): EvaluationMetricsV1 {
  const observations = evaluationObservationV1Schema.array().parse(rawObservations);
  if (observations.length === 0) {
    throw new Error("At least one evaluation observation is required.");
  }

  let expectedAccepted = 0;
  let recalledAccepted = 0;
  let expectedFields = 0;
  let correctFields = 0;
  let expectedEvidence = 0;
  let supportedEvidence = 0;
  let materialClaims = 0;
  let unsupportedClaims = 0;
  let expectedDuplicatePairs = 0;
  let actualDuplicatePairs = 0;
  let correctDuplicatePairs = 0;

  for (const observation of observations) {
    const expectedOffers = new Set(observation.expectedAcceptedOfferIds);
    const actualOffers = new Set(observation.actualAcceptedOfferIds);
    expectedAccepted += expectedOffers.size;
    recalledAccepted += intersectCount(expectedOffers, actualOffers);

    for (const [field, expected] of Object.entries(observation.expectedFields)) {
      expectedFields += 1;
      if (
        Object.hasOwn(observation.actualFields, field) &&
        observation.actualFields[field] === expected
      ) {
        correctFields += 1;
      }
    }

    const expectedEvidenceSet = new Set(observation.expectedEvidenceFields);
    const supportedEvidenceSet = new Set(observation.supportedEvidenceFields);
    expectedEvidence += expectedEvidenceSet.size;
    supportedEvidence += intersectCount(expectedEvidenceSet, supportedEvidenceSet);
    materialClaims += observation.materialClaimCount;
    unsupportedClaims += observation.unsupportedMaterialClaimCount;

    const expectedPairs = normalizedPairs(observation.expectedDuplicateGroups);
    const actualPairs = normalizedPairs(observation.actualDuplicateGroups);
    expectedDuplicatePairs += expectedPairs.size;
    actualDuplicatePairs += actualPairs.size;
    correctDuplicatePairs += intersectCount(expectedPairs, actualPairs);
  }

  const sortedLatency = observations.map((item) => item.latencyMs).sort((a, b) => a - b);
  const middle = Math.floor(sortedLatency.length / 2);
  const medianLatency =
    sortedLatency.length % 2 === 0
      ? ((sortedLatency[middle - 1] ?? 0) + (sortedLatency[middle] ?? 0)) / 2
      : (sortedLatency[middle] ?? 0);

  return {
    schemaVersion: 1,
    scenarioCount: observations.length,
    hardFilterRecall: rounded(ratio(recalledAccepted, expectedAccepted)),
    fieldExtractionAccuracy: rounded(ratio(correctFields, expectedFields)),
    duplicatePrecision: rounded(ratio(correctDuplicatePairs, actualDuplicatePairs)),
    duplicateRecall: rounded(ratio(correctDuplicatePairs, expectedDuplicatePairs)),
    evidenceCoverage: rounded(ratio(supportedEvidence, expectedEvidence)),
    unsupportedClaimRate: rounded(ratio(unsupportedClaims, materialClaims)),
    recommendationConsistency: rounded(
      observations.reduce((sum, item) => sum + rankingConsistency(item.rankings), 0) /
        observations.length,
    ),
    completionRate: rounded(
      observations.filter((observation) => observation.completed).length / observations.length,
    ),
    medianLatencyMs: rounded(medianLatency),
    meanCostEur: rounded(
      observations.reduce((sum, observation) => sum + observation.costEur, 0) / observations.length,
    ),
  };
}
