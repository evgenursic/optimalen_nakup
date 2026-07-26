import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { localeValidator } from "./schema";

const userResult = v.object({
  id: v.id("users"),
  clerkUserId: v.string(),
  primaryEmail: v.optional(v.string()),
  displayName: v.optional(v.string()),
  locale: localeValidator,
  status: v.union(v.literal("active"), v.literal("deletion_pending"), v.literal("deleted")),
});

export const syncCurrentUser = mutation({
  args: {
    displayName: v.optional(v.string()),
    locale: localeValidator,
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "Authentication is required" });
    }

    const now = Date.now();
    const verifiedEmail =
      typeof identity.email === "string" ? identity.email.toLowerCase() : undefined;
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (indexQuery) => indexQuery.eq("clerkUserId", identity.subject))
      .unique();

    if (existing) {
      if (existing.status === "deleted") {
        throw new ConvexError({
          code: "ACCOUNT_DELETED",
          message: "This account has been deleted",
        });
      }
      await ctx.db.patch(existing._id, {
        ...(verifiedEmail ? { primaryEmail: verifiedEmail } : {}),
        ...(args.displayName ? { displayName: args.displayName } : {}),
        locale: args.locale,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkUserId: identity.subject,
      ...(verifiedEmail ? { primaryEmail: verifiedEmail } : {}),
      ...(args.displayName ? { displayName: args.displayName } : {}),
      locale: args.locale,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const me = query({
  args: {},
  returns: v.union(userResult, v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (indexQuery) => indexQuery.eq("clerkUserId", identity.subject))
      .unique();
    if (!user) {
      return null;
    }
    return {
      id: user._id,
      clerkUserId: user.clerkUserId,
      ...(user.primaryEmail ? { primaryEmail: user.primaryEmail } : {}),
      ...(user.displayName ? { displayName: user.displayName } : {}),
      locale: user.locale,
      status: user.status,
    };
  },
});

export const requestAccountDeletion = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "Authentication is required" });
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (indexQuery) => indexQuery.eq("clerkUserId", identity.subject))
      .unique();
    if (!user) {
      throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
    }
    await ctx.db.patch(user._id, {
      status: "deletion_pending",
      updatedAt: Date.now(),
    });
    return null;
  },
});
