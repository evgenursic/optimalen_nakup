import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireMembership } from "./lib/auth";
import { writeAuditEvent } from "./lib/audit";
import {
  categoryValidator,
  extractionMethodValidator,
  filterSpecV1Validator,
  localeValidator,
  nullableMoneyValidator,
  researchStageValidator,
  researchStateValidator,
  verificationStatusValidator,
} from "./schema";

function assertReasonablePageSize(numItems: number): void {
  if (!Number.isInteger(numItems) || numItems < 1 || numItems > 100) {
    throw new ConvexError({
      code: "INVALID_PAGE_SIZE",
      message: "Page size must be between 1 and 100",
    });
  }
}

export const createDraft = mutation({
  args: {
    organizationId: v.id("organizations"),
    title: v.string(),
    originalInput: v.string(),
    locale: localeValidator,
    category: categoryValidator,
    filterSpec: filterSpecV1Validator,
  },
  returns: v.object({
    researchRequestId: v.id("researchRequests"),
    filterId: v.id("filters"),
  }),
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "researcher");
    if (args.title.trim().length < 3 || args.originalInput.trim().length < 3) {
      throw new ConvexError({
        code: "INVALID_REQUEST",
        message: "A title and buying request are required",
      });
    }
    if (args.category !== args.filterSpec.category) {
      throw new ConvexError({
        code: "CATEGORY_MISMATCH",
        message: "Request and filter categories must match",
      });
    }

    const now = Date.now();
    const researchRequestId = await ctx.db.insert("researchRequests", {
      organizationId: args.organizationId,
      createdByUserId: user._id,
      title: args.title.trim(),
      originalInput: args.originalInput.trim(),
      locale: args.locale,
      category: args.category,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
    const filterId = await ctx.db.insert("filters", {
      organizationId: args.organizationId,
      researchRequestId,
      createdByUserId: user._id,
      version: 1,
      spec: args.filterSpec,
      createdAt: now,
    });
    await ctx.db.patch(researchRequestId, { activeFilterId: filterId });
    await writeAuditEvent(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      actorType: "user",
      action: "research.draft_created",
      targetType: "research_request",
      targetId: researchRequestId,
      metadata: { category: args.category },
    });
    return { researchRequestId, filterId };
  },
});

export const updateFilter = mutation({
  args: {
    organizationId: v.id("organizations"),
    researchRequestId: v.id("researchRequests"),
    filterSpec: filterSpecV1Validator,
  },
  returns: v.id("filters"),
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "researcher");
    const request = await ctx.db.get(args.researchRequestId);
    if (
      !request ||
      request.organizationId !== args.organizationId ||
      request.status === "archived"
    ) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Research request not found" });
    }
    if (request.category !== args.filterSpec.category) {
      throw new ConvexError({
        code: "CATEGORY_MISMATCH",
        message: "Request and filter categories must match",
      });
    }
    const priorFilters = await ctx.db
      .query("filters")
      .withIndex("by_request_and_version", (indexQuery) =>
        indexQuery.eq("researchRequestId", request._id),
      )
      .order("desc")
      .take(1);
    const filterId = await ctx.db.insert("filters", {
      organizationId: args.organizationId,
      researchRequestId: request._id,
      createdByUserId: user._id,
      version: (priorFilters[0]?.version ?? 0) + 1,
      spec: args.filterSpec,
      createdAt: Date.now(),
    });
    await ctx.db.patch(request._id, {
      activeFilterId: filterId,
      status: args.filterSpec.confirmedAt === null ? "draft" : "confirmed",
      updatedAt: Date.now(),
    });
    return filterId;
  },
});

export const confirmAndQueue = mutation({
  args: {
    organizationId: v.id("organizations"),
    researchRequestId: v.id("researchRequests"),
    idempotencyKey: v.string(),
    maxPages: v.number(),
    maxRuntimeSeconds: v.number(),
    maxAiCostEur: v.number(),
  },
  returns: v.id("researchJobs"),
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "researcher");
    const existing = await ctx.db
      .query("researchJobs")
      .withIndex("by_idempotency_key", (indexQuery) =>
        indexQuery.eq("idempotencyKey", args.idempotencyKey),
      )
      .unique();
    if (existing) {
      if (existing.organizationId !== args.organizationId) {
        throw new ConvexError({
          code: "IDEMPOTENCY_CONFLICT",
          message: "Idempotency key belongs to another organization",
        });
      }
      return existing._id;
    }

    const request = await ctx.db.get(args.researchRequestId);
    if (
      !request ||
      request.organizationId !== args.organizationId ||
      !request.activeFilterId ||
      request.status === "archived"
    ) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Research request not found" });
    }
    const filter = await ctx.db.get(request.activeFilterId);
    if (
      !filter ||
      filter.organizationId !== args.organizationId ||
      filter.spec.confirmedAt === null
    ) {
      throw new ConvexError({
        code: "FILTER_NOT_CONFIRMED",
        message: "The structured buying criteria must be confirmed before research starts",
      });
    }
    if (
      !Number.isInteger(args.maxPages) ||
      args.maxPages < 1 ||
      args.maxPages > 1_000 ||
      args.maxRuntimeSeconds < 30 ||
      args.maxRuntimeSeconds > 14_400 ||
      args.maxAiCostEur < 0 ||
      args.maxAiCostEur > 100
    ) {
      throw new ConvexError({ code: "INVALID_BUDGET", message: "Research budget is invalid" });
    }

    const now = Date.now();
    const jobEntitlement = await ctx.db
      .query("entitlements")
      .withIndex("by_organization_and_key", (indexQuery) =>
        indexQuery.eq("organizationId", args.organizationId).eq("key", "research.jobs.monthly"),
      )
      .unique();
    const pageEntitlement = await ctx.db
      .query("entitlements")
      .withIndex("by_organization_and_key", (indexQuery) =>
        indexQuery.eq("organizationId", args.organizationId).eq("key", "research.pages.per_job"),
      )
      .unique();
    if (!jobEntitlement?.enabled || jobEntitlement.limit === undefined) {
      throw new ConvexError({
        code: "ENTITLEMENT_MISSING",
        message: "Research is not enabled for this workspace",
      });
    }
    if (pageEntitlement?.limit !== undefined && args.maxPages > pageEntitlement.limit) {
      throw new ConvexError({
        code: "PAGE_LIMIT_EXCEEDED",
        message: "Requested page budget exceeds the workspace plan",
      });
    }
    const currentDate = new Date(now);
    const monthStart = Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1);
    const monthlyJobs = await ctx.db
      .query("usageLedger")
      .withIndex("by_organization_kind_and_occurred_at", (indexQuery) =>
        indexQuery
          .eq("organizationId", args.organizationId)
          .eq("kind", "research_job")
          .gte("occurredAt", monthStart),
      )
      .take(jobEntitlement.limit + 1);
    if (monthlyJobs.length >= jobEntitlement.limit) {
      throw new ConvexError({
        code: "MONTHLY_LIMIT_EXCEEDED",
        message: "The monthly research-job allowance has been reached",
      });
    }

    const jobId = await ctx.db.insert("researchJobs", {
      organizationId: args.organizationId,
      researchRequestId: request._id,
      filterId: filter._id,
      requestedByUserId: user._id,
      state: "queued",
      stage: "research_plan",
      progress: 0,
      priority: 0,
      attempt: 0,
      maxAttempts: 3,
      idempotencyKey: args.idempotencyKey,
      pagesVisited: 0,
      maxPages: args.maxPages,
      runtimeSeconds: 0,
      maxRuntimeSeconds: args.maxRuntimeSeconds,
      aiCostEur: 0,
      maxAiCostEur: args.maxAiCostEur,
      coverageJson: JSON.stringify({ sourcesAttempted: 0, sourcesSuccessful: 0 }),
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(request._id, { status: "confirmed", updatedAt: now });
    await ctx.db.insert("usageLedger", {
      organizationId: args.organizationId,
      kind: "research_job",
      amount: 1,
      unit: "job",
      referenceId: jobId,
      idempotencyKey: `job:${jobId}`,
      occurredAt: now,
    });
    await writeAuditEvent(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      actorType: "user",
      action: "research.job_queued",
      targetType: "research_job",
      targetId: jobId,
    });
    return jobId;
  },
});

export const cancel = mutation({
  args: {
    organizationId: v.id("organizations"),
    jobId: v.id("researchJobs"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "researcher");
    const job = await ctx.db.get(args.jobId);
    if (!job || job.organizationId !== args.organizationId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Research job not found" });
    }
    if (
      ["completed", "completed_partial", "cancelled", "failed", "dead_letter"].includes(job.state)
    ) {
      return null;
    }
    const now = Date.now();
    await ctx.db.patch(job._id, {
      state: job.state === "queued" ? "cancelled" : "cancel_requested",
      cancelRequestedAt: now,
      completedAt: job.state === "queued" ? now : undefined,
      updatedAt: now,
    });
    await writeAuditEvent(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      actorType: "user",
      action: "research.job_cancel_requested",
      targetType: "research_job",
      targetId: job._id,
    });
    return null;
  },
});

export const listJobs = query({
  args: {
    organizationId: v.id("organizations"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    items: v.array(
      v.object({
        id: v.id("researchJobs"),
        researchRequestId: v.id("researchRequests"),
        state: researchStateValidator,
        stage: researchStageValidator,
        progress: v.number(),
        pagesVisited: v.number(),
        maxPages: v.number(),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
    nextCursor: v.string(),
    done: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId, "viewer");
    assertReasonablePageSize(args.paginationOpts.numItems);
    const result = await ctx.db
      .query("researchJobs")
      .withIndex("by_organization_and_created_at", (indexQuery) =>
        indexQuery.eq("organizationId", args.organizationId),
      )
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      items: result.page.map((job) => ({
        id: job._id,
        researchRequestId: job.researchRequestId,
        state: job.state,
        stage: job.stage,
        progress: job.progress,
        pagesVisited: job.pagesVisited,
        maxPages: job.maxPages,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      })),
      nextCursor: result.continueCursor,
      done: result.isDone,
    };
  },
});

export const getJob = query({
  args: {
    organizationId: v.id("organizations"),
    jobId: v.id("researchJobs"),
  },
  returns: v.union(
    v.object({
      id: v.id("researchJobs"),
      researchRequestId: v.id("researchRequests"),
      state: researchStateValidator,
      stage: researchStageValidator,
      progress: v.number(),
      pagesVisited: v.number(),
      maxPages: v.number(),
      runtimeSeconds: v.number(),
      maxRuntimeSeconds: v.number(),
      aiCostEur: v.number(),
      maxAiCostEur: v.number(),
      coverageJson: v.string(),
      failureCode: v.optional(v.string()),
      failureMessage: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId, "viewer");
    const job = await ctx.db.get(args.jobId);
    if (!job || job.organizationId !== args.organizationId) {
      return null;
    }
    return {
      id: job._id,
      researchRequestId: job.researchRequestId,
      state: job.state,
      stage: job.stage,
      progress: job.progress,
      pagesVisited: job.pagesVisited,
      maxPages: job.maxPages,
      runtimeSeconds: job.runtimeSeconds,
      maxRuntimeSeconds: job.maxRuntimeSeconds,
      aiCostEur: job.aiCostEur,
      maxAiCostEur: job.maxAiCostEur,
      coverageJson: job.coverageJson,
      ...(job.failureCode ? { failureCode: job.failureCode } : {}),
      ...(job.failureMessage ? { failureMessage: job.failureMessage } : {}),
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  },
});

export const listOffers = query({
  args: {
    organizationId: v.id("organizations"),
    jobId: v.id("researchJobs"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    items: v.array(
      v.object({
        id: v.id("offers"),
        sourceId: v.string(),
        sourceOfferId: v.string(),
        canonicalUrl: v.string(),
        title: v.string(),
        providerName: v.union(v.string(), v.null()),
        sellerName: v.union(v.string(), v.null()),
        basePrice: nullableMoneyValidator,
        totalInitialCost: nullableMoneyValidator,
        estimatedTotalCost: nullableMoneyValidator,
        availability: v.union(
          v.literal("in_stock"),
          v.literal("limited"),
          v.literal("preorder"),
          v.literal("unavailable"),
          v.literal("unknown"),
        ),
        attributesJson: v.string(),
        collectedAt: v.number(),
        staleAfter: v.number(),
        score: v.union(v.number(), v.null()),
      }),
    ),
    nextCursor: v.string(),
    done: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId, "viewer");
    assertReasonablePageSize(args.paginationOpts.numItems);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.organizationId !== args.organizationId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Research job not found" });
    }
    const result = await ctx.db
      .query("offers")
      .withIndex("by_job", (indexQuery) => indexQuery.eq("researchJobId", args.jobId))
      .paginate(args.paginationOpts);
    const items = [];
    for (const offer of result.page) {
      const score = await ctx.db
        .query("scores")
        .withIndex("by_offer", (indexQuery) => indexQuery.eq("offerId", offer._id))
        .order("desc")
        .first();
      items.push({
        id: offer._id,
        sourceId: offer.sourceId,
        sourceOfferId: offer.sourceOfferId,
        canonicalUrl: offer.canonicalUrl,
        title: offer.title,
        providerName: offer.providerName,
        sellerName: offer.sellerName,
        basePrice: offer.basePrice,
        totalInitialCost: offer.totalInitialCost,
        estimatedTotalCost: offer.estimatedTotalCost,
        availability: offer.availability,
        attributesJson: offer.attributesJson,
        collectedAt: offer.collectedAt,
        staleAfter: offer.staleAfter,
        score: score?.total ?? null,
      });
    }
    return {
      items,
      nextCursor: result.continueCursor,
      done: result.isDone,
    };
  },
});

export const evidenceForOffer = query({
  args: {
    organizationId: v.id("organizations"),
    offerId: v.id("offers"),
  },
  returns: v.array(
    v.object({
      id: v.id("evidenceRecords"),
      field: v.string(),
      sourceUrl: v.string(),
      sourceName: v.string(),
      status: verificationStatusValidator,
      confidence: v.number(),
      method: extractionMethodValidator,
      excerpt: v.union(v.string(), v.null()),
      collectedAt: v.number(),
      staleAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId, "viewer");
    const offer = await ctx.db.get(args.offerId);
    if (!offer || offer.organizationId !== args.organizationId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Offer not found" });
    }
    const records = await ctx.db
      .query("evidenceRecords")
      .withIndex("by_offer", (indexQuery) => indexQuery.eq("offerId", offer._id))
      .take(500);
    return records.map((record) => ({
      id: record._id,
      field: record.field,
      sourceUrl: record.sourceUrl,
      sourceName: record.sourceName,
      status: record.status,
      confidence: record.confidence,
      method: record.method,
      excerpt: record.excerpt,
      collectedAt: record.collectedAt,
      staleAt: record.staleAt,
    }));
  },
});
