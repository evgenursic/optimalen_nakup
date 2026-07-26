import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { httpAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";

const http = httpRouter();
const encoder = new TextEncoder();

type JsonRecord = Record<string, unknown>;

function jsonResponse(value: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

function asRecord(value: unknown, label = "request body"): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return value as JsonRecord;
}

function requiredString(record: JsonRecord, key: string, minimumLength = 1): string {
  const value = record[key];
  if (typeof value !== "string" || value.length < minimumLength) {
    throw new Error(`${key} must be a string`);
  }
  return value;
}

function requiredNumber(record: JsonRecord, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${key} must be a finite number`);
  }
  return value;
}

function requiredBoolean(record: JsonRecord, key: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new Error(`${key} must be a boolean`);
  }
  return value;
}

function optionalString(record: JsonRecord, key: string): string | undefined {
  const value = record[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`${key} must be a string`);
  }
  return value;
}

async function hexDigest(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmacHex(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqualHex(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(left) || !/^[a-f0-9]{64}$/.test(right)) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function handleWorkerRequest(
  ctx: ActionCtx,
  request: Request,
  expectedPath: string,
  operation: (
    body: JsonRecord,
    auth: {
      workerId: string;
      now: number;
    },
  ) => Promise<unknown>,
): Promise<Response> {
  const secret = process.env.WORKER_SHARED_SECRET;
  if (!secret || secret.length < 32) {
    return jsonResponse({ error: "worker_auth_not_configured" }, 503);
  }
  const rawBody = await request.text();
  if (encoder.encode(rawBody).byteLength > 2 * 1024 * 1024) {
    return jsonResponse({ error: "payload_too_large" }, 413);
  }

  const workerId = request.headers.get("x-worker-id") ?? "";
  const timestamp = request.headers.get("x-worker-timestamp") ?? "";
  const nonce = request.headers.get("x-worker-nonce") ?? "";
  const idempotencyKey = request.headers.get("x-idempotency-key") ?? "";
  const signature = request.headers.get("x-worker-signature") ?? "";
  const parsedTimestamp = Date.parse(timestamp);
  const now = Date.now();
  if (
    workerId.length < 3 ||
    nonce.length < 16 ||
    idempotencyKey.length < 8 ||
    !Number.isFinite(parsedTimestamp) ||
    Math.abs(now - parsedTimestamp) > 5 * 60 * 1_000
  ) {
    return jsonResponse({ error: "invalid_worker_headers" }, 401);
  }

  const canonical = [
    request.method.toUpperCase(),
    expectedPath,
    timestamp,
    nonce,
    idempotencyKey,
    rawBody,
  ].join("\n");
  const expectedSignature = await hmacHex(canonical, secret);
  if (!constantTimeEqualHex(signature, expectedSignature)) {
    return jsonResponse({ error: "invalid_worker_signature" }, 401);
  }

  const nonceAccepted = await ctx.runMutation(internal.worker.consumeNonce, {
    workerId,
    nonce,
    now,
    expiresAt: now + 5 * 60 * 1_000,
  });
  if (!nonceAccepted) {
    return jsonResponse({ error: "nonce_replayed" }, 409);
  }

  const bodyHash = await hexDigest(rawBody);
  const requestState = await ctx.runMutation(internal.worker.beginRequest, {
    workerId,
    idempotencyKey,
    path: expectedPath,
    bodyHash,
    now,
  });
  if (requestState.status === "replay") {
    return new Response(requestState.responseJson, {
      status: 200,
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
        "x-idempotent-replay": "true",
      },
    });
  }
  if (requestState.status === "busy") {
    return jsonResponse({ error: "request_in_progress" }, 409, { "retry-after": "2" });
  }
  if (requestState.status === "conflict") {
    return jsonResponse({ error: "idempotency_conflict" }, 409);
  }

  try {
    const parsedBody = asRecord(JSON.parse(rawBody));
    const result = await operation(parsedBody, { workerId, now });
    const responseJson = JSON.stringify({ ok: true, data: result });
    await ctx.runMutation(internal.worker.completeRequest, {
      requestId: requestState.requestId,
      responseJson,
      now: Date.now(),
    });
    return new Response(responseJson, {
      status: 200,
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    await ctx.runMutation(internal.worker.abandonRequest, {
      requestId: requestState.requestId,
    });
    const message = error instanceof Error ? error.message : "Worker request failed";
    return jsonResponse({ error: "worker_request_rejected", message }, 400);
  }
}

http.route({
  path: "/healthz",
  method: "GET",
  handler: httpAction(async () =>
    jsonResponse({
      status: "ok",
      service: "optimalen-nakup-convex",
      version: process.env.APP_VERSION ?? "development",
    }),
  ),
});

http.route({
  path: "/worker/jobs/claim",
  method: "POST",
  handler: httpAction(async (ctx, request) =>
    handleWorkerRequest(ctx, request, "/worker/jobs/claim", async (body, auth) => {
      const leaseToken = requiredString(body, "leaseToken", 32);
      return await ctx.runMutation(internal.worker.claimJob, {
        workerId: auth.workerId,
        leaseTokenHash: await hexDigest(leaseToken),
        now: auth.now,
        leaseDurationMs: requiredNumber(body, "leaseDurationMs"),
      });
    }),
  ),
});

http.route({
  path: "/worker/jobs/heartbeat",
  method: "POST",
  handler: httpAction(async (ctx, request) =>
    handleWorkerRequest(ctx, request, "/worker/jobs/heartbeat", async (body, auth) => {
      return await ctx.runMutation(internal.worker.heartbeat, {
        jobId: requiredString(body, "jobId") as Id<"researchJobs">,
        workerId: auth.workerId,
        leaseTokenHash: await hexDigest(requiredString(body, "leaseToken", 32)),
        now: auth.now,
        leaseDurationMs: requiredNumber(body, "leaseDurationMs"),
        stage: requiredString(body, "stage") as never,
        progress: requiredNumber(body, "progress"),
        pagesVisited: requiredNumber(body, "pagesVisited"),
        runtimeSeconds: requiredNumber(body, "runtimeSeconds"),
        aiCostEur: requiredNumber(body, "aiCostEur"),
        coverageJson: requiredString(body, "coverageJson"),
      });
    }),
  ),
});

http.route({
  path: "/worker/jobs/events",
  method: "POST",
  handler: httpAction(async (ctx, request) =>
    handleWorkerRequest(ctx, request, "/worker/jobs/events", async (body, auth) => {
      if (!Array.isArray(body.events)) {
        throw new Error("events must be an array");
      }
      return await ctx.runMutation(internal.worker.appendEvents, {
        jobId: requiredString(body, "jobId") as Id<"researchJobs">,
        workerId: auth.workerId,
        leaseTokenHash: await hexDigest(requiredString(body, "leaseToken", 32)),
        now: auth.now,
        events: body.events as never,
      });
    }),
  ),
});

http.route({
  path: "/worker/jobs/offers",
  method: "POST",
  handler: httpAction(async (ctx, request) =>
    handleWorkerRequest(ctx, request, "/worker/jobs/offers", async (body, auth) => {
      if (!Array.isArray(body.evidence)) {
        throw new Error("evidence must be an array");
      }
      return await ctx.runMutation(internal.worker.upsertOfferBundle, {
        jobId: requiredString(body, "jobId") as Id<"researchJobs">,
        workerId: auth.workerId,
        leaseTokenHash: await hexDigest(requiredString(body, "leaseToken", 32)),
        now: auth.now,
        offer: asRecord(body.offer, "offer") as never,
        evidence: body.evidence as never,
        score: asRecord(body.score, "score") as never,
      });
    }),
  ),
});

http.route({
  path: "/worker/jobs/recommendations",
  method: "POST",
  handler: httpAction(async (ctx, request) =>
    handleWorkerRequest(ctx, request, "/worker/jobs/recommendations", async (body, auth) => {
      if (!Array.isArray(body.recommendations)) {
        throw new Error("recommendations must be an array");
      }
      return await ctx.runMutation(internal.worker.replaceRecommendations, {
        jobId: requiredString(body, "jobId") as Id<"researchJobs">,
        workerId: auth.workerId,
        leaseTokenHash: await hexDigest(requiredString(body, "leaseToken", 32)),
        now: auth.now,
        recommendations: body.recommendations as never,
      });
    }),
  ),
});

http.route({
  path: "/worker/jobs/complete",
  method: "POST",
  handler: httpAction(async (ctx, request) =>
    handleWorkerRequest(ctx, request, "/worker/jobs/complete", async (body, auth) => {
      return await ctx.runMutation(internal.worker.complete, {
        jobId: requiredString(body, "jobId") as Id<"researchJobs">,
        workerId: auth.workerId,
        leaseTokenHash: await hexDigest(requiredString(body, "leaseToken", 32)),
        now: auth.now,
        partial: requiredBoolean(body, "partial"),
        coverageJson: requiredString(body, "coverageJson"),
      });
    }),
  ),
});

http.route({
  path: "/worker/jobs/fail",
  method: "POST",
  handler: httpAction(async (ctx, request) =>
    handleWorkerRequest(ctx, request, "/worker/jobs/fail", async (body, auth) => {
      return await ctx.runMutation(internal.worker.fail, {
        jobId: requiredString(body, "jobId") as Id<"researchJobs">,
        workerId: auth.workerId,
        leaseTokenHash: await hexDigest(requiredString(body, "leaseToken", 32)),
        now: auth.now,
        retryable: requiredBoolean(body, "retryable"),
        failureCode: requiredString(body, "failureCode"),
        failureMessage: requiredString(body, "failureMessage"),
        coverageJson: requiredString(body, "coverageJson"),
      });
    }),
  ),
});

http.route({
  path: "/webhooks/lemon-squeezy",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    if (!secret || secret.length < 32) {
      return jsonResponse({ error: "billing_webhook_not_configured" }, 503);
    }
    const rawBody = await request.text();
    if (encoder.encode(rawBody).byteLength > 1024 * 1024) {
      return jsonResponse({ error: "payload_too_large" }, 413);
    }
    const receivedSignature = request.headers.get("x-signature") ?? "";
    const expectedSignature = await hmacHex(rawBody, secret);
    if (!constantTimeEqualHex(receivedSignature, expectedSignature)) {
      return jsonResponse({ error: "invalid_webhook_signature" }, 401);
    }

    try {
      const payload = asRecord(JSON.parse(rawBody));
      const meta = asRecord(payload.meta, "meta");
      const data = asRecord(payload.data, "data");
      const attributes = asRecord(data.attributes, "data.attributes");
      const customData =
        meta.custom_data === undefined ? {} : asRecord(meta.custom_data, "meta.custom_data");
      const eventType = requiredString(meta, "event_name");
      const externalSubscriptionId = requiredString(data, "id");
      const externalVariantId = String(attributes.variant_id ?? "");
      const variantPlans = new Map<string, "starter" | "pro" | "business">();
      for (const [planName, identifiers] of [
        [
          "starter",
          [
            process.env.LEMON_SQUEEZY_STARTER_MONTHLY_VARIANT_ID,
            process.env.LEMON_SQUEEZY_STARTER_ANNUAL_VARIANT_ID,
          ],
        ],
        [
          "pro",
          [
            process.env.LEMON_SQUEEZY_PRO_MONTHLY_VARIANT_ID,
            process.env.LEMON_SQUEEZY_PRO_ANNUAL_VARIANT_ID,
          ],
        ],
        [
          "business",
          [
            process.env.LEMON_SQUEEZY_BUSINESS_MONTHLY_VARIANT_ID,
            process.env.LEMON_SQUEEZY_BUSINESS_ANNUAL_VARIANT_ID,
          ],
        ],
      ] as const) {
        for (const identifier of identifiers) {
          if (identifier) {
            variantPlans.set(identifier, planName);
          }
        }
      }
      const mappedPlan = variantPlans.get(externalVariantId);
      if (!mappedPlan) {
        return jsonResponse({ error: "unknown_billing_variant" }, 422);
      }
      const payloadHash = await hexDigest(rawBody);
      const updatedAt = optionalString(attributes, "updated_at") ?? payloadHash;
      const externalEventId =
        request.headers.get("x-event-id") ?? `${eventType}:${externalSubscriptionId}:${updatedAt}`;
      const organizationId = optionalString(customData, "organization_id") as
        Id<"organizations"> | undefined;
      const parseOptionalDate = (key: string) => {
        const value = optionalString(attributes, key);
        if (!value) {
          return undefined;
        }
        const parsed = Date.parse(value);
        if (!Number.isFinite(parsed)) {
          throw new Error(`${key} must be an ISO timestamp`);
        }
        return parsed;
      };
      const renewsAt = parseOptionalDate("renews_at");
      const endsAt = parseOptionalDate("ends_at");
      const result = await ctx.runMutation(internal.billing.processSubscriptionEvent, {
        externalEventId,
        eventType,
        payloadHash,
        ...(organizationId ? { organizationId } : {}),
        ...(attributes.customer_id === undefined
          ? {}
          : { externalCustomerId: String(attributes.customer_id) }),
        externalSubscriptionId,
        externalVariantId,
        plan: mappedPlan,
        status: requiredString(attributes, "status"),
        ...(renewsAt === undefined ? {} : { renewsAt }),
        ...(endsAt === undefined ? {} : { endsAt }),
        receivedAt: Date.now(),
      });
      return jsonResponse({ ok: true, ...result });
    } catch {
      return jsonResponse({ error: "invalid_webhook_payload" }, 400);
    }
  }),
});

export default http;
