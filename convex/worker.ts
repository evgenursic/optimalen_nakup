import { ConvexError, v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { writeAuditEvent } from "./lib/audit";
import { enqueueCompletionAlerts } from "./lib/alerts";
import {
  categoryValidator,
  extractionMethodValidator,
  filterSpecV1Validator,
  moneyValidator,
  recommendationModeValidator,
  researchStageValidator,
  verificationStatusValidator,
} from "./schema";

const nullableMoney = v.union(moneyValidator, v.null());

const offerInputValidator = v.object({
  schemaVersion: v.literal(1),
  sourceId: v.string(),
  sourceOfferId: v.string(),
  identityKey: v.string(),
  canonicalUrl: v.string(),
  title: v.string(),
  category: categoryValidator,
  offerType: v.union(
    v.literal("product"),
    v.literal("vehicle"),
    v.literal("service"),
    v.literal("subscription"),
  ),
  providerName: v.union(v.string(), v.null()),
  sellerName: v.union(v.string(), v.null()),
  basePrice: nullableMoney,
  recurringPrice: nullableMoney,
  totalInitialCost: nullableMoney,
  estimatedTotalCost: nullableMoney,
  location: v.union(v.string(), v.null()),
  availability: v.union(
    v.literal("in_stock"),
    v.literal("limited"),
    v.literal("preorder"),
    v.literal("unavailable"),
    v.literal("unknown"),
  ),
  warranty: v.union(v.string(), v.null()),
  attributesJson: v.string(),
  collectedAt: v.number(),
  staleAfter: v.number(),
  rawContentHash: v.string(),
  normalizedJson: v.string(),
});

const evidenceInputValidator = v.object({
  schemaVersion: v.literal(1),
  field: v.string(),
  sourceUrl: v.string(),
  sourceName: v.string(),
  status: verificationStatusValidator,
  confidence: v.number(),
  method: extractionMethodValidator,
  excerpt: v.union(v.string(), v.null()),
  contentHash: v.string(),
  collectedAt: v.number(),
  staleAt: v.number(),
});

const scoreInputValidator = v.object({
  schemaVersion: v.literal(1),
  scoringModelVersion: v.string(),
  total: v.number(),
  componentsJson: v.string(),
  weightsJson: v.string(),
  penaltiesJson: v.string(),
  reasonsJson: v.string(),
  risksJson: v.string(),
});

async function requireActiveLease(
  ctx: MutationCtx,
  input: {
    jobId: Id<"researchJobs">;
    workerId: string;
    leaseTokenHash: string;
    now: number;
  },
) {
  const lease = await ctx.db
    .query("jobLeases")
    .withIndex("by_job", (indexQuery) => indexQuery.eq("jobId", input.jobId))
    .order("desc")
    .first();
  if (
    !lease ||
    lease.releasedAt !== undefined ||
    lease.workerId !== input.workerId ||
    lease.leaseTokenHash !== input.leaseTokenHash ||
    lease.expiresAt < input.now
  ) {
    throw new ConvexError({ code: "INVALID_LEASE", message: "Worker lease is invalid or expired" });
  }
  return lease;
}

export const consumeNonce = internalMutation({
  args: {
    workerId: v.string(),
    nonce: v.string(),
    now: v.number(),
    expiresAt: v.number(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("workerNonces")
      .withIndex("by_nonce", (indexQuery) => indexQuery.eq("nonce", args.nonce))
      .unique();
    if (existing) {
      return false;
    }
    if (args.expiresAt <= args.now || args.expiresAt - args.now > 5 * 60 * 1_000) {
      return false;
    }
    await ctx.db.insert("workerNonces", {
      nonce: args.nonce,
      workerId: args.workerId,
      expiresAt: args.expiresAt,
      createdAt: args.now,
    });
    return true;
  },
});

export const beginRequest = internalMutation({
  args: {
    workerId: v.string(),
    idempotencyKey: v.string(),
    path: v.string(),
    bodyHash: v.string(),
    now: v.number(),
  },
  returns: v.union(
    v.object({ status: v.literal("started"), requestId: v.id("workerRequests") }),
    v.object({ status: v.literal("replay"), responseJson: v.string() }),
    v.object({ status: v.literal("busy") }),
    v.object({ status: v.literal("conflict") }),
  ),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("workerRequests")
      .withIndex("by_worker_and_key", (indexQuery) =>
        indexQuery.eq("workerId", args.workerId).eq("idempotencyKey", args.idempotencyKey),
      )
      .unique();
    if (existing) {
      if (existing.path !== args.path || existing.bodyHash !== args.bodyHash) {
        return { status: "conflict" } as const;
      }
      if (existing.state === "completed" && existing.responseJson) {
        return { status: "replay", responseJson: existing.responseJson } as const;
      }
      if (existing.createdAt >= args.now - 5 * 60 * 1_000) {
        return { status: "busy" } as const;
      }
      await ctx.db.delete(existing._id);
    }
    const requestId = await ctx.db.insert("workerRequests", {
      workerId: args.workerId,
      idempotencyKey: args.idempotencyKey,
      path: args.path,
      bodyHash: args.bodyHash,
      state: "processing",
      createdAt: args.now,
      expiresAt: args.now + 24 * 60 * 60 * 1_000,
    });
    return { status: "started", requestId } as const;
  },
});

export const completeRequest = internalMutation({
  args: {
    requestId: v.id("workerRequests"),
    responseJson: v.string(),
    now: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (request) {
      await ctx.db.patch(request._id, {
        state: "completed",
        responseJson: args.responseJson,
        completedAt: args.now,
      });
    }
    return null;
  },
});

export const abandonRequest = internalMutation({
  args: { requestId: v.id("workerRequests") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (request?.state === "processing") {
      await ctx.db.delete(request._id);
    }
    return null;
  },
});

export const claimJob = internalMutation({
  args: {
    workerId: v.string(),
    leaseTokenHash: v.string(),
    now: v.number(),
    leaseDurationMs: v.number(),
  },
  returns: v.union(
    v.object({
      jobId: v.id("researchJobs"),
      organizationId: v.id("organizations"),
      researchRequestId: v.id("researchRequests"),
      locale: v.union(v.literal("sl"), v.literal("en")),
      filterSpec: filterSpecV1Validator,
      attempt: v.number(),
      maxPages: v.number(),
      maxRuntimeSeconds: v.number(),
      maxAiCostEur: v.number(),
      cancelRequested: v.boolean(),
      leaseExpiresAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    if (args.leaseDurationMs < 15_000 || args.leaseDurationMs > 5 * 60 * 1_000) {
      throw new ConvexError({
        code: "INVALID_LEASE_DURATION",
        message: "Lease duration is invalid",
      });
    }
    const killSwitch = await ctx.db
      .query("applicationSettings")
      .withIndex("by_key", (indexQuery) => indexQuery.eq("key", "worker.killSwitch"))
      .unique();
    if (killSwitch && JSON.parse(killSwitch.valueJson) === true) {
      return null;
    }

    const candidates = await ctx.db
      .query("researchJobs")
      .withIndex("by_state_and_next_attempt", (indexQuery) =>
        indexQuery.eq("state", "queued").lte("nextAttemptAt", args.now),
      )
      .order("asc")
      .take(20);

    for (const job of candidates) {
      const activeLease = await ctx.db
        .query("jobLeases")
        .withIndex("by_job", (indexQuery) => indexQuery.eq("jobId", job._id))
        .order("desc")
        .first();
      if (activeLease && activeLease.releasedAt === undefined && activeLease.expiresAt > args.now) {
        continue;
      }
      if (activeLease && activeLease.releasedAt === undefined) {
        await ctx.db.patch(activeLease._id, { releasedAt: args.now });
      }

      const filter = await ctx.db.get(job.filterId);
      const researchRequest = await ctx.db.get(job.researchRequestId);
      if (
        !filter ||
        filter.organizationId !== job.organizationId ||
        !researchRequest ||
        researchRequest.organizationId !== job.organizationId
      ) {
        await ctx.db.patch(job._id, {
          state: "dead_letter",
          failureCode: "INVALID_FILTER_REFERENCE",
          failureMessage: "Research filter is missing or belongs to another tenant",
          completedAt: args.now,
          updatedAt: args.now,
        });
        continue;
      }

      const leaseExpiresAt = args.now + args.leaseDurationMs;
      await ctx.db.insert("jobLeases", {
        organizationId: job.organizationId,
        jobId: job._id,
        workerId: args.workerId,
        leaseTokenHash: args.leaseTokenHash,
        acquiredAt: args.now,
        heartbeatAt: args.now,
        expiresAt: leaseExpiresAt,
      });
      await ctx.db.patch(job._id, {
        state: "running",
        stage: "source_discovery",
        attempt: job.attempt + 1,
        startedAt: job.startedAt ?? args.now,
        updatedAt: args.now,
      });
      await writeAuditEvent(ctx, {
        organizationId: job.organizationId,
        actorType: "worker",
        action: "research.job_claimed",
        targetType: "research_job",
        targetId: job._id,
        metadata: { workerId: args.workerId, attempt: job.attempt + 1 },
      });
      return {
        jobId: job._id,
        organizationId: job.organizationId,
        researchRequestId: job.researchRequestId,
        locale: researchRequest.locale,
        filterSpec: filter.spec,
        attempt: job.attempt + 1,
        maxPages: job.maxPages,
        maxRuntimeSeconds: job.maxRuntimeSeconds,
        maxAiCostEur: job.maxAiCostEur,
        cancelRequested: job.cancelRequestedAt !== undefined,
        leaseExpiresAt,
      };
    }
    return null;
  },
});

export const heartbeat = internalMutation({
  args: {
    jobId: v.id("researchJobs"),
    workerId: v.string(),
    leaseTokenHash: v.string(),
    now: v.number(),
    leaseDurationMs: v.number(),
    stage: researchStageValidator,
    progress: v.number(),
    pagesVisited: v.number(),
    runtimeSeconds: v.number(),
    aiCostEur: v.number(),
    coverageJson: v.string(),
  },
  returns: v.object({
    cancelRequested: v.boolean(),
    leaseExpiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const lease = await requireActiveLease(ctx, args);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.state !== "running") {
      throw new ConvexError({ code: "JOB_NOT_RUNNING", message: "Research job is not running" });
    }
    if (
      args.progress < 0 ||
      args.progress > 100 ||
      args.pagesVisited < job.pagesVisited ||
      args.pagesVisited > job.maxPages ||
      args.runtimeSeconds < job.runtimeSeconds ||
      args.aiCostEur < job.aiCostEur
    ) {
      throw new ConvexError({ code: "INVALID_PROGRESS", message: "Worker progress is invalid" });
    }
    const expiresAt = args.now + Math.min(args.leaseDurationMs, 5 * 60 * 1_000);
    await ctx.db.patch(lease._id, {
      heartbeatAt: args.now,
      expiresAt,
    });
    await ctx.db.patch(job._id, {
      stage: args.stage,
      progress: args.progress,
      pagesVisited: args.pagesVisited,
      runtimeSeconds: args.runtimeSeconds,
      aiCostEur: args.aiCostEur,
      coverageJson: args.coverageJson,
      cancelRequestedAt:
        job.cancelRequestedAt ??
        (args.pagesVisited >= job.maxPages ||
        args.runtimeSeconds >= job.maxRuntimeSeconds ||
        args.aiCostEur >= job.maxAiCostEur
          ? args.now
          : undefined),
      updatedAt: args.now,
    });
    return {
      cancelRequested:
        job.cancelRequestedAt !== undefined ||
        args.pagesVisited >= job.maxPages ||
        args.runtimeSeconds >= job.maxRuntimeSeconds ||
        args.aiCostEur >= job.maxAiCostEur,
      leaseExpiresAt: expiresAt,
    };
  },
});

export const appendEvents = internalMutation({
  args: {
    jobId: v.id("researchJobs"),
    workerId: v.string(),
    leaseTokenHash: v.string(),
    now: v.number(),
    events: v.array(
      v.object({
        sequence: v.number(),
        type: v.string(),
        stage: researchStageValidator,
        payloadJson: v.string(),
        createdAt: v.number(),
      }),
    ),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    await requireActiveLease(ctx, args);
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Research job not found" });
    }
    if (args.events.length > 100) {
      throw new ConvexError({
        code: "TOO_MANY_EVENTS",
        message: "At most 100 events are accepted",
      });
    }
    let inserted = 0;
    for (const event of args.events) {
      const existing = await ctx.db
        .query("jobEvents")
        .withIndex("by_job_and_sequence", (indexQuery) =>
          indexQuery.eq("jobId", job._id).eq("sequence", event.sequence),
        )
        .unique();
      if (!existing) {
        await ctx.db.insert("jobEvents", {
          organizationId: job.organizationId,
          jobId: job._id,
          ...event,
        });
        inserted += 1;
      }
    }
    return inserted;
  },
});

export const upsertOfferBundle = internalMutation({
  args: {
    jobId: v.id("researchJobs"),
    workerId: v.string(),
    leaseTokenHash: v.string(),
    now: v.number(),
    offer: offerInputValidator,
    evidence: v.array(evidenceInputValidator),
    score: scoreInputValidator,
  },
  returns: v.id("offers"),
  handler: async (ctx, args) => {
    await requireActiveLease(ctx, args);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.state !== "running") {
      throw new ConvexError({ code: "JOB_NOT_RUNNING", message: "Research job is not running" });
    }
    if (args.evidence.length > 200) {
      throw new ConvexError({
        code: "TOO_MUCH_EVIDENCE",
        message: "At most 200 evidence records are accepted per offer",
      });
    }

    const existing = await ctx.db
      .query("offers")
      .withIndex("by_job_and_identity", (indexQuery) =>
        indexQuery.eq("researchJobId", job._id).eq("identityKey", args.offer.identityKey),
      )
      .unique();

    let offerId: Id<"offers">;
    let version: number;
    if (existing) {
      const latestVersion = await ctx.db
        .query("offerVersions")
        .withIndex("by_offer_and_version", (indexQuery) => indexQuery.eq("offerId", existing._id))
        .order("desc")
        .first();
      if (latestVersion?.rawContentHash === args.offer.rawContentHash) {
        return existing._id;
      }
      version = existing.currentVersion + 1;
      offerId = existing._id;
      await ctx.db.patch(existing._id, {
        sourceId: args.offer.sourceId,
        sourceOfferId: args.offer.sourceOfferId,
        canonicalUrl: args.offer.canonicalUrl,
        title: args.offer.title,
        category: args.offer.category,
        offerType: args.offer.offerType,
        providerName: args.offer.providerName,
        sellerName: args.offer.sellerName,
        basePrice: args.offer.basePrice,
        recurringPrice: args.offer.recurringPrice,
        totalInitialCost: args.offer.totalInitialCost,
        estimatedTotalCost: args.offer.estimatedTotalCost,
        location: args.offer.location,
        availability: args.offer.availability,
        warranty: args.offer.warranty,
        attributesJson: args.offer.attributesJson,
        collectedAt: args.offer.collectedAt,
        staleAfter: args.offer.staleAfter,
        currentVersion: version,
        updatedAt: args.now,
      });
    } else {
      version = 1;
      offerId = await ctx.db.insert("offers", {
        organizationId: job.organizationId,
        researchJobId: job._id,
        schemaVersion: 1,
        sourceId: args.offer.sourceId,
        sourceOfferId: args.offer.sourceOfferId,
        identityKey: args.offer.identityKey,
        canonicalUrl: args.offer.canonicalUrl,
        title: args.offer.title,
        category: args.offer.category,
        offerType: args.offer.offerType,
        providerName: args.offer.providerName,
        sellerName: args.offer.sellerName,
        basePrice: args.offer.basePrice,
        recurringPrice: args.offer.recurringPrice,
        totalInitialCost: args.offer.totalInitialCost,
        estimatedTotalCost: args.offer.estimatedTotalCost,
        location: args.offer.location,
        availability: args.offer.availability,
        warranty: args.offer.warranty,
        attributesJson: args.offer.attributesJson,
        collectedAt: args.offer.collectedAt,
        staleAfter: args.offer.staleAfter,
        currentVersion: version,
        createdAt: args.now,
        updatedAt: args.now,
      });
    }

    await ctx.db.insert("offerVersions", {
      organizationId: job.organizationId,
      offerId,
      version,
      rawContentHash: args.offer.rawContentHash,
      normalizedJson: args.offer.normalizedJson,
      collectedAt: args.offer.collectedAt,
    });
    for (const evidence of args.evidence) {
      await ctx.db.insert("evidenceRecords", {
        organizationId: job.organizationId,
        researchJobId: job._id,
        offerId,
        ...evidence,
      });
    }
    await ctx.db.insert("scores", {
      organizationId: job.organizationId,
      researchJobId: job._id,
      offerId,
      ...args.score,
      createdAt: args.now,
    });
    return offerId;
  },
});

export const replaceRecommendations = internalMutation({
  args: {
    jobId: v.id("researchJobs"),
    workerId: v.string(),
    leaseTokenHash: v.string(),
    now: v.number(),
    recommendations: v.array(
      v.object({
        offerId: v.optional(v.id("offers")),
        mode: recommendationModeValidator,
        rank: v.number(),
        headline: v.string(),
        rationale: v.string(),
        caveatsJson: v.string(),
        evidenceCoverage: v.number(),
        unsupportedClaimCount: v.number(),
      }),
    ),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    await requireActiveLease(ctx, args);
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Research job not found" });
    }
    if (args.recommendations.length > 20) {
      throw new ConvexError({
        code: "TOO_MANY_RECOMMENDATIONS",
        message: "At most 20 recommendations are accepted",
      });
    }
    const existing = await ctx.db
      .query("recommendations")
      .withIndex("by_job_and_rank", (indexQuery) => indexQuery.eq("researchJobId", job._id))
      .take(100);
    for (const recommendation of existing) {
      await ctx.db.delete(recommendation._id);
    }
    for (const recommendation of args.recommendations) {
      if (recommendation.offerId) {
        const offer = await ctx.db.get(recommendation.offerId);
        if (
          !offer ||
          offer.organizationId !== job.organizationId ||
          offer.researchJobId !== job._id
        ) {
          throw new ConvexError({
            code: "INVALID_OFFER_REFERENCE",
            message: "Recommendation references an invalid offer",
          });
        }
      }
      await ctx.db.insert("recommendations", {
        organizationId: job.organizationId,
        researchJobId: job._id,
        ...recommendation,
        createdAt: args.now,
      });
    }
    return args.recommendations.length;
  },
});

export const recordModelCost = internalMutation({
  args: {
    jobId: v.id("researchJobs"),
    workerId: v.string(),
    leaseTokenHash: v.string(),
    now: v.number(),
    model: v.string(),
    purpose: v.union(
      v.literal("filter_structuring"),
      v.literal("extraction"),
      v.literal("normalization"),
      v.literal("dispute"),
      v.literal("synthesis"),
    ),
    inputTokens: v.number(),
    cachedInputTokens: v.number(),
    cacheWriteTokens: v.number(),
    outputTokens: v.number(),
    reasoningTokens: v.number(),
    estimatedCostUsd: v.number(),
    estimatedCostEur: v.number(),
    usdToEurRate: v.number(),
    pricingVersion: v.string(),
    requestId: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await requireActiveLease(ctx, args);
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Research job not found" });
    }
    if (
      [
        args.inputTokens,
        args.cachedInputTokens,
        args.cacheWriteTokens,
        args.outputTokens,
        args.reasoningTokens,
        args.estimatedCostUsd,
        args.estimatedCostEur,
      ].some((value) => !Number.isFinite(value) || value < 0) ||
      !Number.isFinite(args.usdToEurRate) ||
      args.usdToEurRate <= 0
    ) {
      throw new ConvexError({ code: "INVALID_MODEL_COST", message: "Model cost is invalid" });
    }
    if (args.requestId) {
      const existing = await ctx.db
        .query("modelCosts")
        .withIndex("by_job_and_request_id", (indexQuery) =>
          indexQuery.eq("researchJobId", job._id).eq("requestId", args.requestId),
        )
        .unique();
      if (existing) {
        return false;
      }
    }
    await ctx.db.insert("modelCosts", {
      organizationId: job.organizationId,
      researchJobId: job._id,
      model: args.model,
      purpose: args.purpose,
      inputTokens: args.inputTokens,
      cachedInputTokens: args.cachedInputTokens,
      cacheWriteTokens: args.cacheWriteTokens,
      outputTokens: args.outputTokens,
      reasoningTokens: args.reasoningTokens,
      estimatedCostUsd: args.estimatedCostUsd,
      estimatedCostEur: args.estimatedCostEur,
      usdToEurRate: args.usdToEurRate,
      pricingVersion: args.pricingVersion,
      ...(args.requestId ? { requestId: args.requestId } : {}),
      createdAt: args.now,
    });
    return true;
  },
});

export const updateSourceHealth = internalMutation({
  args: {
    sourceId: v.string(),
    status: v.union(
      v.literal("healthy"),
      v.literal("degraded"),
      v.literal("blocked"),
      v.literal("disabled"),
      v.literal("legal_review_required"),
    ),
    robotsReviewedAt: v.number(),
    termsReviewedAt: v.number(),
    latencyMs: v.optional(v.number()),
    detail: v.string(),
    now: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sourceHealth")
      .withIndex("by_source_id", (indexQuery) => indexQuery.eq("sourceId", args.sourceId))
      .unique();
    const successful = args.status === "healthy";
    const value = {
      status: args.status,
      robotsReviewedAt: args.robotsReviewedAt,
      termsReviewedAt: args.termsReviewedAt,
      lastCheckedAt: args.now,
      ...(successful ? { lastSuccessAt: args.now } : {}),
      consecutiveFailures: successful ? 0 : (existing?.consecutiveFailures ?? 0) + 1,
      ...(args.latencyMs === undefined ? {} : { latencyMs: args.latencyMs }),
      detail: args.detail.slice(0, 2_000),
    };
    if (existing) {
      await ctx.db.patch(existing._id, value);
    } else {
      await ctx.db.insert("sourceHealth", {
        sourceId: args.sourceId,
        ...value,
      });
    }
    return null;
  },
});

export const complete = internalMutation({
  args: {
    jobId: v.id("researchJobs"),
    workerId: v.string(),
    leaseTokenHash: v.string(),
    now: v.number(),
    partial: v.boolean(),
    coverageJson: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const lease = await requireActiveLease(ctx, args);
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Research job not found" });
    }
    const cancelled = job.cancelRequestedAt !== undefined;
    await ctx.db.patch(job._id, {
      state: cancelled ? "cancelled" : args.partial ? "completed_partial" : "completed",
      stage: "final_report",
      progress: 100,
      coverageJson: args.coverageJson,
      completedAt: args.now,
      updatedAt: args.now,
    });
    await ctx.db.patch(lease._id, { releasedAt: args.now });
    await writeAuditEvent(ctx, {
      organizationId: job.organizationId,
      actorType: "worker",
      action: cancelled ? "research.job_cancelled" : "research.job_completed",
      targetType: "research_job",
      targetId: job._id,
      metadata: { partial: args.partial, workerId: args.workerId },
    });
    if (!cancelled) {
      await enqueueCompletionAlerts(ctx, job, args.now, args.partial);
    }
    return null;
  },
});

export const fail = internalMutation({
  args: {
    jobId: v.id("researchJobs"),
    workerId: v.string(),
    leaseTokenHash: v.string(),
    now: v.number(),
    retryable: v.boolean(),
    failureCode: v.string(),
    failureMessage: v.string(),
    coverageJson: v.string(),
  },
  returns: v.object({
    state: v.union(v.literal("queued"), v.literal("failed"), v.literal("dead_letter")),
    nextAttemptAt: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const lease = await requireActiveLease(ctx, args);
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Research job not found" });
    }
    const shouldRetry = args.retryable && job.attempt < job.maxAttempts;
    const state: "queued" | "failed" | "dead_letter" = shouldRetry
      ? "queued"
      : args.retryable
        ? "dead_letter"
        : "failed";
    const nextAttemptAt = shouldRetry
      ? args.now + Math.min(30 * 60 * 1_000, 30_000 * 2 ** Math.max(0, job.attempt - 1))
      : undefined;
    await ctx.db.patch(job._id, {
      state,
      failureCode: args.failureCode,
      failureMessage: args.failureMessage.slice(0, 2_000),
      coverageJson: args.coverageJson,
      nextAttemptAt,
      completedAt: shouldRetry ? undefined : args.now,
      updatedAt: args.now,
    });
    await ctx.db.patch(lease._id, { releasedAt: args.now });
    return {
      state,
      ...(nextAttemptAt === undefined ? {} : { nextAttemptAt }),
    };
  },
});

export const jobStatus = internalQuery({
  args: { jobId: v.id("researchJobs") },
  returns: v.union(
    v.object({
      state: v.string(),
      stage: v.string(),
      cancelRequested: v.boolean(),
      pagesVisited: v.number(),
      maxPages: v.number(),
      runtimeSeconds: v.number(),
      maxRuntimeSeconds: v.number(),
      aiCostEur: v.number(),
      maxAiCostEur: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) {
      return null;
    }
    return {
      state: job.state,
      stage: job.stage,
      cancelRequested: job.cancelRequestedAt !== undefined,
      pagesVisited: job.pagesVisited,
      maxPages: job.maxPages,
      runtimeSeconds: job.runtimeSeconds,
      maxRuntimeSeconds: job.maxRuntimeSeconds,
      aiCostEur: job.aiCostEur,
      maxAiCostEur: job.maxAiCostEur,
    };
  },
});

export const cleanupExpiredProtocolRecords = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    const nonces = await ctx.db
      .query("workerNonces")
      .withIndex("by_expires_at", (indexQuery) => indexQuery.lte("expiresAt", now))
      .take(500);
    const requests = await ctx.db
      .query("workerRequests")
      .withIndex("by_expires_at", (indexQuery) => indexQuery.lte("expiresAt", now))
      .take(500);
    const rateLimits = await ctx.db
      .query("rateLimits")
      .withIndex("by_expires_at", (indexQuery) => indexQuery.lte("expiresAt", now))
      .take(500);
    for (const nonce of nonces) {
      await ctx.db.delete(nonce._id);
    }
    for (const request of requests) {
      await ctx.db.delete(request._id);
    }
    for (const rateLimit of rateLimits) {
      await ctx.db.delete(rateLimit._id);
    }
    return nonces.length + requests.length + rateLimits.length;
  },
});
