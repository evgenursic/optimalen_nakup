import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function writeAuditEvent(
  ctx: MutationCtx,
  input: {
    organizationId: Id<"organizations">;
    actorUserId?: Id<"users">;
    actorType: "user" | "worker" | "system";
    action: string;
    targetType: string;
    targetId: string;
    metadata?: Record<string, string | number | boolean | null>;
  },
): Promise<void> {
  await ctx.db.insert("auditEvents", {
    organizationId: input.organizationId,
    ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
    actorType: input.actorType,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    metadataJson: JSON.stringify(input.metadata ?? {}),
    occurredAt: Date.now(),
  });
}
