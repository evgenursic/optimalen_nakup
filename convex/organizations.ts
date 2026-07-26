import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { assertCanManageRole, requireCurrentUser, requireMembership } from "./lib/auth";
import { writeAuditEvent } from "./lib/audit";
import { roleValidator } from "./schema";

const organizationSummary = v.object({
  id: v.id("organizations"),
  name: v.string(),
  slug: v.string(),
  plan: v.union(
    v.literal("closed_beta"),
    v.literal("starter"),
    v.literal("pro"),
    v.literal("business"),
  ),
  role: roleValidator,
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
  },
  returns: v.id("organizations"),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const slug = args.slug.trim().toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(slug)) {
      throw new ConvexError({ code: "INVALID_SLUG", message: "Organization slug is invalid" });
    }
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (indexQuery) => indexQuery.eq("slug", slug))
      .unique();
    if (existing) {
      throw new ConvexError({ code: "SLUG_TAKEN", message: "Organization slug is already used" });
    }

    const now = Date.now();
    const organizationId = await ctx.db.insert("organizations", {
      name: args.name.trim(),
      slug,
      createdByUserId: user._id,
      plan: "closed_beta",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("memberships", {
      organizationId,
      userId: user._id,
      role: "owner",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    for (const entitlement of [
      { key: "research.jobs.monthly", limit: 10 },
      { key: "research.pages.per_job", limit: 200 },
      { key: "members.maximum", limit: 3 },
    ]) {
      await ctx.db.insert("entitlements", {
        organizationId,
        key: entitlement.key,
        enabled: true,
        limit: entitlement.limit,
        source: "plan",
        updatedAt: now,
      });
    }

    await writeAuditEvent(ctx, {
      organizationId,
      actorUserId: user._id,
      actorType: "user",
      action: "organization.created",
      targetType: "organization",
      targetId: organizationId,
    });
    return organizationId;
  },
});

export const listMine = query({
  args: {},
  returns: v.array(organizationSummary),
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_user", (indexQuery) => indexQuery.eq("userId", user._id))
      .take(100);

    const results: {
      id: (typeof memberships)[number]["organizationId"];
      name: string;
      slug: string;
      plan: "closed_beta" | "starter" | "pro" | "business";
      role: (typeof memberships)[number]["role"];
    }[] = [];
    for (const membership of memberships) {
      if (membership.status !== "active") {
        continue;
      }
      const organization = await ctx.db.get(membership.organizationId);
      if (organization?.status === "active") {
        results.push({
          id: organization._id,
          name: organization.name,
          slug: organization.slug,
          plan: organization.plan,
          role: membership.role,
        });
      }
    }
    return results;
  },
});

export const listMembers = query({
  args: { organizationId: v.id("organizations") },
  returns: v.array(
    v.object({
      membershipId: v.id("memberships"),
      userId: v.id("users"),
      displayName: v.optional(v.string()),
      primaryEmail: v.optional(v.string()),
      role: roleValidator,
      status: v.union(v.literal("active"), v.literal("suspended")),
    }),
  ),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId, "viewer");
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_organization", (indexQuery) =>
        indexQuery.eq("organizationId", args.organizationId),
      )
      .take(100);
    const results = [];
    for (const membership of memberships) {
      const user = await ctx.db.get(membership.userId);
      if (user) {
        results.push({
          membershipId: membership._id,
          userId: user._id,
          displayName: user.displayName,
          primaryEmail: user.primaryEmail,
          role: membership.role,
          status: membership.status,
        });
      }
    }
    return results;
  },
});

export const updateMemberRole = mutation({
  args: {
    organizationId: v.id("organizations"),
    membershipId: v.id("memberships"),
    role: roleValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user, membership: actorMembership } = await requireMembership(
      ctx,
      args.organizationId,
      "admin",
    );
    assertCanManageRole(actorMembership.role, args.role);
    const membership = await ctx.db.get(args.membershipId);
    if (!membership || membership.organizationId !== args.organizationId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Membership not found" });
    }
    if (membership.role === "owner" && actorMembership.role !== "owner") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only owners can modify owners" });
    }
    if (membership.role === "owner" && args.role !== "owner") {
      const memberships = await ctx.db
        .query("memberships")
        .withIndex("by_organization", (indexQuery) =>
          indexQuery.eq("organizationId", args.organizationId),
        )
        .take(100);
      const activeOwnerCount = memberships.filter(
        (candidate) => candidate.status === "active" && candidate.role === "owner",
      ).length;
      if (activeOwnerCount <= 1) {
        throw new ConvexError({
          code: "LAST_OWNER",
          message: "Transfer ownership before changing the final owner",
        });
      }
    }
    await ctx.db.patch(membership._id, { role: args.role, updatedAt: Date.now() });
    await writeAuditEvent(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      actorType: "user",
      action: "membership.role_updated",
      targetType: "membership",
      targetId: membership._id,
      metadata: { role: args.role },
    });
    return null;
  },
});
