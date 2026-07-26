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
          ...(user.displayName ? { displayName: user.displayName } : {}),
          ...(user.primaryEmail ? { primaryEmail: user.primaryEmail } : {}),
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

export const createInvitation = mutation({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
    emailHash: v.string(),
    tokenHash: v.string(),
    role: roleValidator,
    expiresAt: v.number(),
  },
  returns: v.id("invitations"),
  handler: async (ctx, args) => {
    const { user, membership } = await requireMembership(ctx, args.organizationId, "admin");
    assertCanManageRole(membership.role, args.role);
    const normalizedEmail = args.email.trim().toLowerCase();
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
      !/^[a-f0-9]{64}$/.test(args.emailHash) ||
      !/^[a-f0-9]{64}$/.test(args.tokenHash)
    ) {
      throw new ConvexError({ code: "INVALID_INVITATION", message: "Invitation data is invalid" });
    }
    const now = Date.now();
    if (args.expiresAt < now + 60_000 || args.expiresAt > now + 30 * 24 * 60 * 60 * 1_000) {
      throw new ConvexError({
        code: "INVALID_EXPIRY",
        message: "Invitation expiry must be between one minute and thirty days",
      });
    }

    const memberLimit = await ctx.db
      .query("entitlements")
      .withIndex("by_organization_and_key", (indexQuery) =>
        indexQuery.eq("organizationId", args.organizationId).eq("key", "members.maximum"),
      )
      .unique();
    const memberships = await ctx.db
      .query("memberships")
      .withIndex("by_organization", (indexQuery) =>
        indexQuery.eq("organizationId", args.organizationId),
      )
      .take(100);
    const pendingInvitations = await ctx.db
      .query("invitations")
      .withIndex("by_organization", (indexQuery) =>
        indexQuery.eq("organizationId", args.organizationId),
      )
      .take(100);
    const occupiedSeats =
      memberships.filter((candidate) => candidate.status === "active").length +
      pendingInvitations.filter(
        (candidate) =>
          candidate.acceptedAt === undefined &&
          candidate.revokedAt === undefined &&
          candidate.expiresAt > now,
      ).length;
    if (memberLimit?.limit !== undefined && occupiedSeats >= memberLimit.limit) {
      throw new ConvexError({
        code: "MEMBER_LIMIT_EXCEEDED",
        message: "The workspace member limit has been reached",
      });
    }

    const existing = await ctx.db
      .query("invitations")
      .withIndex("by_organization_and_email", (indexQuery) =>
        indexQuery.eq("organizationId", args.organizationId).eq("email", normalizedEmail),
      )
      .order("desc")
      .first();
    if (
      existing &&
      existing.acceptedAt === undefined &&
      existing.revokedAt === undefined &&
      existing.expiresAt > now
    ) {
      throw new ConvexError({
        code: "INVITATION_EXISTS",
        message: "An active invitation already exists for this email",
      });
    }

    const invitationId = await ctx.db.insert("invitations", {
      organizationId: args.organizationId,
      email: normalizedEmail,
      emailHash: args.emailHash,
      role: args.role,
      tokenHash: args.tokenHash,
      invitedByUserId: user._id,
      expiresAt: args.expiresAt,
      createdAt: now,
    });
    await writeAuditEvent(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      actorType: "user",
      action: "invitation.created",
      targetType: "invitation",
      targetId: invitationId,
      metadata: { role: args.role },
    });
    return invitationId;
  },
});

export const listInvitations = query({
  args: { organizationId: v.id("organizations") },
  returns: v.array(
    v.object({
      id: v.id("invitations"),
      email: v.string(),
      role: roleValidator,
      expiresAt: v.number(),
      acceptedAt: v.optional(v.number()),
      revokedAt: v.optional(v.number()),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId, "admin");
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_organization", (indexQuery) =>
        indexQuery.eq("organizationId", args.organizationId),
      )
      .order("desc")
      .take(100);
    return invitations.map((invitation) => ({
      id: invitation._id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      ...(invitation.acceptedAt === undefined ? {} : { acceptedAt: invitation.acceptedAt }),
      ...(invitation.revokedAt === undefined ? {} : { revokedAt: invitation.revokedAt }),
      createdAt: invitation.createdAt,
    }));
  },
});

export const revokeInvitation = mutation({
  args: {
    organizationId: v.id("organizations"),
    invitationId: v.id("invitations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "admin");
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation || invitation.organizationId !== args.organizationId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Invitation not found" });
    }
    if (invitation.acceptedAt === undefined) {
      await ctx.db.patch(invitation._id, { revokedAt: Date.now() });
    }
    await writeAuditEvent(ctx, {
      organizationId: args.organizationId,
      actorUserId: user._id,
      actorType: "user",
      action: "invitation.revoked",
      targetType: "invitation",
      targetId: invitation._id,
    });
    return null;
  },
});

export const acceptInvitation = mutation({
  args: { tokenHash: v.string() },
  returns: v.id("organizations"),
  handler: async (ctx, args) => {
    if (!/^[a-f0-9]{64}$/.test(args.tokenHash)) {
      throw new ConvexError({ code: "INVALID_TOKEN", message: "Invitation token is invalid" });
    }
    const user = await requireCurrentUser(ctx);
    const identity = await ctx.auth.getUserIdentity();
    const verifiedEmail =
      typeof identity?.email === "string" ? identity.email.trim().toLowerCase() : undefined;
    if (!verifiedEmail) {
      throw new ConvexError({
        code: "VERIFIED_EMAIL_REQUIRED",
        message: "A verified Clerk email is required to accept an invitation",
      });
    }
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token_hash", (indexQuery) => indexQuery.eq("tokenHash", args.tokenHash))
      .unique();
    const now = Date.now();
    if (
      !invitation ||
      invitation.revokedAt !== undefined ||
      invitation.acceptedAt !== undefined ||
      invitation.expiresAt <= now
    ) {
      throw new ConvexError({
        code: "INVITATION_UNAVAILABLE",
        message: "Invitation is invalid, expired, or already used",
      });
    }
    if (invitation.email !== verifiedEmail) {
      throw new ConvexError({
        code: "EMAIL_MISMATCH",
        message: "Sign in with the email address that received the invitation",
      });
    }

    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_organization_and_user", (indexQuery) =>
        indexQuery.eq("organizationId", invitation.organizationId).eq("userId", user._id),
      )
      .unique();
    if (existingMembership) {
      await ctx.db.patch(existingMembership._id, {
        role: invitation.role,
        status: "active",
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("memberships", {
        organizationId: invitation.organizationId,
        userId: user._id,
        role: invitation.role,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.patch(invitation._id, { acceptedAt: now });
    await writeAuditEvent(ctx, {
      organizationId: invitation.organizationId,
      actorUserId: user._id,
      actorType: "user",
      action: "invitation.accepted",
      targetType: "invitation",
      targetId: invitation._id,
      metadata: { role: invitation.role },
    });
    return invitation.organizationId;
  },
});

export const billingContext = query({
  args: { organizationId: v.id("organizations") },
  returns: v.object({
    userId: v.id("users"),
    organizationName: v.string(),
    plan: v.union(
      v.literal("closed_beta"),
      v.literal("starter"),
      v.literal("pro"),
      v.literal("business"),
    ),
    externalCustomerId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { user } = await requireMembership(ctx, args.organizationId, "admin");
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Organization not found" });
    }
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_organization", (indexQuery) =>
        indexQuery.eq("organizationId", organization._id),
      )
      .order("desc")
      .take(10);
    const subscription = subscriptions.find(
      (candidate) => candidate.externalCustomerId !== undefined,
    );
    return {
      userId: user._id,
      organizationName: organization.name,
      plan: organization.plan,
      ...(subscription?.externalCustomerId
        ? { externalCustomerId: subscription.externalCustomerId }
        : {}),
    };
  },
});
