import { createHash } from "node:crypto";

import type { ExtractedOffer, SourceAdapterV1 } from "@optimalen-nakup/adapter-sdk";
import {
  type AiResult,
  type AmbiguousExtraction,
  type OpenAiEvidenceProvider,
} from "@optimalen-nakup/ai";
import {
  detectEvidenceConflicts,
  evidenceRecordV1Schema,
  makeOfferIdentity,
  offerV1Schema,
  rankOffers,
  type EvidenceRecordV1,
  type OfferEvidenceBundle,
  type RankedOffer,
  type ResearchStage,
} from "@optimalen-nakup/domain";
import type { WorkerEnvironment } from "@optimalen-nakup/config";
import type { Logger } from "pino";

import { createSourceAdapters } from "./adapters/index.js";
import { ecbDailyRatesUrl, EcbCurrencyNormalizer } from "./currency.js";
import {
  type ClaimedJob,
  type WorkerEvent,
  type WorkerProtocol,
  type WorkerRecommendation,
} from "./protocol.js";
import { OfflinePlaywrightVerifier } from "./playwright-verifier.js";
import { SourceBlockedError, SourceRuntime } from "./source-runtime.js";

const pricingVersion = "openai-api-pricing-2026-07-30";

export interface ResearchRunnerOptions {
  environment: WorkerEnvironment;
  protocol: WorkerProtocol;
  logger: Logger;
  ai: OpenAiEvidenceProvider | null;
  adapters?: SourceAdapterV1[];
  verifier?: OfflinePlaywrightVerifier | null;
  currencyNormalizer?: EcbCurrencyNormalizer;
}

interface RunState {
  startedAt: number;
  stage: ResearchStage;
  progress: number;
  pagesVisited: number;
  aiCostEur: number;
  cancelled: boolean;
  coverage: {
    sourcesPlanned: number;
    sourcesAttempted: number;
    sourcesSuccessful: number;
    listingsDiscovered: number;
    offersExtracted: number;
    offersAccepted: number;
    sourceErrors: number;
    policyBlockedSources: number;
  };
}

function sleep(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timeout = setTimeout(resolve, milliseconds);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });
}

function evidenceCoverage(bundle: OfferEvidenceBundle): number {
  if (bundle.evidence.length === 0) {
    return 0;
  }
  return (
    bundle.evidence.filter((record) => record.status === "verified").length / bundle.evidence.length
  );
}

function inferredEvidence(
  offer: ExtractedOffer["offer"],
  field: string,
  value: unknown,
  confidence: number,
): EvidenceRecordV1 {
  const excerpt =
    value === null || value === undefined
      ? null
      : (typeof value === "string" ? value : JSON.stringify(value)).slice(0, 500);
  return evidenceRecordV1Schema.parse({
    schemaVersion: 1,
    offerSourceId: offer.sourceId,
    field,
    sourceUrl: offer.canonicalUrl,
    sourceName: offer.sourceId,
    collectedAt: offer.collectedAt,
    status: excerpt === null ? "missing" : "inferred",
    confidence: excerpt === null ? 0 : Math.min(0.79, confidence),
    method: "ai_structured",
    excerpt,
    contentHash: createHash("sha256")
      .update(`${field}:${excerpt ?? "missing"}`)
      .digest("hex"),
    staleAt: offer.staleAfter,
  });
}

function mergeAmbiguousExtraction(
  extracted: ExtractedOffer,
  ai: AmbiguousExtraction,
): ExtractedOffer {
  let offer = extracted.offer;
  const evidence = [...extracted.evidence];
  if (!offer.basePrice && ai.basePrice) {
    offer = offerV1Schema.parse({
      ...offer,
      basePrice: ai.basePrice,
      totalInitialCost: ai.basePrice,
      estimatedTotalCost: ai.basePrice,
    });
    evidence.push(inferredEvidence(offer, "basePrice", ai.basePrice.amount, ai.confidence));
  }
  if (offer.availability === "unknown" && ai.availability !== "unknown") {
    offer = offerV1Schema.parse({ ...offer, availability: ai.availability });
    evidence.push(inferredEvidence(offer, "availability", ai.availability, ai.confidence));
  }
  if (!offer.warranty && ai.warranty) {
    offer = offerV1Schema.parse({ ...offer, warranty: ai.warranty });
    evidence.push(inferredEvidence(offer, "warranty", ai.warranty, ai.confidence));
  }
  return {
    ...extracted,
    offer,
    evidence,
    warnings: [...new Set([...extracted.warnings, ...ai.warnings])],
  };
}

function deterministicRecommendations(
  ranked: RankedOffer[],
  offerIds: ReadonlyMap<string, string>,
  mode: WorkerRecommendation["mode"],
): WorkerRecommendation[] {
  return ranked.slice(0, 10).map((bundle, index) => {
    const identityKey = makeOfferIdentity(bundle.offer);
    const offerId = offerIds.get(identityKey);
    return {
      ...(offerId ? { offerId } : {}),
      mode,
      rank: index + 1,
      headline: bundle.offer.title,
      rationale: bundle.score.topReasons.join(". "),
      caveats: bundle.score.topRisks,
      evidenceCoverage: evidenceCoverage(bundle),
      unsupportedClaimCount: 0,
    };
  });
}

export function selectSynthesisCandidates<T>(ranked: readonly T[], maxOffers: number): T[] {
  return ranked.slice(0, maxOffers);
}

export class ResearchRunner {
  private readonly adapters: SourceAdapterV1[];
  private readonly verifier: OfflinePlaywrightVerifier | null;
  private readonly currencyNormalizer: EcbCurrencyNormalizer;

  constructor(private readonly options: ResearchRunnerOptions) {
    const approvedIds = new Set(
      options.environment.WORKER_APPROVED_SOURCE_IDS.split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    );
    this.adapters = options.adapters ?? createSourceAdapters(approvedIds);
    this.verifier =
      options.verifier === undefined
        ? options.environment.WORKER_ENABLE_PLAYWRIGHT_VERIFICATION
          ? new OfflinePlaywrightVerifier()
          : null
        : options.verifier;
    this.currencyNormalizer = options.currencyNormalizer ?? new EcbCurrencyNormalizer();
  }

  async run(signal: AbortSignal): Promise<void> {
    const active = new Set<Promise<void>>();
    try {
      while (!signal.aborted) {
        while (active.size < this.options.environment.WORKER_MAX_CONCURRENCY && !signal.aborted) {
          const leaseToken = this.options.protocol.createLeaseToken();
          const job = await this.options.protocol.claim(leaseToken);
          if (!job) {
            break;
          }
          const running = this.processJob(job, leaseToken, signal)
            .catch((error: unknown) => {
              this.options.logger.error(
                { error, jobId: job.jobId },
                "research job processing failed",
              );
            })
            .finally(() => {
              active.delete(running);
            });
          active.add(running);
        }
        if (active.size === 0) {
          await sleep(2_000, signal);
        } else {
          await Promise.race([Promise.race(active), sleep(2_000, signal)]);
        }
      }
      await Promise.allSettled(active);
    } finally {
      await this.verifier?.close();
    }
  }

  private async processJob(
    job: ClaimedJob,
    leaseToken: string,
    serviceSignal: AbortSignal,
  ): Promise<void> {
    const startedAt = Date.now();
    const jobController = new AbortController();
    const timeout = setTimeout(
      () => jobController.abort(new Error("job_runtime_budget_exceeded")),
      job.maxRuntimeSeconds * 1_000,
    );
    const signal = AbortSignal.any([serviceSignal, jobController.signal]);
    const state: RunState = {
      startedAt,
      stage: "source_discovery",
      progress: 1,
      pagesVisited: 0,
      aiCostEur: 0,
      cancelled: job.cancelRequested,
      coverage: {
        sourcesPlanned: 0,
        sourcesAttempted: 0,
        sourcesSuccessful: 0,
        listingsDiscovered: 0,
        offersExtracted: 0,
        offersAccepted: 0,
        sourceErrors: 0,
        policyBlockedSources: 0,
      },
    };
    let sequence = 0;
    let heartbeatInFlight = false;
    let heartbeatFailure: unknown;
    const heartbeat = async () => {
      if (heartbeatInFlight || heartbeatFailure) {
        return;
      }
      heartbeatInFlight = true;
      try {
        const result = await this.options.protocol.heartbeat(job.jobId, leaseToken, {
          stage: state.stage,
          progress: state.progress,
          pagesVisited: state.pagesVisited,
          runtimeSeconds: Math.floor((Date.now() - startedAt) / 1_000),
          aiCostEur: state.aiCostEur,
          coverage: state.coverage,
        });
        if (result.cancelRequested) {
          state.cancelled = true;
          jobController.abort(new Error("job_cancel_requested"));
        }
      } catch (error) {
        heartbeatFailure = error;
        jobController.abort(error);
      } finally {
        heartbeatInFlight = false;
      }
    };
    const heartbeatTimer = setInterval(() => {
      void heartbeat();
    }, 15_000);
    const emit = async (type: string, stage: ResearchStage, payload: Record<string, unknown>) => {
      sequence += 1;
      const event: WorkerEvent = {
        sequence,
        type,
        stage,
        payload,
        createdAt: Date.now(),
      };
      await this.options.protocol.appendEvents(job.jobId, leaseToken, [event]);
    };

    try {
      await heartbeat();
      await emit("job_started", "source_discovery", {
        attempt: job.attempt,
        category: job.filterSpec.category,
      });
      const selectedAdapters = this.adapters.filter((adapter) =>
        adapter.manifest.categories.includes(job.filterSpec.category),
      );
      state.coverage.sourcesPlanned = selectedAdapters.length;
      const approvedAdapters: SourceAdapterV1[] = [];
      for (const adapter of selectedAdapters) {
        if (adapter.manifest.policyStatus !== "approved") {
          state.coverage.policyBlockedSources += 1;
          await this.options.protocol.updateSourceHealth({
            sourceId: adapter.manifest.id,
            status: "legal_review_required",
            robotsReviewedAt: Date.parse(adapter.manifest.policyReviewedAt),
            termsReviewedAt: Date.parse(adapter.manifest.policyReviewedAt),
            detail: adapter.manifest.policyNotes,
          });
          await emit("source_policy_blocked", "source_discovery", {
            sourceId: adapter.manifest.id,
          });
        } else {
          approvedAdapters.push(adapter);
        }
      }

      const collected: OfferEvidenceBundle[] = [];
      for (const adapter of approvedAdapters) {
        if (signal.aborted || state.cancelled) {
          break;
        }
        state.coverage.sourcesAttempted += 1;
        let sourceProducedOffer = false;
        const runtime = new SourceRuntime({
          manifest: adapter.manifest,
          signal,
          beforeRequest: async () => {
            if (signal.aborted || state.cancelled || state.pagesVisited >= job.maxPages) {
              throw new Error("page_or_cancellation_budget_reached");
            }
          },
          onRequest: async () => {
            state.pagesVisited += 1;
            state.progress = Math.min(65, 5 + state.pagesVisited);
            await heartbeat();
          },
          onProgress: async (event) => {
            if (event.type === "listing_discovered") {
              state.coverage.listingsDiscovered += 1;
            }
          },
        });
        const context = runtime.context();
        try {
          for await (const page of adapter.plan(job.filterSpec, context)) {
            if (signal.aborted || state.cancelled) {
              break;
            }
            state.stage = "collection";
            const listings = await adapter.discover(page, context);
            state.coverage.listingsDiscovered += listings.length;
            await emit("listings_discovered", "collection", {
              sourceId: adapter.manifest.id,
              count: listings.length,
            });
            for (const listing of listings) {
              if (signal.aborted || state.cancelled || state.pagesVisited >= job.maxPages) {
                break;
              }
              let extracted = await adapter.extract(listing, job.filterSpec, context);
              if (
                this.verifier &&
                extracted.warnings.length > 0 &&
                extracted.untrustedCapturedHtml
              ) {
                state.stage = "detail_verification";
                try {
                  const verification = await this.verifier.verify(
                    extracted.untrustedCapturedHtml,
                    extracted.offer,
                  );
                  extracted = {
                    ...extracted,
                    warnings: [
                      ...extracted.warnings,
                      ...(!verification.titleVisible ? ["playwright_title_not_visible"] : []),
                      ...(verification.priceVisible === false
                        ? ["playwright_price_not_visible"]
                        : []),
                    ],
                  };
                  await emit("playwright_verification_completed", "detail_verification", {
                    sourceId: adapter.manifest.id,
                    titleVisible: verification.titleVisible,
                    priceVisible: verification.priceVisible,
                    renderedTextLength: verification.renderedTextLength,
                  });
                } catch (error) {
                  extracted = {
                    ...extracted,
                    warnings: [...extracted.warnings, "playwright_verification_unavailable"],
                  };
                  this.options.logger.warn(
                    { error, jobId: job.jobId, sourceId: adapter.manifest.id },
                    "offline Playwright verification was unavailable",
                  );
                } finally {
                  state.stage = "collection";
                }
              }
              if (
                this.options.ai &&
                extracted.warnings.length > 0 &&
                extracted.untrustedSourceText
              ) {
                try {
                  const aiResult = await this.options.ai.extractAmbiguousPage({
                    sanitizedPageText: extracted.untrustedSourceText,
                    deterministicFields: extracted.offer,
                    locale: job.locale,
                    category: job.filterSpec.category,
                    safetyIdentifier: this.safetyIdentifier(job.organizationId),
                  });
                  await this.recordAiCost(job, leaseToken, aiResult, "extraction", state);
                  extracted = mergeAmbiguousExtraction(extracted, aiResult.data);
                } catch (error) {
                  this.options.logger.warn(
                    { error, jobId: job.jobId, sourceId: adapter.manifest.id },
                    "AI extraction fallback failed; retaining deterministic evidence",
                  );
                }
              }
              const normalization = await this.currencyNormalizer.normalize(extracted.offer);
              if (normalization.converted && normalization.sourceDate) {
                state.stage = "normalization";
                const excerpt = `${normalization.originalCurrencies.join(", ")} converted to EUR using ECB reference rates published ${normalization.sourceDate}`;
                extracted = {
                  ...extracted,
                  offer: normalization.offer,
                  evidence: [
                    ...extracted.evidence,
                    evidenceRecordV1Schema.parse({
                      schemaVersion: 1,
                      offerSourceId: normalization.offer.sourceId,
                      field: "currencyNormalization",
                      sourceUrl: ecbDailyRatesUrl.toString(),
                      sourceName: "European Central Bank",
                      collectedAt: new Date().toISOString(),
                      status: "secondary",
                      confidence: 1,
                      method: "api",
                      excerpt,
                      contentHash: createHash("sha256").update(excerpt).digest("hex"),
                      staleAt: new Date(
                        Date.parse(`${normalization.sourceDate}T00:00:00.000Z`) +
                          48 * 60 * 60 * 1_000,
                      ).toISOString(),
                    }),
                  ],
                };
                await emit("currency_normalized", "normalization", {
                  sourceId: adapter.manifest.id,
                  originalCurrencies: normalization.originalCurrencies,
                  rateDate: normalization.sourceDate,
                });
                state.stage = "collection";
              }
              collected.push({
                offer: extracted.offer,
                evidence: extracted.evidence,
              });
              state.coverage.offersExtracted += 1;
              sourceProducedOffer = true;
            }
          }
          if (sourceProducedOffer) {
            state.coverage.sourcesSuccessful += 1;
          }
          await this.options.protocol.updateSourceHealth({
            sourceId: adapter.manifest.id,
            status: sourceProducedOffer ? "healthy" : "degraded",
            robotsReviewedAt: Date.parse(adapter.manifest.policyReviewedAt),
            termsReviewedAt: Date.parse(adapter.manifest.policyReviewedAt),
            detail: sourceProducedOffer
              ? "Policy, robots, sitemap, and at least one detail extraction succeeded"
              : "Source was reachable but produced no matching offers",
          });
        } catch (error) {
          state.coverage.sourceErrors += 1;
          const blocked = error instanceof SourceBlockedError;
          await this.options.protocol.updateSourceHealth({
            sourceId: adapter.manifest.id,
            status: blocked ? "blocked" : "degraded",
            robotsReviewedAt: Date.parse(adapter.manifest.policyReviewedAt),
            termsReviewedAt: Date.parse(adapter.manifest.policyReviewedAt),
            detail: error instanceof Error ? error.message : "Source failed",
          });
          await emit("source_failed", state.stage, {
            sourceId: adapter.manifest.id,
            blocked,
          });
        }
      }

      if (heartbeatFailure) {
        throw heartbeatFailure;
      }
      state.stage = "conflict_detection";
      state.progress = 70;
      const conflictChecked = detectEvidenceConflicts(collected);
      state.stage = "scoring";
      const ranked = rankOffers(conflictChecked, job.filterSpec).slice(0, 100);
      state.coverage.offersAccepted = ranked.length;
      const offerIds = new Map<string, string>();
      for (const bundle of ranked) {
        const identityKey = makeOfferIdentity(bundle.offer);
        const offerId = await this.options.protocol.upsertOffer(job.jobId, leaseToken, {
          offer: bundle.offer,
          identityKey,
          rawContentHash: createHash("sha256").update(JSON.stringify(bundle.offer)).digest("hex"),
          evidence: bundle.evidence,
          score: bundle.score,
        });
        offerIds.set(identityKey, offerId);
      }

      state.stage = "final_report";
      state.progress = 90;
      let recommendations = deterministicRecommendations(ranked, offerIds, job.filterSpec.mode);
      if (this.options.ai && ranked.length > 0) {
        try {
          const synthesisCandidates = selectSynthesisCandidates(
            ranked,
            this.options.environment.WORKER_MAX_SYNTHESIS_OFFERS,
          );
          const synthesis = await this.options.ai.synthesize({
            offers: synthesisCandidates.map((bundle) => ({
              offerKey: makeOfferIdentity(bundle.offer),
              title: bundle.offer.title,
              score: bundle.score.total,
              totalCostEur:
                bundle.offer.estimatedTotalCost?.amount ??
                bundle.offer.totalInitialCost?.amount ??
                null,
              availability: bundle.offer.availability,
              facts: bundle.evidence.map((record) => ({
                field: record.field,
                value: record.excerpt,
                status: record.status,
                sourceUrl: record.sourceUrl,
              })),
            })),
            filter: job.filterSpec,
            locale: job.locale,
            safetyIdentifier: this.safetyIdentifier(job.organizationId),
          });
          await this.recordAiCost(job, leaseToken, synthesis, "synthesis", state);
          const rankedByKey = new Map(
            ranked.map((bundle) => [makeOfferIdentity(bundle.offer), bundle]),
          );
          recommendations = synthesis.data
            .sort((left, right) => left.rank - right.rank)
            .flatMap((recommendation, index) => {
              const bundle = rankedByKey.get(recommendation.offerKey);
              if (!bundle) {
                return [];
              }
              const offerId = offerIds.get(recommendation.offerKey);
              return {
                ...(offerId ? { offerId } : {}),
                mode: job.filterSpec.mode,
                rank: index + 1,
                headline: recommendation.headline,
                rationale: recommendation.claims.map((claim) => claim.text).join(" "),
                caveats: recommendation.caveats,
                evidenceCoverage: evidenceCoverage(bundle),
                unsupportedClaimCount: 0,
              };
            });
        } catch (error) {
          await emit("synthesis_fallback", "final_report", {
            reason: error instanceof Error ? error.name : "unknown",
          });
        }
      }
      if (recommendations.length > 0) {
        await this.options.protocol.replaceRecommendations(job.jobId, leaseToken, recommendations);
      }
      state.progress = 100;
      const partial =
        state.cancelled ||
        state.coverage.sourcesSuccessful < state.coverage.sourcesPlanned ||
        ranked.length === 0;
      await this.options.protocol.complete(job.jobId, leaseToken, partial, state.coverage);
    } catch (error) {
      const cancelled = state.cancelled || signal.aborted;
      try {
        if (cancelled) {
          await this.options.protocol.complete(job.jobId, leaseToken, true, state.coverage);
        } else {
          await this.options.protocol.fail(job.jobId, leaseToken, {
            retryable: !(error instanceof SourceBlockedError),
            failureCode:
              error instanceof SourceBlockedError ? "SOURCE_BLOCKED" : "WORKER_EXECUTION_FAILED",
            failureMessage: error instanceof Error ? error.message : "Worker execution failed",
            coverage: state.coverage,
          });
        }
      } catch (completionError) {
        this.options.logger.error(
          { error: completionError, jobId: job.jobId },
          "failed to report terminal worker state",
        );
      }
    } finally {
      clearInterval(heartbeatTimer);
      clearTimeout(timeout);
    }
  }

  private safetyIdentifier(organizationId: string): string {
    return `on_${createHash("sha256").update(organizationId).digest("hex").slice(0, 48)}`;
  }

  private async recordAiCost<T>(
    job: ClaimedJob,
    leaseToken: string,
    result: AiResult<T>,
    purpose: "extraction" | "synthesis",
    state: RunState,
  ): Promise<void> {
    const usdToEurRate = this.options.environment.OPENAI_USD_TO_EUR_RATE;
    if (result.usage.estimatedCostUsd === null || usdToEurRate === undefined) {
      throw new Error("AI cost conversion is not configured");
    }
    const estimatedCostEur =
      Math.round(result.usage.estimatedCostUsd * usdToEurRate * 1_000_000_000) / 1_000_000_000;
    await this.options.protocol.recordModelCost(job.jobId, leaseToken, {
      model: result.model,
      purpose,
      inputTokens: result.usage.inputTokens,
      cachedInputTokens: result.usage.cachedInputTokens,
      cacheWriteTokens: result.usage.cacheWriteTokens,
      outputTokens: result.usage.outputTokens,
      reasoningTokens: result.usage.reasoningTokens,
      estimatedCostUsd: result.usage.estimatedCostUsd,
      estimatedCostEur,
      usdToEurRate,
      pricingVersion,
      requestId: result.responseId,
    });
    state.aiCostEur += estimatedCostEur;
    await this.options.protocol.heartbeat(job.jobId, leaseToken, {
      stage: state.stage,
      progress: state.progress,
      pagesVisited: state.pagesVisited,
      runtimeSeconds: Math.floor((Date.now() - state.startedAt) / 1_000),
      aiCostEur: state.aiCostEur,
      coverage: state.coverage,
    });
  }
}
