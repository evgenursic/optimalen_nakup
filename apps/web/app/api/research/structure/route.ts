import { createHash } from "node:crypto";

import { categorySchema } from "@optimalen-nakup/domain";
import { OpenAiEvidenceProvider } from "@optimalen-nakup/ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { api } from "@convex/_generated/api";

import { getAuthenticatedConvex, hasSameOrigin } from "@/lib/server-auth";

const requestSchema = z.object({
  organizationId: z.string().min(1).max(200),
  request: z.string().trim().min(3).max(4_000),
  locale: z.enum(["sl", "en"]),
  categoryHint: categorySchema.nullable(),
});

const allowedModels = new Set(["gpt-5.6-luna", "gpt-5.6-terra", "gpt-5.6-sol"]);

function model(value: string | undefined, fallback: string): string {
  return value && allowedModels.has(value) ? value : fallback;
}

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") ?? "0") > 20_000) {
    return NextResponse.json({ error: "request_too_large" }, { status: 413 });
  }
  const authenticated = await getAuthenticatedConvex();
  if (!authenticated) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const workspaces = await authenticated.client.query(api.organizations.listMine, {});
  if (!workspaces.some((workspace) => workspace.id === parsed.data.organizationId)) {
    return NextResponse.json({ error: "workspace_forbidden" }, { status: 403 });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  const usdToEurRate = Number(process.env.OPENAI_USD_TO_EUR_RATE);
  const costIngestSecret = process.env.AI_COST_INGEST_SECRET;
  if (
    !apiKey ||
    !Number.isFinite(usdToEurRate) ||
    usdToEurRate <= 0 ||
    !costIngestSecret ||
    costIngestSecret.length < 32
  ) {
    return NextResponse.json(
      { error: "ai_not_configured", manualConfirmationAvailable: true },
      { status: 503 },
    );
  }
  const provider = new OpenAiEvidenceProvider({
    apiKey,
    routerModel: model(process.env.OPENAI_MODEL_ROUTER, "gpt-5.6-luna"),
    extractorModel: model(process.env.OPENAI_MODEL_EXTRACTOR, "gpt-5.6-terra"),
    synthesizerModel: model(process.env.OPENAI_MODEL_SYNTHESIZER, "gpt-5.6-sol"),
  });
  try {
    const result = await provider.structureFilter({
      request: parsed.data.request,
      locale: parsed.data.locale,
      categoryHint: parsed.data.categoryHint,
      safetyIdentifier: `on_${createHash("sha256")
        .update(authenticated.clerkUserId)
        .digest("hex")
        .slice(0, 48)}`,
    });
    if (result.usage.estimatedCostUsd === null) {
      throw new Error("Model pricing is unavailable");
    }
    await authenticated.client.mutation(api.research.recordIntakeModelCost, {
      organizationId: parsed.data.organizationId as never,
      model: result.model,
      inputTokens: result.usage.inputTokens,
      cachedInputTokens: result.usage.cachedInputTokens,
      cacheWriteTokens: result.usage.cacheWriteTokens,
      outputTokens: result.usage.outputTokens,
      reasoningTokens: result.usage.reasoningTokens,
      estimatedCostUsd: result.usage.estimatedCostUsd,
      estimatedCostEur: result.usage.estimatedCostUsd * usdToEurRate,
      usdToEurRate,
      pricingVersion: "openai-api-pricing-2026-07-30",
      requestId: result.responseId,
      ingestSecret: costIngestSecret,
    });
    return NextResponse.json(
      {
        filter: result.data,
        model: result.model,
        responseId: result.responseId,
        estimatedCostUsd: result.usage.estimatedCostUsd,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "ai_structure_failed" }, { status: 502 });
  }
}
