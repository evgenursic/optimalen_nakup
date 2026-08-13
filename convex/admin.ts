import { ConvexError, v } from "convex/values";

import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser, requireMembership } from "./lib/auth";

function platformAdminSubjects(): Set<string> {
  return new Set(
    (process.env.PLATFORM_ADMIN_CLERK_USER_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

async function requirePlatformAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity || !platformAdminSubjects().has(identity.subject)) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Platform operator access is required" });
  }
  return await requireCurrentUser(ctx);
}

export const organizationOverview = query({
  args: { organizationId: v.id("organizations") },
  returns: v.object({
    entitlements: v.array(
      v.object({
        key: v.string(),
        enabled: v.boolean(),
        limit: v.optional(v.number()),
        source: v.union(v.literal("plan"), v.literal("override")),
      }),
    ),
    usage: v.object({
      jobsThisMonth: v.number(),
      pagesThisMonth: v.number(),
      aiInputTokensThisMonth: v.number(),
      aiOutputTokensThisMonth: v.number(),
    }),
    recentAuditEvents: v.array(
      v.object({
        id: v.id("auditEvents"),
        actorType: v.union(v.literal("user"), v.literal("worker"), v.literal("system")),
        action: v.string(),
        targetType: v.string(),
        targetId: v.string(),
        metadataJson: v.string(),
        occurredAt: v.number(),
      }),
    ),
    modelCostEur: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId, "admin");
    const entitlements = await ctx.db
      .query("entitlements")
      .withIndex("by_organization", (indexQuery) =>
        indexQuery.eq("organizationId", args.organizationId),
      )
      .take(100);
    const currentDate = new Date();
    const monthStart = Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), 1);
    const usageEntries = await ctx.db
      .query("usageLedger")
      .withIndex("by_organization_and_occurred_at", (indexQuery) =>
        indexQuery.eq("organizationId", args.organizationId).gte("occurredAt", monthStart),
      )
      .take(10_000);
    const modelCosts = await ctx.db
      .query("modelCosts")
      .withIndex("by_organization", (indexQuery) =>
        indexQuery.eq("organizationId", args.organizationId),
      )
      .order("desc")
      .take(10_000);
    const recentAuditEvents = await ctx.db
      .query("auditEvents")
      .withIndex("by_organization_and_occurred_at", (indexQuery) =>
        indexQuery.eq("organizationId", args.organizationId),
      )
      .order("desc")
      .take(50);
    const amountFor = (kind: (typeof usageEntries)[number]["kind"]) =>
      usageEntries
        .filter((entry) => entry.kind === kind)
        .reduce((sum, entry) => sum + entry.amount, 0);
    return {
      entitlements: entitlements.map((entitlement) => ({
        key: entitlement.key,
        enabled: entitlement.enabled,
        ...(entitlement.limit === undefined ? {} : { limit: entitlement.limit }),
        source: entitlement.source,
      })),
      usage: {
        jobsThisMonth: amountFor("research_job"),
        pagesThisMonth: amountFor("page_fetch"),
        aiInputTokensThisMonth: amountFor("ai_input_token"),
        aiOutputTokensThisMonth: amountFor("ai_output_token"),
      },
      recentAuditEvents: recentAuditEvents.map((event) => ({
        id: event._id,
        actorType: event.actorType,
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId,
        metadataJson: event.metadataJson,
        occurredAt: event.occurredAt,
      })),
      modelCostEur: modelCosts
        .filter((cost) => cost.createdAt >= monthStart)
        .reduce((sum, cost) => sum + cost.estimatedCostEur, 0),
    };
  },
});

export const sourceHealth = query({
  args: { organizationId: v.id("organizations") },
  returns: v.array(
    v.object({
      id: v.id("sourceHealth"),
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
      lastCheckedAt: v.number(),
      lastSuccessAt: v.optional(v.number()),
      consecutiveFailures: v.number(),
      latencyMs: v.optional(v.number()),
      detail: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId, "admin");
    const sources = await ctx.db.query("sourceHealth").take(100);
    return sources.map((source) => ({
      id: source._id,
      sourceId: source.sourceId,
      status: source.status,
      robotsReviewedAt: source.robotsReviewedAt,
      termsReviewedAt: source.termsReviewedAt,
      lastCheckedAt: source.lastCheckedAt,
      ...(source.lastSuccessAt === undefined ? {} : { lastSuccessAt: source.lastSuccessAt }),
      consecutiveFailures: source.consecutiveFailures,
      ...(source.latencyMs === undefined ? {} : { latencyMs: source.latencyMs }),
      detail: source.detail,
    }));
  },
});

export const isPlatformAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    return Boolean(identity && platformAdminSubjects().has(identity.subject));
  },
});

export const listApplicationSettings = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("applicationSettings"),
      key: v.string(),
      valueJson: v.string(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    await requirePlatformAdmin(ctx);
    const settings = await ctx.db.query("applicationSettings").take(200);
    return settings
      .filter((setting) => !setting.sensitive)
      .map((setting) => ({
        id: setting._id,
        key: setting.key,
        valueJson: setting.valueJson,
        updatedAt: setting.updatedAt,
      }));
  },
});

export const setApplicationSetting = mutation({
  args: {
    key: v.string(),
    valueJson: v.string(),
  },
  returns: v.id("applicationSettings"),
  handler: async (ctx, args) => {
    const user = await requirePlatformAdmin(ctx);
    const key = args.key.trim();
    const normalizedKey = key.toLowerCase();
    if (
      !/^[a-z][A-Za-z0-9_.-]{2,119}$/.test(key) ||
      args.valueJson.length > 20_000 ||
      ["secret", "password", "token", "apikey", "api_key", "webhook"].some((term) =>
        normalizedKey.includes(term),
      )
    ) {
      throw new ConvexError({ code: "INVALID_SETTING", message: "Setting is invalid" });
    }
    try {
      JSON.parse(args.valueJson);
    } catch {
      throw new ConvexError({ code: "INVALID_JSON", message: "Setting value must be valid JSON" });
    }
    const existing = await ctx.db
      .query("applicationSettings")
      .withIndex("by_key", (indexQuery) => indexQuery.eq("key", key))
      .unique();
    const value = {
      valueJson: args.valueJson,
      sensitive: false,
      updatedByUserId: user._id,
      updatedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, value);
      return existing._id;
    }
    return await ctx.db.insert("applicationSettings", { key, ...value });
  },
});
