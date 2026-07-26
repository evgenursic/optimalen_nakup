import { ConvexError, v } from "convex/values";

import { internalMutation } from "./_generated/server";
import { writeAuditEvent } from "./lib/audit";
import { planValidator } from "./schema";

const entitlementLimits = {
  closed_beta: {
    "research.jobs.monthly": 10,
    "research.pages.per_job": 200,
    "members.maximum": 3,
  },
  starter: {
    "research.jobs.monthly": 30,
    "research.pages.per_job": 250,
    "members.maximum": 3,
  },
  pro: {
    "research.jobs.monthly": 150,
    "research.pages.per_job": 500,
    "members.maximum": 10,
  },
  business: {
    "research.jobs.monthly": 1_000,
    "research.pages.per_job": 1_000,
    "members.maximum": 50,
  },
} as const;

export const processSubscriptionEvent = internalMutation({
  args: {
    externalEventId: v.string(),
    eventType: v.string(),
    payloadHash: v.string(),
    organizationId: v.optional(v.id("organizations")),
    externalCustomerId: v.optional(v.string()),
    externalSubscriptionId: v.optional(v.string()),
    externalVariantId: v.optional(v.string()),
    plan: planValidator,
    status: v.string(),
    renewsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    receivedAt: v.number(),
  },
  returns: v.object({
    duplicate: v.boolean(),
    applied: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const existingDelivery = await ctx.db
      .query("webhookDeliveries")
      .withIndex("by_external_event", (indexQuery) =>
        indexQuery.eq("provider", "lemon_squeezy").eq("externalEventId", args.externalEventId),
      )
      .unique();
    if (existingDelivery) {
      if (existingDelivery.payloadHash !== args.payloadHash) {
        throw new ConvexError({
          code: "WEBHOOK_REPLAY_MISMATCH",
          message: "Webhook event identifier was replayed with different content",
        });
      }
      return {
        duplicate: true,
        applied: existingDelivery.state === "processed",
      };
    }

    const deliveryId = await ctx.db.insert("webhookDeliveries", {
      organizationId: args.organizationId,
      provider: "lemon_squeezy",
      externalEventId: args.externalEventId,
      eventType: args.eventType,
      payloadHash: args.payloadHash,
      state: "received",
      attempts: 1,
      receivedAt: args.receivedAt,
    });

    if (!args.organizationId) {
      await ctx.db.patch(deliveryId, {
        state: "failed",
        lastError: "Missing organization identifier in signed webhook custom data",
      });
      return { duplicate: false, applied: false };
    }
    const organization = await ctx.db.get(args.organizationId);
    if (!organization) {
      await ctx.db.patch(deliveryId, {
        state: "failed",
        lastError: "Organization does not exist",
      });
      return { duplicate: false, applied: false };
    }

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_organization", (indexQuery) =>
        indexQuery.eq("organizationId", organization._id),
      )
      .take(10);
    const subscription = args.externalSubscriptionId
      ? subscriptions.find(
          (candidate) => candidate.externalSubscriptionId === args.externalSubscriptionId,
        )
      : subscriptions[0];
    const now = args.receivedAt;
    const subscriptionPatch = {
      externalCustomerId: args.externalCustomerId,
      externalSubscriptionId: args.externalSubscriptionId,
      externalVariantId: args.externalVariantId,
      plan: args.plan,
      status: args.status,
      renewsAt: args.renewsAt,
      endsAt: args.endsAt,
      updatedAt: now,
    };
    if (subscription) {
      await ctx.db.patch(subscription._id, subscriptionPatch);
    } else {
      await ctx.db.insert("subscriptions", {
        organizationId: organization._id,
        provider: "lemon_squeezy",
        ...subscriptionPatch,
        createdAt: now,
      });
    }

    const isEntitled = !["expired", "unpaid"].includes(args.status);
    const effectivePlan = isEntitled ? args.plan : "closed_beta";
    await ctx.db.patch(organization._id, {
      plan: effectivePlan,
      updatedAt: now,
    });
    const limits = entitlementLimits[effectivePlan];
    for (const [key, limit] of Object.entries(limits)) {
      const existingEntitlement = await ctx.db
        .query("entitlements")
        .withIndex("by_organization_and_key", (indexQuery) =>
          indexQuery.eq("organizationId", organization._id).eq("key", key),
        )
        .unique();
      if (existingEntitlement) {
        await ctx.db.patch(existingEntitlement._id, {
          enabled: true,
          limit,
          source: "plan",
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("entitlements", {
          organizationId: organization._id,
          key,
          enabled: true,
          limit,
          source: "plan",
          updatedAt: now,
        });
      }
    }
    await ctx.db.patch(deliveryId, {
      state: "processed",
      processedAt: now,
    });
    await writeAuditEvent(ctx, {
      organizationId: organization._id,
      actorType: "system",
      action: `billing.${args.eventType}`,
      targetType: "subscription",
      targetId: args.externalSubscriptionId ?? deliveryId,
      metadata: { plan: effectivePlan, status: args.status },
    });
    return { duplicate: false, applied: true };
  },
});
