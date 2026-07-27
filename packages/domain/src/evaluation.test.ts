import { describe, expect, it } from "vitest";

import {
  calculateEvaluationMetrics,
  evaluationObservationV1Schema,
  evaluationScenariosV1,
} from "./evaluation.js";

describe("versioned evaluation gate", () => {
  it("contains the ten required, uniquely identified scenarios", () => {
    expect(evaluationScenariosV1).toHaveLength(10);
    expect(new Set(evaluationScenariosV1.map((scenario) => scenario.id)).size).toBe(10);
    expect(evaluationScenariosV1.map((scenario) => scenario.title)).toEqual(
      expect.arrayContaining([
        "BMW X3 with M Sport verification",
        "Conflicting-source evidence",
        "Partial source access",
        "Stale price",
      ]),
    );
  });

  it("computes bounded evidence-first metrics without hiding missed or unsupported facts", () => {
    const first = evaluationObservationV1Schema.parse({
      schemaVersion: 1,
      scenarioId: evaluationScenariosV1[0]?.id,
      expectedAcceptedOfferIds: ["a", "b"],
      actualAcceptedOfferIds: ["a"],
      expectedFields: { price: 100, equipment: "M Sport" },
      actualFields: { price: 100, equipment: "Sport" },
      expectedDuplicateGroups: [["a", "a-other"]],
      actualDuplicateGroups: [
        ["a", "a-other"],
        ["b", "c"],
      ],
      expectedEvidenceFields: ["price", "equipment"],
      supportedEvidenceFields: ["price"],
      materialClaimCount: 4,
      unsupportedMaterialClaimCount: 1,
      completed: true,
      latencyMs: 1_000,
      costEur: 0.2,
      rankings: [
        ["a", "b"],
        ["a", "b"],
        ["b", "a"],
      ],
    });
    const second = evaluationObservationV1Schema.parse({
      ...first,
      scenarioId: evaluationScenariosV1[1]?.id,
      expectedAcceptedOfferIds: ["c"],
      actualAcceptedOfferIds: ["c"],
      expectedFields: { price: 200 },
      actualFields: { price: 200 },
      expectedDuplicateGroups: [],
      actualDuplicateGroups: [],
      expectedEvidenceFields: ["price"],
      supportedEvidenceFields: ["price"],
      materialClaimCount: 2,
      unsupportedMaterialClaimCount: 0,
      completed: false,
      latencyMs: 3_000,
      costEur: 0.4,
      rankings: [["c"], ["c"]],
    });

    expect(calculateEvaluationMetrics([first, second])).toEqual({
      schemaVersion: 1,
      scenarioCount: 2,
      hardFilterRecall: 0.6667,
      fieldExtractionAccuracy: 0.6667,
      duplicatePrecision: 0.5,
      duplicateRecall: 1,
      evidenceCoverage: 0.6667,
      unsupportedClaimRate: 0.1667,
      recommendationConsistency: 0.8333,
      completionRate: 0.5,
      medianLatencyMs: 2_000,
      meanCostEur: 0.3,
    });
  });
});
