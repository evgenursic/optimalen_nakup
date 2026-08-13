import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { writeAuditEvent } from "./lib/audit";
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
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (indexQuery) => indexQuery.eq("userId", user._id))
      .take(100);
    for (const membership of memberships) {
      if (membership.status !== "active" || membership.role !== "owner") {
        continue;
      }
      const organization = await ctx.db.get(membership.organizationId);
      if (organization?.status !== "active") {
        continue;
      }
      const organizationMemberships = await ctx.db
        .query("memberships")
        .withIndex("by_organization", (indexQuery) =>
          indexQuery.eq("organizationId", organization._id),
        )
        .take(100);
      if (
        organizationMemberships.filter(
          (candidate) => candidate.status === "active" && candidate.role === "owner",
        ).length <= 1
      ) {
        throw new ConvexError({
          code: "LAST_OWNER",
          message: "Transfer workspace ownership before deleting this account",
        });
      }
    }
    const now = Date.now();
    await ctx.db.patch(user._id, {
      status: "deletion_pending",
      deletionRequestedAt: now,
      updatedAt: now,
    });
    return null;
  },
});

function requireDeletionSecret(secret: string): void {
  const configured = process.env.ACCOUNT_DELETION_INGEST_SECRET;
  if (!configured || configured.length < 32 || secret !== configured) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Account deletion service authorization is required",
    });
  }
}

export const restoreFailedAccountDeletion = mutation({
  args: {
    clerkUserId: v.string(),
    ingestSecret: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireDeletionSecret(args.ingestSecret);
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (indexQuery) => indexQuery.eq("clerkUserId", args.clerkUserId))
      .unique();
    if (user?.status === "deletion_pending") {
      await ctx.db.patch(user._id, {
        status: "active",
        deletionRequestedAt: undefined,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

export const finalizeAccountDeletion = mutation({
  args: {
    clerkUserId: v.string(),
    ingestSecret: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireDeletionSecret(args.ingestSecret);
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (indexQuery) => indexQuery.eq("clerkUserId", args.clerkUserId))
      .unique();
    if (!user || user.status !== "deletion_pending") {
      throw new ConvexError({
        code: "ACCOUNT_NOT_PENDING",
        message: "Account is not pending deletion",
      });
    }
    const now = Date.now();
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (indexQuery) => indexQuery.eq("userId", user._id))
      .take(100);
    const deactivatedSearchIds = new Set<string>();
    for (const membership of memberships) {
      if (membership.status === "active") {
        await ctx.db.patch(membership._id, { status: "suspended", updatedAt: now });
      }
      await writeAuditEvent(ctx, {
        organizationId: membership.organizationId,
        actorType: "system",
        action: "account.deleted",
        targetType: "user",
        targetId: user._id,
      });
      const searches = await ctx.db
        .query("savedSearches")
        .withIndex("by_organization_and_creator", (indexQuery) =>
          indexQuery
            .eq("organizationId", membership.organizationId)
            .eq("createdByUserId", user._id),
        )
        .take(100);
      for (const search of searches) {
        if (!deactivatedSearchIds.has(search._id)) {
          deactivatedSearchIds.add(search._id);
          await ctx.db.patch(search._id, {
            active: false,
            emailEnabled: false,
            updatedAt: now,
          });
        }
      }
    }
    await ctx.db.patch(user._id, {
      clerkUserId: `deleted:${user._id}:${now}`,
      primaryEmail: undefined,
      displayName: undefined,
      status: "deleted",
      deletedAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const exportMyData = query({
  args: {},
  returns: v.string(),
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
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (indexQuery) => indexQuery.eq("userId", user._id))
      .take(100);
    const workspaces = [];
    for (const membership of memberships) {
      const organization = await ctx.db.get(membership.organizationId);
      if (!organization) {
        continue;
      }
      const requests = await ctx.db
        .query("researchRequests")
        .withIndex("by_organization_and_creator", (indexQuery) =>
          indexQuery.eq("organizationId", organization._id).eq("createdByUserId", user._id),
        )
        .order("desc")
        .take(100);
      const savedSearches = await ctx.db
        .query("savedSearches")
        .withIndex("by_organization_and_creator", (indexQuery) =>
          indexQuery.eq("organizationId", organization._id).eq("createdByUserId", user._id),
        )
        .order("desc")
        .take(100);
      workspaces.push({
        organization: {
          id: organization._id,
          name: organization.name,
          slug: organization.slug,
          plan: organization.plan,
          status: organization.status,
          createdAt: organization.createdAt,
        },
        membership: {
          role: membership.role,
          status: membership.status,
          createdAt: membership.createdAt,
        },
        researchRequests: requests.map((request) => ({
          id: request._id,
          title: request.title,
          originalInput: request.originalInput,
          locale: request.locale,
          category: request.category,
          status: request.status,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
        })),
        savedSearches: savedSearches.map((search) => ({
          id: search._id,
          researchRequestId: search.researchRequestId,
          name: search.name,
          active: search.active,
          emailEnabled: search.emailEnabled ?? false,
          monitoringIntervalHours: search.monitoringIntervalHours ?? 24,
          lastScheduledAt: search.lastScheduledAt,
          createdAt: search.createdAt,
          updatedAt: search.updatedAt,
        })),
      });
    }
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        account: {
          id: user._id,
          clerkUserId: user.clerkUserId,
          primaryEmail: user.primaryEmail,
          displayName: user.displayName,
          locale: user.locale,
          status: user.status,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        workspaces,
      },
      null,
      2,
    );
  },
});
