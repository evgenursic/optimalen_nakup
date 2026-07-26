import {
  calculateScore,
  type EvidenceRecordV1,
  type FilterSpecV1,
  type OfferV1,
  type Requirement,
  type ScoreBreakdownV1,
} from "./index.js";

export interface RequirementResult {
  requirement: Requirement;
  matched: boolean;
  actualValue: unknown;
}

export interface OfferFilterResult {
  accepted: boolean;
  hardRequirements: RequirementResult[];
  exclusions: RequirementResult[];
  preferences: RequirementResult[];
  preferenceScore: number;
}

export interface OfferEvidenceBundle {
  offer: OfferV1;
  evidence: EvidenceRecordV1[];
}

export interface RankedOffer extends OfferEvidenceBundle {
  filter: OfferFilterResult;
  score: ScoreBreakdownV1;
}

export interface TcoAssumptions {
  horizonMonths: number;
  electricityPriceEurPerKwh?: number;
  fuelPriceEurPerLitre?: number;
  annualDistanceKm?: number;
}

export interface TcoEstimate {
  totalEur: number;
  components: {
    acquisition: number;
    recurring: number;
    energy: number | null;
  };
  assumptions: TcoAssumptions;
  missingInputs: string[];
}

function fieldValue(offer: OfferV1, field: string): unknown {
  const aliases: Record<string, unknown> = {
    price: offer.totalInitialCost?.amount ?? offer.basePrice?.amount,
    basePrice: offer.basePrice?.amount,
    totalInitialCost: offer.totalInitialCost?.amount,
    estimatedTotalCost: offer.estimatedTotalCost?.amount,
    availability: offer.availability,
    warranty: offer.warranty,
    seller: offer.sellerName,
    provider: offer.providerName,
    location: offer.location,
    condition: offer.attributes.condition,
  };
  if (field in aliases) {
    return aliases[field];
  }
  const path = field.startsWith("attributes.") ? field.slice("attributes.".length) : field;
  return path.split(".").reduce<unknown>((value, segment) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }
    return (value as Record<string, unknown>)[segment];
  }, offer.attributes);
}

function asComparable(value: unknown): string | number | boolean | undefined {
  if (typeof value === "string") {
    return value.trim().toLocaleLowerCase("sl");
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return undefined;
}

export function requirementMatches(offer: OfferV1, requirement: Requirement): RequirementResult {
  const actualValue = fieldValue(offer, requirement.field);
  const actual = asComparable(actualValue);
  const expected = requirement.value;
  let matched = false;
  switch (requirement.operator) {
    case "equals":
      matched = actual !== undefined && actual === asComparable(expected);
      break;
    case "not_equals":
      matched = actual !== undefined && actual !== asComparable(expected);
      break;
    case "contains":
      matched =
        typeof actual === "string" &&
        typeof expected === "string" &&
        actual.includes(expected.toLocaleLowerCase("sl"));
      break;
    case "not_contains":
      matched =
        typeof actual === "string" &&
        typeof expected === "string" &&
        !actual.includes(expected.toLocaleLowerCase("sl"));
      break;
    case "gte":
      matched = typeof actual === "number" && typeof expected === "number" && actual >= expected;
      break;
    case "lte":
      matched = typeof actual === "number" && typeof expected === "number" && actual <= expected;
      break;
    case "between":
      matched =
        typeof actual === "number" &&
        Array.isArray(expected) &&
        expected.length === 2 &&
        typeof expected[0] === "number" &&
        typeof expected[1] === "number" &&
        actual >= expected[0] &&
        actual <= expected[1];
      break;
    case "in":
      matched =
        actual !== undefined &&
        Array.isArray(expected) &&
        expected.some((value) => asComparable(value) === actual);
      break;
  }
  return { requirement, matched, actualValue };
}

export function evaluateOfferAgainstFilter(
  offer: OfferV1,
  filter: FilterSpecV1,
): OfferFilterResult {
  const hardRequirements = filter.hardRequirements.map((requirement) =>
    requirementMatches(offer, requirement),
  );
  const exclusions = filter.exclusions.map((requirement) => requirementMatches(offer, requirement));
  const preferences = filter.preferences.map((requirement) =>
    requirementMatches(offer, requirement),
  );
  const budgetMatched =
    !filter.budget ||
    !filter.budget.maximum ||
    (offer.totalInitialCost?.amount ?? offer.basePrice?.amount ?? Number.POSITIVE_INFINITY) <=
      filter.budget.maximum;
  const conditionMatched =
    typeof offer.attributes.condition !== "string" ||
    filter.acceptableConditions.includes(
      offer.attributes.condition as (typeof filter.acceptableConditions)[number],
    );
  return {
    accepted:
      hardRequirements.every((result) => result.matched) &&
      exclusions.every((result) => !result.matched) &&
      budgetMatched &&
      conditionMatched,
    hardRequirements,
    exclusions,
    preferences,
    preferenceScore:
      preferences.length === 0
        ? 100
        : (preferences.filter((result) => result.matched).length / preferences.length) * 100,
  };
}

function evidenceQuality(evidence: EvidenceRecordV1[]): number {
  if (evidence.length === 0) {
    return 0;
  }
  return (
    (evidence.reduce((sum, record) => {
      const statusFactor =
        record.status === "verified"
          ? 1
          : record.status === "secondary"
            ? 0.75
            : record.status === "inferred"
              ? 0.55
              : 0;
      return sum + record.confidence * statusFactor;
    }, 0) /
      evidence.length) *
    100
  );
}

function offerCost(offer: OfferV1): number | null {
  return (
    offer.estimatedTotalCost?.amount ??
    offer.totalInitialCost?.amount ??
    offer.basePrice?.amount ??
    null
  );
}

export function rankOffers(bundles: OfferEvidenceBundle[], filter: FilterSpecV1): RankedOffer[] {
  const evaluated = bundles.map((bundle) => ({
    ...bundle,
    filter: evaluateOfferAgainstFilter(bundle.offer, filter),
  }));
  const accepted = evaluated.filter((bundle) => bundle.filter.accepted);
  const finiteCosts = accepted
    .map((bundle) => offerCost(bundle.offer))
    .filter((value): value is number => value !== null && value > 0);
  const minimumCost = finiteCosts.length > 0 ? Math.min(...finiteCosts) : null;
  return accepted
    .map((bundle) => {
      const cost = offerCost(bundle.offer);
      const quality = evidenceQuality(bundle.evidence);
      const conflictCount = bundle.evidence.filter(
        (record) => record.status === "conflicting",
      ).length;
      const missingCount = bundle.evidence.filter((record) => record.status === "missing").length;
      const stale = Date.parse(bundle.offer.staleAfter) <= Date.now();
      const score = calculateScore({
        components: {
          hardFilterCompliance: 100,
          priceCompetitiveness: cost && minimumCost ? Math.min(100, (minimumCost / cost) * 100) : 0,
          qualityFit: bundle.filter.preferenceScore,
          sellerConfidence: bundle.offer.sellerName ? 80 : 50,
          evidenceConfidence: quality,
          reliability: bundle.offer.warranty ? 85 : Math.min(75, quality),
          totalCostOfOwnership: cost && minimumCost ? Math.min(100, (minimumCost / cost) * 100) : 0,
          preferenceFit: bundle.filter.preferenceScore,
        },
        weights: filter.weights,
        penalties: {
          missingData: Math.min(20, missingCount * 2),
          conflict: Math.min(25, conflictCount * 5),
          freshness: stale ? 20 : 0,
        },
        reasons: [
          `${bundle.filter.hardRequirements.filter((item) => item.matched).length}/${bundle.filter.hardRequirements.length} hard requirements verified`,
          `${Math.round(quality)}% weighted evidence confidence`,
        ],
        risks: [
          ...(missingCount > 0 ? [`${missingCount} evidence fields are missing`] : []),
          ...(conflictCount > 0 ? [`${conflictCount} evidence fields conflict`] : []),
          ...(stale ? ["Offer evidence is stale"] : []),
        ],
      });
      return { ...bundle, score };
    })
    .sort(
      (left, right) =>
        right.score.total - left.score.total || left.offer.title.localeCompare(right.offer.title),
    );
}

function numericAttribute(offer: OfferV1, key: string): number | null {
  const value = offer.attributes[key];
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function estimateTotalCostOfOwnership(
  offer: OfferV1,
  assumptions: TcoAssumptions,
): TcoEstimate | null {
  const acquisition = offer.totalInitialCost?.amount ?? offer.basePrice?.amount;
  if (acquisition === undefined) {
    return null;
  }
  const years = assumptions.horizonMonths / 12;
  const recurring = (offer.recurringPrice?.amount ?? 0) * assumptions.horizonMonths;
  const missingInputs: string[] = [];
  let energy: number | null = null;
  if (offer.category === "white_goods") {
    const annualKwh = numericAttribute(offer, "annualEnergyKwh");
    if (annualKwh !== null && assumptions.electricityPriceEurPerKwh !== undefined) {
      energy = annualKwh * assumptions.electricityPriceEurPerKwh * years;
    } else {
      missingInputs.push("annualEnergyKwh", "electricityPriceEurPerKwh");
    }
  } else if (offer.category === "vehicles") {
    const consumption = numericAttribute(offer, "consumptionLitresPer100Km");
    if (
      consumption !== null &&
      assumptions.fuelPriceEurPerLitre !== undefined &&
      assumptions.annualDistanceKm !== undefined
    ) {
      energy =
        (consumption / 100) *
        assumptions.annualDistanceKm *
        assumptions.fuelPriceEurPerLitre *
        years;
    } else {
      missingInputs.push("consumptionLitresPer100Km", "fuelPriceEurPerLitre", "annualDistanceKm");
    }
  }
  return {
    totalEur: acquisition + recurring + (energy ?? 0),
    components: { acquisition, recurring, energy },
    assumptions,
    missingInputs: [...new Set(missingInputs)],
  };
}

export function detectEvidenceConflicts(bundles: OfferEvidenceBundle[]): OfferEvidenceBundle[] {
  const groups = new Map<string, OfferEvidenceBundle[]>();
  for (const bundle of bundles) {
    const sku =
      typeof bundle.offer.attributes.sku === "string"
        ? bundle.offer.attributes.sku.toLocaleLowerCase("sl")
        : bundle.offer.title
            .toLocaleLowerCase("sl")
            .replaceAll(/[^\p{L}\p{N}]+/gu, " ")
            .trim();
    const key = `${bundle.offer.category}:${sku}`;
    groups.set(key, [...(groups.get(key) ?? []), bundle]);
  }
  return bundles.map((bundle) => {
    const sku =
      typeof bundle.offer.attributes.sku === "string"
        ? bundle.offer.attributes.sku.toLocaleLowerCase("sl")
        : bundle.offer.title
            .toLocaleLowerCase("sl")
            .replaceAll(/[^\p{L}\p{N}]+/gu, " ")
            .trim();
    const peers = groups.get(`${bundle.offer.category}:${sku}`) ?? [];
    const conflictingFields = new Set<string>();
    for (const field of new Set(peers.flatMap((peer) => peer.evidence.map((item) => item.field)))) {
      const values = new Set(
        peers
          .flatMap((peer) => peer.evidence)
          .filter(
            (item) =>
              item.field === field &&
              item.excerpt !== null &&
              !["missing", "inferred"].includes(item.status),
          )
          .map((item) => item.excerpt),
      );
      if (values.size > 1) {
        conflictingFields.add(field);
      }
    }
    return {
      offer: bundle.offer,
      evidence: bundle.evidence.map((record) =>
        conflictingFields.has(record.field)
          ? {
              ...record,
              status: "conflicting" as const,
              confidence: Math.min(0.5, record.confidence),
            }
          : record,
      ),
    };
  });
}
