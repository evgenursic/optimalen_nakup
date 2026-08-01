import { parseWorkerEnvironment } from "@optimalen-nakup/config";
import { defaultScoringWeights, type FilterSpecV1 } from "@optimalen-nakup/domain";
import pino from "pino";
import { describe, expect, it, vi } from "vitest";

import type { ClaimedJob, WorkerProtocol } from "./protocol.js";
import { ResearchRunner, selectSynthesisCandidates } from "./research-runner.js";

const filter: FilterSpecV1 = {
  schemaVersion: 1,
  category: "computers",
  mode: "best_overall",
  query: "razvojni prenosnik",
  hardRequirements: [],
  preferences: [],
  exclusions: [],
  budget: null,
  geography: { countries: ["SI"], maximumDistanceKm: null, origin: null },
  acceptableConditions: ["new"],
  timing: { neededBy: null, maximumDeliveryDays: null },
  riskTolerance: "medium",
  weights: defaultScoringWeights,
  confirmedAt: "2026-07-26T12:00:00.000Z",
};

describe("ResearchRunner", () => {
  it("bounds AI synthesis to the configured ranked prefix", () => {
    expect(selectSynthesisCandidates(["first", "second", "third"], 2)).toEqual([
      "first",
      "second",
    ]);
  });

  it("preserves coverage and completes partially when no approved source is available", async () => {
    const serviceController = new AbortController();
    const job: ClaimedJob = {
      jobId: "job-1",
      organizationId: "organization-1",
      researchRequestId: "request-1",
      locale: "sl",
      filterSpec: filter,
      attempt: 1,
      maxPages: 20,
      maxRuntimeSeconds: 60,
      maxAiCostEur: 1,
      cancelRequested: false,
      leaseExpiresAt: Date.now() + 60_000,
    };
    let claimed = false;
    const complete = vi.fn(async () => {
      serviceController.abort();
    });
    const protocol: WorkerProtocol = {
      createLeaseToken: () => "lease-token",
      claim: vi.fn(async () => {
        if (claimed) {
          return null;
        }
        claimed = true;
        return job;
      }),
      heartbeat: vi.fn(async () => ({
        cancelRequested: false,
        leaseExpiresAt: Date.now() + 60_000,
      })),
      appendEvents: vi.fn(async () => 1),
      upsertOffer: vi.fn(async () => "offer-1"),
      replaceRecommendations: vi.fn(async () => 0),
      recordModelCost: vi.fn(async () => true),
      updateSourceHealth: vi.fn(async () => undefined),
      complete,
      fail: vi.fn(async () => ({ state: "failed" as const, nextAttemptAt: Date.now() })),
    };
    const runner = new ResearchRunner({
      environment: parseWorkerEnvironment({
        NODE_ENV: "test",
        WORKER_ENABLE_PLAYWRIGHT_VERIFICATION: "false",
      }),
      protocol,
      logger: pino({ level: "silent" }),
      ai: null,
      adapters: [],
      verifier: null,
    });

    await runner.run(serviceController.signal);

    expect(complete).toHaveBeenCalledWith(
      "job-1",
      "lease-token",
      true,
      expect.objectContaining({
        sourcesPlanned: 0,
        offersAccepted: 0,
      }),
    );
    expect(protocol.fail).not.toHaveBeenCalled();
  });
});
