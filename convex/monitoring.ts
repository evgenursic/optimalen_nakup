import { v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { writeAuditEvent } from "./lib/audit";

const hourMs = 60 * 60 * 1_000;

export const queueDueSavedSearches = internalMutation({
  args: {},
  returns: v.object({
    queued: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const searches = await ctx.db
      .query("savedSearches")
      .withIndex("by_active_and_last_scheduled", (indexQuery) => indexQuery.eq("active", true))
      .take(100);
    let queued = 0;
    let skipped = 0;
    for (const search of searches) {
      const intervalHours = search.monitoringIntervalHours ?? 24;
      const intervalMs = intervalHours * hourMs;
      const latestJob = await ctx.db
        .query("researchJobs")
        .withIndex("by_request", (indexQuery) =>
          indexQuery.eq("researchRequestId", search.researchRequestId),
        )
        .order("desc")
        .first();
      const lastRunAt = Math.max(search.lastScheduledAt ?? 0, latestJob?.createdAt ?? 0);
      if (lastRunAt > now - intervalMs) {
        skipped += 1;
        continue;
      }
      const [organization, request, creatorMembership] = await Promise.all([
        ctx.db.get(search.organizationId),
        ctx.db.get(search.researchRequestId),
        ctx.db
          .query("memberships")
          .withIndex("by_organization_and_user", (indexQuery) =>
            indexQuery
              .eq("organizationId", search.organizationId)
              .eq("userId", search.createdByUserId),
          )
          .unique(),
      ]);
      if (
        organization?.status !== "active" ||
        !request ||
        request.organizationId !== search.organizationId ||
        request.status === "archived" ||
        !request.activeFilterId ||
        creatorMembership?.status !== "active" ||
        !["owner", "admin", "researcher"].includes(creatorMembership.role)
      ) {
        skipped += 1;
        continue;
      }
      const filter = await ctx.db.get(request.activeFilterId);
      if (
        !filter ||
        filter.organizationId !== search.organizationId ||
        filter.spec.confirmedAt === null
      ) {
        skipped += 1;
        continue;
      }
      const [jobEntitlement, pageEntitlement] = await Promise.all([
        ctx.db
          .query("entitlements")
          .withIndex("by_organization_and_key", (indexQuery) =>
            indexQuery
              .eq("organizationId", search.organizationId)
              .eq("key", "research.jobs.monthly"),
          )
          .unique(),
        ctx.db
          .query("entitlements")
          .withIndex("by_organization_and_key", (indexQuery) =>
            indexQuery
              .eq("organizationId", search.organizationId)
              .eq("key", "research.pages.per_job"),
          )
          .unique(),
      ]);
      if (!jobEntitlement?.enabled || jobEntitlement.limit === undefined) {
        skipped += 1;
        continue;
      }
      const currentDate = new Date(now);
      const monthStart = Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1);
      const monthlyJobs = await ctx.db
        .query("usageLedger")
        .withIndex("by_organization_kind_and_occurred_at", (indexQuery) =>
          indexQuery
            .eq("organizationId", search.organizationId)
            .eq("kind", "research_job")
            .gte("occurredAt", monthStart),
        )
        .take(jobEntitlement.limit + 1);
      if (monthlyJobs.length >= jobEntitlement.limit) {
        skipped += 1;
        continue;
      }
      const period = Math.floor(now / intervalMs);
      const idempotencyKey = `monitor:${search._id}:${period}`;
      const existing = await ctx.db
        .query("researchJobs")
        .withIndex("by_idempotency_key", (indexQuery) =>
          indexQuery.eq("idempotencyKey", idempotencyKey),
        )
        .unique();
      if (existing) {
        await ctx.db.patch(search._id, { lastScheduledAt: now, updatedAt: now });
        skipped += 1;
        continue;
      }
      const maxPages = Math.max(1, Math.min(200, pageEntitlement?.limit ?? 100));
      const jobId = await ctx.db.insert("researchJobs", {
        organizationId: search.organizationId,
        researchRequestId: request._id,
        filterId: filter._id,
        requestedByUserId: search.createdByUserId,
        state: "queued",
        stage: "research_plan",
        progress: 0,
        priority: -1,
        attempt: 0,
        maxAttempts: 3,
        idempotencyKey,
        pagesVisited: 0,
        maxPages,
        runtimeSeconds: 0,
        maxRuntimeSeconds: 1_800,
        aiCostEur: 0,
        maxAiCostEur: 2,
        coverageJson: JSON.stringify({ sourcesAttempted: 0, sourcesSuccessful: 0 }),
        nextAttemptAt: now,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(search._id, { lastScheduledAt: now, updatedAt: now });
      await ctx.db.insert("usageLedger", {
        organizationId: search.organizationId,
        kind: "research_job",
        amount: 1,
        unit: "job",
        referenceId: jobId,
        idempotencyKey: `job:${jobId}`,
        occurredAt: now,
      });
      await writeAuditEvent(ctx, {
        organizationId: search.organizationId,
        actorType: "system",
        action: "monitoring.job_queued",
        targetType: "research_job",
        targetId: jobId,
        metadata: { savedSearchId: search._id, intervalHours },
      });
      queued += 1;
    }
    return { queued, skipped };
  },
});
