import { ConvexError, v } from "convex/values";

import { mutation } from "./_generated/server";
import { categoryValidator, localeValidator } from "./schema";

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
