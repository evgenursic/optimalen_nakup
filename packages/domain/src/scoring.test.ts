import { describe, expect, it } from "vitest";

import { calculateScore, defaultScoringWeights } from "./index.js";

describe("calculateScore", () => {
  it("returns a transparent weighted score with penalties", () => {
    const score = calculateScore({
      components: {
        hardFilterCompliance: 100,
        priceCompetitiveness: 80,
        qualityFit: 90,
        sellerConfidence: 70,
        evidenceConfidence: 90,
        reliability: 80,
        totalCostOfOwnership: 75,
        preferenceFit: 85,
      },
      weights: defaultScoringWeights,
      penalties: {
        missingData: 2,
        conflict: 1,
        freshness: 0,
      },
      reasons: ["Matches every hard requirement"],
      risks: ["Seller rating is incomplete"],
    });

    expect(score.total).toBe(83);
    expect(score.topReasons).toEqual(["Matches every hard requirement"]);
    expect(score.scoringModelVersion).toBe("transparent-v1");
  });

  it("never returns a negative score", () => {
    const score = calculateScore({
      components: {
        hardFilterCompliance: 0,
        priceCompetitiveness: 0,
        qualityFit: 0,
        sellerConfidence: 0,
        evidenceConfidence: 0,
        reliability: 0,
        totalCostOfOwnership: 0,
        preferenceFit: 0,
      },
      weights: defaultScoringWeights,
      penalties: {
        missingData: 100,
        conflict: 100,
        freshness: 100,
      },
    });

    expect(score.total).toBe(0);
  });
});
