import { ConvexError } from "convex/values";

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type OrganizationRole = "owner" | "admin" | "researcher" | "viewer";
type AuthContext = Pick<QueryCtx, "auth" | "db"> | Pick<MutationCtx, "auth" | "db">;

const roleRank: Record<OrganizationRole, number> = {
  viewer: 0,
  researcher: 1,
  admin: 2,
  owner: 3,
};

export async function requireCurrentUser(ctx: AuthContext): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({ code: "UNAUTHENTICATED", message: "Authentication is required" });
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (query) => query.eq("clerkUserId", identity.subject))
    .unique();

  if (!user || user.status !== "active") {
    throw new ConvexError({
      code: "ACCOUNT_UNAVAILABLE",
      message: "The authenticated account is not active",
    });
  }

  return user;
}

export async function requireMembership(
  ctx: AuthContext,
  organizationId: Id<"organizations">,
  minimumRole: OrganizationRole = "viewer",
): Promise<{ user: Doc<"users">; membership: Doc<"memberships"> }> {
  const user = await requireCurrentUser(ctx);
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_organization_and_user", (query) =>
      query.eq("organizationId", organizationId).eq("userId", user._id),
    )
    .unique();

  if (
    !membership ||
    membership.status !== "active" ||
    roleRank[membership.role] < roleRank[minimumRole]
  ) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "You do not have access to this organization",
    });
  }

  return { user, membership };
}

export function assertCanManageRole(
  actorRole: OrganizationRole,
  targetRole: OrganizationRole,
): void {
  if (actorRole !== "owner" && (targetRole === "owner" || roleRank[targetRole] >= roleRank.admin)) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Only owners can manage owners and administrators",
    });
  }
}
