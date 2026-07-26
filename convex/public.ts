import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireMembership } from "./lib/auth";
import { categoryValidator, localeValidator } from "./schema";

const configuredPrice = v.object({
  monthly: v.number(),
  annual: v.number(),
});

const publicPricingValidator = v.object({
  currency: v.literal("EUR"),
  starter: configuredPrice,
  pro: configuredPrice,
  business: configuredPrice,
  updatedAt: v.number(),
});

interface PricingPlan {
  monthly: number;
  annual: number;
}

function parsePricingPlan(value: unknown): PricingPlan | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.monthly !== "number" ||
    !Number.isFinite(record.monthly) ||
    record.monthly <= 0 ||
    typeof record.annual !== "number" ||
    !Number.isFinite(record.annual) ||
    record.annual <= 0
  ) {
    return null;
  }
  return { monthly: record.monthly, annual: record.annual };
}

export const getPublicPricing = query({
  args: {},
  returns: v.union(publicPricingValidator, v.null()),
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("applicationSettings")
      .withIndex("by_key", (indexQuery) => indexQuery.eq("key", "billing.publicPricing"))
      .unique();
    if (!setting || setting.sensitive) {
      return null;
    }
    try {
      const decoded = JSON.parse(setting.valueJson) as Record<string, unknown>;
      const starter = parsePricingPlan(decoded.starter);
      const pro = parsePricingPlan(decoded.pro);
      const business = parsePricingPlan(decoded.business);
      if (decoded.currency !== "EUR" || !starter || !pro || !business) {
        return null;
      }
      return {
        currency: "EUR" as const,
        starter,
        pro,
        business,
        updatedAt: setting.updatedAt,
      };
    } catch {
      return null;
    }
  },
});

export const joinWaitlist = mutation({
  args: {
    email: v.string(),
    emailHash: v.string(),
    locale: localeValidator,
    categories: v.array(categoryValidator),
    source: v.string(),
    rateLimitKey: v.string(),
  },
  returns: v.object({ created: v.boolean() }),
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !/^[a-f0-9]{64}$/.test(args.emailHash) ||
      !/^[a-f0-9]{64}$/.test(args.rateLimitKey) ||
      args.categories.length > 4 ||
      args.source.length > 100
    ) {
      throw new ConvexError({
        code: "INVALID_WAITLIST_ENTRY",
        message: "Waitlist data is invalid",
      });
    }
    const now = Date.now();
    const rateLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (indexQuery) => indexQuery.eq("key", args.rateLimitKey))
      .unique();
    if (rateLimit && rateLimit.expiresAt > now && rateLimit.count >= 5) {
      throw new ConvexError({
        code: "RATE_LIMITED",
        message: "Too many waitlist requests; try again later",
      });
    }
    if (rateLimit && rateLimit.expiresAt > now) {
      await ctx.db.patch(rateLimit._id, { count: rateLimit.count + 1 });
    } else {
      if (rateLimit) {
        await ctx.db.delete(rateLimit._id);
      }
      await ctx.db.insert("rateLimits", {
        key: args.rateLimitKey,
        count: 1,
        windowStartedAt: now,
        expiresAt: now + 10 * 60 * 1_000,
      });
    }

    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_normalized_email", (indexQuery) => indexQuery.eq("normalizedEmail", email))
      .unique();
    if (existing) {
      return { created: false };
    }
    await ctx.db.insert("waitlist", {
      normalizedEmail: email,
      emailHash: args.emailHash,
      locale: args.locale,
      categoriesJson: JSON.stringify([...new Set(args.categories)]),
      consentVersion: "closed-beta-v1",
      source: args.source,
      createdAt: now,
    });
    return { created: true };
  },
});

export const recordWebVital = mutation({
  args: {
    organizationId: v.optional(v.id("organizations")),
    route: v.string(),
    metric: v.union(v.literal("LCP"), v.literal("INP"), v.literal("CLS"), v.literal("TTFB")),
    value: v.number(),
    rating: v.union(v.literal("good"), v.literal("needs-improvement"), v.literal("poor")),
    navigationType: v.string(),
    appVersion: v.string(),
    rateLimitKey: v.string(),
    ingestSecret: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const configuredSecret = process.env.WEB_VITALS_INGEST_SECRET;
    if (
      !configuredSecret ||
      configuredSecret.length < 32 ||
      args.ingestSecret !== configuredSecret ||
      !/^[a-f0-9]{64}$/.test(args.rateLimitKey) ||
      !/^\/(?:sl|en)(?:\/[a-z0-9/_-]*)?$/.test(args.route) ||
      !Number.isFinite(args.value) ||
      args.value < 0 ||
      args.value > 10_000_000 ||
      args.navigationType.length > 80 ||
      args.appVersion.length > 100
    ) {
      throw new ConvexError({ code: "INVALID_WEB_VITAL", message: "Web Vital is invalid" });
    }
    const now = Date.now();
    const rateLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (indexQuery) => indexQuery.eq("key", args.rateLimitKey))
      .unique();
    if (rateLimit && rateLimit.expiresAt > now && rateLimit.count >= 120) {
      throw new ConvexError({ code: "RATE_LIMITED", message: "Web Vital rate limit reached" });
    }
    if (rateLimit && rateLimit.expiresAt > now) {
      await ctx.db.patch(rateLimit._id, { count: rateLimit.count + 1 });
    } else {
      if (rateLimit) {
        await ctx.db.delete(rateLimit._id);
      }
      await ctx.db.insert("rateLimits", {
        key: args.rateLimitKey,
        count: 1,
        windowStartedAt: now,
        expiresAt: now + 10 * 60 * 1_000,
      });
    }
    if (args.organizationId) {
      await requireMembership(ctx, args.organizationId, "viewer");
    }
    await ctx.db.insert("webVitals", {
      ...(args.organizationId ? { organizationId: args.organizationId } : {}),
      route: args.route,
      metric: args.metric,
      value: args.value,
      rating: args.rating,
      navigationType: args.navigationType,
      appVersion: args.appVersion,
      recordedAt: now,
    });
    return null;
  },
});
