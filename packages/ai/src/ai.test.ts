import { describe, expect, it } from "vitest";

import { calculateOpenAiCostUsd } from "./index.js";

describe("OpenAI cost accounting", () => {
  it("accounts separately for cached, cache-write, regular input and output tokens", () => {
    expect(
      calculateOpenAiCostUsd("gpt-5.6-terra", {
        inputTokens: 1_000_000,
        cachedInputTokens: 200_000,
        cacheWriteTokens: 100_000,
        outputTokens: 100_000,
      }),
    ).toBe(2.89);
  });

  it("does not invent pricing for a configured unknown model", () => {
    expect(
      calculateOpenAiCostUsd("future-model", {
        inputTokens: 100,
        cachedInputTokens: 0,
        cacheWriteTokens: 0,
        outputTokens: 100,
      }),
    ).toBeNull();
  });

  it("maps dated API snapshot identifiers back to the configured model price", () => {
    expect(
      calculateOpenAiCostUsd("gpt-5.6-sol-2026-07-15", {
        inputTokens: 1_000,
        cachedInputTokens: 0,
        cacheWriteTokens: 0,
        outputTokens: 100,
      }),
    ).toBe(0.008);
  });
});
