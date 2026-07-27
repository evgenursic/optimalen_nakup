import { describe, expect, it } from "vitest";

import { parseWorkerEnvironment } from "./index.js";

describe("worker environment", () => {
  it("defaults to one concurrent job for cautious source access", () => {
    expect(parseWorkerEnvironment({}).WORKER_MAX_CONCURRENCY).toBe(1);
  });

  it("allows an explicitly reviewed bounded concurrency override", () => {
    expect(parseWorkerEnvironment({ WORKER_MAX_CONCURRENCY: "3" }).WORKER_MAX_CONCURRENCY).toBe(3);
  });

  it("treats an empty optional exchange rate as unconfigured", () => {
    expect(parseWorkerEnvironment({ OPENAI_USD_TO_EUR_RATE: "" }).OPENAI_USD_TO_EUR_RATE).toBe(
      undefined,
    );
  });

  it("rejects non-positive configured exchange rates", () => {
    expect(() => parseWorkerEnvironment({ OPENAI_USD_TO_EUR_RATE: "0" })).toThrow();
  });
});
