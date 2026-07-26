import { randomBytes, randomUUID } from "node:crypto";

import {
  categorySchema,
  filterSpecV1Schema,
  recommendationModeSchema,
  type EvidenceRecordV1,
  type FilterSpecV1,
  type OfferV1,
  type ResearchStage,
  type ScoreBreakdownV1,
} from "@optimalen-nakup/domain";
import { signWorkerRequest } from "@optimalen-nakup/security";
import { z } from "zod";

const claimedFilterSchema = z.object({
  schemaVersion: z.literal(1),
  category: categorySchema,
  mode: recommendationModeSchema,
  query: z.string(),
  hardRequirementsJson: z.string(),
  preferencesJson: z.string(),
  exclusionsJson: z.string(),
  budgetJson: z.string(),
  geographyJson: z.string(),
  acceptableConditionsJson: z.string(),
  timingJson: z.string(),
  riskTolerance: z.enum(["low", "medium", "high"]),
  weightsJson: z.string(),
  confirmedAt: z.number().nullable(),
});

const claimedJobWireSchema = z.object({
  jobId: z.string(),
  organizationId: z.string(),
  researchRequestId: z.string(),
  locale: z.enum(["sl", "en"]),
  filterSpec: claimedFilterSchema,
  attempt: z.number().int().positive(),
  maxPages: z.number().int().positive(),
  maxRuntimeSeconds: z.number().positive(),
  maxAiCostEur: z.number().nonnegative(),
  cancelRequested: z.boolean(),
  leaseExpiresAt: z.number(),
});

const claimedJobEnvelopeSchema = z.object({
  ok: z.literal(true),
  data: claimedJobWireSchema.nullable(),
});

const heartbeatEnvelopeSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    cancelRequested: z.boolean(),
    leaseExpiresAt: z.number(),
  }),
});

const numberEnvelopeSchema = z.object({ ok: z.literal(true), data: z.number() });
const identifierEnvelopeSchema = z.object({ ok: z.literal(true), data: z.string() });
const nullableEnvelopeSchema = z.object({ ok: z.literal(true), data: z.null() });
const failEnvelopeSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    state: z.enum(["queued", "failed", "dead_letter"]),
    nextAttemptAt: z.number().optional(),
  }),
});

export interface ClaimedJob {
  jobId: string;
  organizationId: string;
  researchRequestId: string;
  locale: "sl" | "en";
  filterSpec: FilterSpecV1;
  attempt: number;
  maxPages: number;
  maxRuntimeSeconds: number;
  maxAiCostEur: number;
  cancelRequested: boolean;
  leaseExpiresAt: number;
}

export interface WorkerProgress {
  stage: ResearchStage;
  progress: number;
  pagesVisited: number;
  runtimeSeconds: number;
  aiCostEur: number;
  coverage: Record<string, unknown>;
}

export interface WorkerEvent {
  sequence: number;
  type: string;
  stage: ResearchStage;
  payload: Record<string, unknown>;
  createdAt: number;
}

export interface WorkerRecommendation {
  offerId?: string;
  mode: z.infer<typeof recommendationModeSchema>;
  rank: number;
  headline: string;
  rationale: string;
  caveats: string[];
  evidenceCoverage: number;
  unsupportedClaimCount: number;
}

export interface ModelCostInput {
  model: string;
  purpose: "filter_structuring" | "extraction" | "normalization" | "dispute" | "synthesis";
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  estimatedCostUsd: number;
  estimatedCostEur: number;
  usdToEurRate: number;
  pricingVersion: string;
  requestId?: string;
}

export interface SourceHealthInput {
  sourceId: string;
  status: "healthy" | "degraded" | "blocked" | "disabled" | "legal_review_required";
  robotsReviewedAt: number;
  termsReviewedAt: number;
  latencyMs?: number;
  detail: string;
}

export interface WorkerProtocolClientOptions {
  baseUrl: string;
  workerId: string;
  sharedSecret: string;
  fetch?: typeof globalThis.fetch;
  now?: () => Date;
  nonce?: () => string;
  sleep?: (milliseconds: number) => Promise<void>;
  maximumAttempts?: number;
}

export interface OfferBundleInput {
  offer: OfferV1;
  identityKey: string;
  rawContentHash: string;
  evidence: EvidenceRecordV1[];
  score: ScoreBreakdownV1;
}

function parseJson(value: string, label: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error(`Claimed job contains invalid ${label} JSON`);
  }
}

function decodeFilter(input: z.infer<typeof claimedFilterSchema>): FilterSpecV1 {
  return filterSpecV1Schema.parse({
    schemaVersion: input.schemaVersion,
    category: input.category,
    mode: input.mode,
    query: input.query,
    hardRequirements: parseJson(input.hardRequirementsJson, "hard requirements"),
    preferences: parseJson(input.preferencesJson, "preferences"),
    exclusions: parseJson(input.exclusionsJson, "exclusions"),
    budget: parseJson(input.budgetJson, "budget"),
    geography: parseJson(input.geographyJson, "geography"),
    acceptableConditions: parseJson(input.acceptableConditionsJson, "acceptable conditions"),
    timing: parseJson(input.timingJson, "timing"),
    riskTolerance: input.riskTolerance,
    weights: parseJson(input.weightsJson, "weights"),
    confirmedAt: input.confirmedAt === null ? null : new Date(input.confirmedAt).toISOString(),
  });
}

function toOfferWire(input: OfferBundleInput) {
  const { offer, evidence, score } = input;
  return {
    offer: {
      schemaVersion: 1,
      sourceId: offer.sourceId,
      sourceOfferId: offer.sourceOfferId,
      identityKey: input.identityKey,
      canonicalUrl: offer.canonicalUrl,
      title: offer.title,
      category: offer.category,
      offerType: offer.offerType,
      providerName: offer.providerName,
      sellerName: offer.sellerName,
      basePrice: offer.basePrice,
      recurringPrice: offer.recurringPrice,
      totalInitialCost: offer.totalInitialCost,
      estimatedTotalCost: offer.estimatedTotalCost,
      location: offer.location,
      availability: offer.availability,
      warranty: offer.warranty,
      attributesJson: JSON.stringify(offer.attributes),
      collectedAt: Date.parse(offer.collectedAt),
      staleAfter: Date.parse(offer.staleAfter),
      rawContentHash: input.rawContentHash,
      normalizedJson: JSON.stringify(offer),
    },
    evidence: evidence.map((record) => ({
      schemaVersion: 1,
      field: record.field,
      sourceUrl: record.sourceUrl,
      sourceName: record.sourceName,
      status: record.status,
      confidence: record.confidence,
      method: record.method,
      excerpt: record.excerpt,
      contentHash: record.contentHash,
      collectedAt: Date.parse(record.collectedAt),
      staleAt: Date.parse(record.staleAt),
    })),
    score: {
      schemaVersion: 1,
      scoringModelVersion: score.scoringModelVersion,
      total: score.total,
      componentsJson: JSON.stringify(score.components),
      weightsJson: JSON.stringify(score.weights),
      penaltiesJson: JSON.stringify(score.penalties),
      reasonsJson: JSON.stringify(score.topReasons),
      risksJson: JSON.stringify(score.topRisks),
    },
  };
}

export class WorkerProtocolError extends Error {
  constructor(
    message: string,
    readonly status: number | undefined,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "WorkerProtocolError";
  }
}

export class WorkerProtocolClient {
  private readonly baseUrl: URL;
  private readonly fetchImplementation: typeof globalThis.fetch;
  private readonly now: () => Date;
  private readonly nonce: () => string;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly maximumAttempts: number;

  constructor(private readonly options: WorkerProtocolClientOptions) {
    this.baseUrl = new URL(options.baseUrl);
    if (
      this.baseUrl.protocol !== "https:" &&
      !["localhost", "127.0.0.1", "::1"].includes(this.baseUrl.hostname)
    ) {
      throw new Error("Worker protocol requires HTTPS outside local development");
    }
    if (options.workerId.length < 3 || options.sharedSecret.length < 32) {
      throw new Error("Worker protocol credentials are invalid");
    }
    this.fetchImplementation = options.fetch ?? globalThis.fetch;
    this.now = options.now ?? (() => new Date());
    this.nonce = options.nonce ?? (() => randomBytes(24).toString("base64url"));
    this.sleep =
      options.sleep ??
      ((milliseconds) =>
        new Promise((resolve) => {
          setTimeout(resolve, milliseconds);
        }));
    this.maximumAttempts = options.maximumAttempts ?? 3;
  }

  createLeaseToken(): string {
    return randomBytes(32).toString("base64url");
  }

  async claim(leaseToken: string, leaseDurationMs = 60_000): Promise<ClaimedJob | null> {
    const response = await this.request(
      "/worker/jobs/claim",
      { leaseToken, leaseDurationMs },
      claimedJobEnvelopeSchema,
    );
    if (!response.data) {
      return null;
    }
    return {
      ...response.data,
      filterSpec: decodeFilter(response.data.filterSpec),
    };
  }

  async heartbeat(jobId: string, leaseToken: string, progress: WorkerProgress) {
    const response = await this.request(
      "/worker/jobs/heartbeat",
      {
        jobId,
        leaseToken,
        leaseDurationMs: 60_000,
        stage: progress.stage,
        progress: progress.progress,
        pagesVisited: progress.pagesVisited,
        runtimeSeconds: progress.runtimeSeconds,
        aiCostEur: progress.aiCostEur,
        coverageJson: JSON.stringify(progress.coverage),
      },
      heartbeatEnvelopeSchema,
    );
    return response.data;
  }

  async appendEvents(jobId: string, leaseToken: string, events: WorkerEvent[]): Promise<number> {
    const response = await this.request(
      "/worker/jobs/events",
      {
        jobId,
        leaseToken,
        events: events.map(({ payload, ...event }) => ({
          ...event,
          payloadJson: JSON.stringify(payload),
        })),
      },
      numberEnvelopeSchema,
    );
    return response.data;
  }

  async upsertOffer(jobId: string, leaseToken: string, bundle: OfferBundleInput): Promise<string> {
    const response = await this.request(
      "/worker/jobs/offers",
      { jobId, leaseToken, ...toOfferWire(bundle) },
      identifierEnvelopeSchema,
    );
    return response.data;
  }

  async replaceRecommendations(
    jobId: string,
    leaseToken: string,
    recommendations: WorkerRecommendation[],
  ): Promise<number> {
    const response = await this.request(
      "/worker/jobs/recommendations",
      {
        jobId,
        leaseToken,
        recommendations: recommendations.map((recommendation) => ({
          ...(recommendation.offerId ? { offerId: recommendation.offerId } : {}),
          mode: recommendation.mode,
          rank: recommendation.rank,
          headline: recommendation.headline,
          rationale: recommendation.rationale,
          caveatsJson: JSON.stringify(recommendation.caveats),
          evidenceCoverage: recommendation.evidenceCoverage,
          unsupportedClaimCount: recommendation.unsupportedClaimCount,
        })),
      },
      numberEnvelopeSchema,
    );
    return response.data;
  }

  async recordModelCost(jobId: string, leaseToken: string, cost: ModelCostInput): Promise<boolean> {
    const response = await this.request(
      "/worker/jobs/model-costs",
      {
        jobId,
        leaseToken,
        ...cost,
      },
      z.object({ ok: z.literal(true), data: z.boolean() }),
    );
    return response.data;
  }

  async updateSourceHealth(health: SourceHealthInput): Promise<void> {
    await this.request("/worker/source-health", { ...health }, nullableEnvelopeSchema);
  }

  async complete(
    jobId: string,
    leaseToken: string,
    partial: boolean,
    coverage: Record<string, unknown>,
  ): Promise<void> {
    await this.request(
      "/worker/jobs/complete",
      { jobId, leaseToken, partial, coverageJson: JSON.stringify(coverage) },
      nullableEnvelopeSchema,
    );
  }

  async fail(
    jobId: string,
    leaseToken: string,
    input: {
      retryable: boolean;
      failureCode: string;
      failureMessage: string;
      coverage: Record<string, unknown>;
    },
  ) {
    const response = await this.request(
      "/worker/jobs/fail",
      {
        jobId,
        leaseToken,
        retryable: input.retryable,
        failureCode: input.failureCode,
        failureMessage: input.failureMessage,
        coverageJson: JSON.stringify(input.coverage),
      },
      failEnvelopeSchema,
    );
    return response.data;
  }

  private async request<T>(
    path: string,
    body: Record<string, unknown>,
    responseSchema: z.ZodType<T>,
  ): Promise<T> {
    const rawBody = JSON.stringify(body);
    const idempotencyKey = randomUUID();
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maximumAttempts; attempt += 1) {
      const timestamp = this.now().toISOString();
      const nonce = this.nonce();
      const signature = signWorkerRequest(
        {
          method: "POST",
          path,
          timestamp,
          nonce,
          idempotencyKey,
          body: rawBody,
        },
        this.options.sharedSecret,
      );
      try {
        const response = await this.fetchImplementation(new URL(path, this.baseUrl), {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-idempotency-key": idempotencyKey,
            "x-worker-id": this.options.workerId,
            "x-worker-nonce": nonce,
            "x-worker-signature": signature,
            "x-worker-timestamp": timestamp,
          },
          body: rawBody,
          signal: AbortSignal.timeout(20_000),
        });
        const responseText = await response.text();
        if (response.ok) {
          let decoded: unknown;
          try {
            decoded = JSON.parse(responseText) as unknown;
          } catch {
            throw new WorkerProtocolError("Worker protocol returned invalid JSON", 502, true);
          }
          return responseSchema.parse(decoded);
        }
        const retryable =
          response.status === 409 || response.status === 429 || response.status >= 500;
        const message = `Worker protocol rejected ${path} with HTTP ${response.status}`;
        if (!retryable || attempt === this.maximumAttempts) {
          throw new WorkerProtocolError(message, response.status, retryable);
        }
        lastError = new WorkerProtocolError(message, response.status, true);
      } catch (error) {
        if (error instanceof WorkerProtocolError && !error.retryable) {
          throw error;
        }
        lastError = error;
        if (attempt === this.maximumAttempts) {
          break;
        }
      }
      await this.sleep(Math.min(2_000, 200 * 2 ** (attempt - 1)));
    }
    throw new WorkerProtocolError(
      lastError instanceof Error ? lastError.message : "Worker protocol request failed",
      lastError instanceof WorkerProtocolError ? lastError.status : undefined,
      true,
    );
  }
}

export type WorkerProtocol = Pick<
  WorkerProtocolClient,
  | "createLeaseToken"
  | "claim"
  | "heartbeat"
  | "appendEvents"
  | "upsertOffer"
  | "replaceRecommendations"
  | "recordModelCost"
  | "updateSourceHealth"
  | "complete"
  | "fail"
>;
