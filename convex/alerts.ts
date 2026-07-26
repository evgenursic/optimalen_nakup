import { createEmailProvider } from "@optimalen-nakup/providers";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";

export const pendingEmailAlerts = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      alertId: v.id("alerts"),
      to: v.union(v.string(), v.null()),
      locale: v.union(v.literal("sl"), v.literal("en")),
      searchName: v.string(),
      eventType: v.string(),
      payloadJson: v.string(),
      idempotencyKey: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_state", (indexQuery) => indexQuery.eq("state", "pending"))
      .take(20);
    const results = [];
    for (const alert of alerts) {
      if (alert.channel !== "email") {
        continue;
      }
      const search = await ctx.db.get(alert.savedSearchId);
      const user = search ? await ctx.db.get(search.createdByUserId) : null;
      results.push({
        alertId: alert._id,
        to:
          search && search.organizationId === alert.organizationId && user?.primaryEmail
            ? user.primaryEmail
            : null,
        locale: user?.locale ?? "en",
        searchName: search?.name ?? "Saved search",
        eventType: alert.eventType,
        payloadJson: alert.payloadJson,
        idempotencyKey: alert.deduplicationKey,
      });
    }
    return results;
  },
});

export const finalizeEmailAlert = internalMutation({
  args: {
    alertId: v.id("alerts"),
    state: v.union(v.literal("sent"), v.literal("failed"), v.literal("skipped")),
    lastError: v.optional(v.string()),
    now: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const alert = await ctx.db.get(args.alertId);
    if (!alert || alert.channel !== "email" || alert.state !== "pending") {
      return null;
    }
    await ctx.db.patch(alert._id, {
      state: args.state,
      ...(args.lastError ? { lastError: args.lastError.slice(0, 500) } : {}),
      ...(args.state === "sent" ? { sentAt: args.now } : {}),
    });
    if (args.state === "sent") {
      await ctx.db.insert("usageLedger", {
        organizationId: alert.organizationId,
        kind: "email",
        amount: 1,
        unit: "message",
        referenceId: alert._id,
        idempotencyKey: `email:${alert.deduplicationKey}`,
        occurredAt: args.now,
      });
    }
    return null;
  },
});

export const dispatchPendingEmailAlerts = internalAction({
  args: {},
  returns: v.object({
    sent: v.number(),
    failed: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx) => {
    const alerts = await ctx.runQuery(internal.alerts.pendingEmailAlerts, {});
    const provider = createEmailProvider(process.env.RESEND_API_KEY);
    const from = process.env.EMAIL_FROM;
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    for (const alert of alerts) {
      if (!alert.to) {
        await ctx.runMutation(internal.alerts.finalizeEmailAlert, {
          alertId: alert.alertId,
          state: "skipped",
          lastError: "The saved-search owner has no verified email address",
          now: Date.now(),
        });
        skipped += 1;
        continue;
      }
      if (!provider.configured || !from) {
        await ctx.runMutation(internal.alerts.finalizeEmailAlert, {
          alertId: alert.alertId,
          state: "skipped",
          lastError: "Email transport is not configured",
          now: Date.now(),
        });
        skipped += 1;
        continue;
      }
      try {
        const subject =
          alert.locale === "sl"
            ? `Posodobitev iskanja: ${alert.searchName}`
            : `Search update: ${alert.searchName}`;
        const text =
          alert.locale === "sl"
            ? `Shranjeno iskanje »${alert.searchName}« ima novo preverjeno raziskavo (${alert.eventType}). Odprite Optimalen Nakup za rezultate in dokaze.`
            : `Saved search “${alert.searchName}” has a new verified research run (${alert.eventType}). Open Optimalen Nakup for results and evidence.`;
        const delivery = await provider.send({
          from,
          to: [alert.to],
          subject,
          text,
          idempotencyKey: alert.idempotencyKey,
          tags: [{ name: "category", value: "saved-search-alert" }],
        });
        if (delivery.status !== "sent") {
          throw new Error("Email provider did not confirm delivery");
        }
        await ctx.runMutation(internal.alerts.finalizeEmailAlert, {
          alertId: alert.alertId,
          state: "sent",
          now: Date.now(),
        });
        sent += 1;
      } catch (error) {
        await ctx.runMutation(internal.alerts.finalizeEmailAlert, {
          alertId: alert.alertId,
          state: "failed",
          lastError: error instanceof Error ? error.message : "Email delivery failed",
          now: Date.now(),
        });
        failed += 1;
      }
    }
    return { sent, failed, skipped };
  },
});
