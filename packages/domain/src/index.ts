import { z } from "zod";

export const localeSchema = z.enum(["sl", "en"]);
export type Locale = z.infer<typeof localeSchema>;

export const categorySchema = z.enum(["vehicles", "computers", "white_goods", "services"]);
export type Category = z.infer<typeof categorySchema>;

export const verificationStatusSchema = z.enum([
  "verified",
  "inferred",
  "secondary",
  "missing",
  "conflicting",
]);
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;

export const extractionMethodSchema = z.enum([
  "api",
  "feed",
  "json_ld",
  "dom",
  "browser",
  "ai_structured",
  "user_supplied",
]);
export type ExtractionMethod = z.infer<typeof extractionMethodSchema>;

export const researchStageSchema = z.enum([
  "intake",
  "clarification",
  "filter_confirmation",
  "research_plan",
  "source_discovery",
  "collection",
  "detail_verification",
  "normalization",
  "duplicate_resolution",
  "conflict_detection",
  "scoring",
  "evidence_validation",
  "final_report",
  "monitoring",
]);
export type ResearchStage = z.infer<typeof researchStageSchema>;

export const researchJobStateSchema = z.enum([
  "draft",
  "queued",
  "running",
  "completed",
  "completed_partial",
  "cancel_requested",
  "cancelled",
  "failed",
  "dead_letter",
]);
export type ResearchJobState = z.infer<typeof researchJobStateSchema>;

export const recommendationModeSchema = z.enum([
  "best_overall",
  "best_value",
  "lowest_verified_price",
  "premium",
  "lowest_risk",
  "long_term_value",
  "lowest_tco",
  "most_reliable",
  "environmental",
  "fastest_available",
  "closest_match",
]);
export type RecommendationMode = z.infer<typeof recommendationModeSchema>;

export const requirementSchema = z.object({
  field: z.string().min(1).max(120),
  operator: z.enum([
    "equals",
    "not_equals",
    "contains",
    "not_contains",
    "gte",
    "lte",
    "between",
    "in",
  ]),
  value: z.union([
    z.string().max(500),
    z.number(),
    z.boolean(),
    z.array(z.string().max(200)).max(100),
    z.tuple([z.number(), z.number()]),
  ]),
  label: z.string().min(1).max(200),
});
export type Requirement = z.infer<typeof requirementSchema>;

export const scoringWeightsSchema = z
  .object({
    hardFilterCompliance: z.number().min(0).max(1),
    priceCompetitiveness: z.number().min(0).max(1),
    qualityFit: z.number().min(0).max(1),
    sellerConfidence: z.number().min(0).max(1),
    evidenceConfidence: z.number().min(0).max(1),
    reliability: z.number().min(0).max(1),
    totalCostOfOwnership: z.number().min(0).max(1),
    preferenceFit: z.number().min(0).max(1),
  })
  .superRefine((weights, context) => {
    const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
    if (Math.abs(total - 1) > 0.001) {
      context.addIssue({
        code: "custom",
        message: "Scoring weights must add up to 1",
      });
    }
  });
export type ScoringWeights = z.infer<typeof scoringWeightsSchema>;

export const defaultScoringWeights: ScoringWeights = {
  hardFilterCompliance: 0.2,
  priceCompetitiveness: 0.16,
  qualityFit: 0.16,
  sellerConfidence: 0.1,
  evidenceConfidence: 0.14,
  reliability: 0.08,
  totalCostOfOwnership: 0.08,
  preferenceFit: 0.08,
};

export const filterSpecV1Schema = z.object({
  schemaVersion: z.literal(1),
  category: categorySchema,
  mode: recommendationModeSchema,
  query: z.string().min(3).max(4_000),
  hardRequirements: z.array(requirementSchema).max(100),
  preferences: z.array(requirementSchema).max(100),
  exclusions: z.array(requirementSchema).max(100),
  budget: z
    .object({
      currency: z.string().length(3),
      minimum: z.number().nonnegative().nullable(),
      maximum: z.number().positive().nullable(),
      includeRecurringMonths: z.number().int().min(0).max(120),
    })
    .nullable(),
  geography: z.object({
    countries: z.array(z.string().length(2)).min(1).max(30),
    maximumDistanceKm: z.number().nonnegative().max(5_000).nullable(),
    origin: z.string().max(300).nullable(),
  }),
  acceptableConditions: z.array(z.enum(["new", "used", "refurbished", "demo"])).min(1),
  timing: z.object({
    neededBy: z.string().datetime().nullable(),
    maximumDeliveryDays: z.number().int().nonnegative().max(365).nullable(),
  }),
  riskTolerance: z.enum(["low", "medium", "high"]),
  weights: scoringWeightsSchema,
  confirmedAt: z.string().datetime().nullable(),
});
export type FilterSpecV1 = z.infer<typeof filterSpecV1Schema>;

export const moneySchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().length(3),
});
export type Money = z.infer<typeof moneySchema>;

export const offerV1Schema = z.object({
  schemaVersion: z.literal(1),
  sourceId: z.string().min(1).max(120),
  sourceOfferId: z.string().min(1).max(300),
  canonicalUrl: z.url(),
  title: z.string().min(1).max(500),
  category: categorySchema,
  offerType: z.enum(["product", "vehicle", "service", "subscription"]),
  providerName: z.string().max(300).nullable(),
  sellerName: z.string().max(300).nullable(),
  basePrice: moneySchema.nullable(),
  recurringPrice: moneySchema.nullable(),
  tax: moneySchema.nullable(),
  shipping: moneySchema.nullable(),
  installation: moneySchema.nullable(),
  mandatoryFees: moneySchema.nullable(),
  totalInitialCost: moneySchema.nullable(),
  estimatedTotalCost: moneySchema.nullable(),
  location: z.string().max(500).nullable(),
  availability: z.enum(["in_stock", "limited", "preorder", "unavailable", "unknown"]),
  deliveryOrStartDate: z.string().datetime().nullable(),
  warranty: z.string().max(1_000).nullable(),
  collectedAt: z.string().datetime(),
  staleAfter: z.string().datetime(),
  attributes: z.record(z.string().max(120), z.unknown()),
});
export type OfferV1 = z.infer<typeof offerV1Schema>;

export const evidenceRecordV1Schema = z.object({
  schemaVersion: z.literal(1),
  offerSourceId: z.string().min(1).max(120),
  field: z.string().min(1).max(120),
  sourceUrl: z.url(),
  sourceName: z.string().min(1).max(300),
  collectedAt: z.string().datetime(),
  status: verificationStatusSchema,
  confidence: z.number().min(0).max(1),
  method: extractionMethodSchema,
  excerpt: z.string().max(500).nullable(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  staleAt: z.string().datetime(),
});
export type EvidenceRecordV1 = z.infer<typeof evidenceRecordV1Schema>;

export const scoreComponentsSchema = z.object({
  hardFilterCompliance: z.number().min(0).max(100),
  priceCompetitiveness: z.number().min(0).max(100),
  qualityFit: z.number().min(0).max(100),
  sellerConfidence: z.number().min(0).max(100),
  evidenceConfidence: z.number().min(0).max(100),
  reliability: z.number().min(0).max(100),
  totalCostOfOwnership: z.number().min(0).max(100),
  preferenceFit: z.number().min(0).max(100),
});
export type ScoreComponents = z.infer<typeof scoreComponentsSchema>;

export const scoreBreakdownV1Schema = z.object({
  schemaVersion: z.literal(1),
  scoringModelVersion: z.string().min(1).max(100),
  components: scoreComponentsSchema,
  weights: scoringWeightsSchema,
  penalties: z.object({
    missingData: z.number().min(0).max(100),
    conflict: z.number().min(0).max(100),
    freshness: z.number().min(0).max(100),
  }),
  total: z.number().min(0).max(100),
  topReasons: z.array(z.string().min(1).max(300)).max(5),
  topRisks: z.array(z.string().min(1).max(300)).max(5),
});
export type ScoreBreakdownV1 = z.infer<typeof scoreBreakdownV1Schema>;

export interface ScoreInput {
  components: ScoreComponents;
  weights: ScoringWeights;
  penalties: ScoreBreakdownV1["penalties"];
  reasons?: string[];
  risks?: string[];
}

export function calculateScore(input: ScoreInput): ScoreBreakdownV1 {
  const weighted =
    input.components.hardFilterCompliance * input.weights.hardFilterCompliance +
    input.components.priceCompetitiveness * input.weights.priceCompetitiveness +
    input.components.qualityFit * input.weights.qualityFit +
    input.components.sellerConfidence * input.weights.sellerConfidence +
    input.components.evidenceConfidence * input.weights.evidenceConfidence +
    input.components.reliability * input.weights.reliability +
    input.components.totalCostOfOwnership * input.weights.totalCostOfOwnership +
    input.components.preferenceFit * input.weights.preferenceFit;

  const penalty =
    input.penalties.missingData + input.penalties.conflict + input.penalties.freshness;

  return scoreBreakdownV1Schema.parse({
    schemaVersion: 1,
    scoringModelVersion: "transparent-v1",
    components: input.components,
    weights: input.weights,
    penalties: input.penalties,
    total: Math.round(Math.max(0, Math.min(100, weighted - penalty)) * 100) / 100,
    topReasons: (input.reasons ?? []).slice(0, 5),
    topRisks: (input.risks ?? []).slice(0, 5),
  });
}

export function makeOfferIdentity(offer: OfferV1): string {
  const sku =
    typeof offer.attributes.sku === "string" ? offer.attributes.sku.trim().toLowerCase() : "";
  const normalizedTitle = offer.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
  return `${offer.category}:${sku || normalizedTitle}:${offer.providerName ?? offer.sellerName ?? ""}`;
}

export * from "./research.js";
