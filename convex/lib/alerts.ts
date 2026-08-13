import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function enqueueCompletionAlerts(
  ctx: MutationCtx,
  job: Doc<"researchJobs">,
  now: number,
  partial: boolean,
): Promise<void> {
  const searches = await ctx.db
    .query("savedSearches")
    .withIndex("by_organization", (indexQuery) =>
      indexQuery.eq("organizationId", job.organizationId),
    )
    .take(1_000);
  const request = await ctx.db.get(job.researchRequestId);
  if (!request || request.organizationId !== job.organizationId) {
    return;
  }
  const eventType = partial ? "research_completed_partial" : "research_completed";
  for (const search of searches) {
    if (!search.active || search.researchRequestId !== job.researchRequestId) {
      continue;
    }
    for (const channel of [
      "in_app" as const,
      ...((search.emailEnabled ?? false) ? (["email"] as const) : []),
    ]) {
      const deduplicationKey = `saved-search:${search._id}:job:${job._id}:${channel}`;
      const existing = await ctx.db
        .query("alerts")
        .withIndex("by_deduplication_key", (indexQuery) =>
          indexQuery.eq("deduplicationKey", deduplicationKey),
        )
        .unique();
      if (existing) {
        continue;
      }
      await ctx.db.insert("alerts", {
        organizationId: job.organizationId,
        savedSearchId: search._id,
        channel,
        eventType,
        deduplicationKey,
        payloadJson: JSON.stringify({
          schemaVersion: 1,
          jobId: job._id,
          title: request.title,
          partial,
        }),
        state: channel === "in_app" ? "sent" : "pending",
        ...(channel === "in_app" ? { sentAt: now } : {}),
        createdAt: now,
      });
    }
  }
}
