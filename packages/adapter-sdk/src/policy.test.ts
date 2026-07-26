import { describe, expect, it } from "vitest";

import { assertSourceUrlAllowed, type SourceManifest } from "./index.js";

const manifest: SourceManifest = {
  id: "example",
  name: "Example",
  sourceType: "structured_web",
  countries: ["SI"],
  languages: ["sl"],
  categories: ["computers"],
  baseUrl: new URL("https://example.com"),
  robotsUrl: new URL("https://example.com/robots.txt"),
  termsUrl: null,
  policyStatus: "approved",
  policyReviewedAt: "2026-07-26T00:00:00.000Z",
  policyReviewExpiresAt: "2026-08-25T00:00:00.000Z",
  policyNotes: "Fixture policy",
  allowedPathPrefixes: ["/products/"],
  forbiddenPathPrefixes: ["/api/"],
  minimumDelayMs: 2_000,
  maximumConcurrency: 1,
};

describe("assertSourceUrlAllowed", () => {
  it("accepts an approved allowlisted product URL", () => {
    expect(() =>
      assertSourceUrlAllowed(manifest, new URL("https://example.com/products/laptop")),
    ).not.toThrow();
  });

  it("rejects an expired policy review", () => {
    expect(() =>
      assertSourceUrlAllowed(
        manifest,
        new URL("https://example.com/products/laptop"),
        new Date("2026-08-25T00:00:00.000Z"),
      ),
    ).toThrow("new policy review");
  });

  it("rejects a different origin and forbidden path", () => {
    expect(() =>
      assertSourceUrlAllowed(manifest, new URL("https://attacker.invalid/products/laptop")),
    ).toThrow("Unexpected origin");
    expect(() =>
      assertSourceUrlAllowed(
        { ...manifest, allowedPathPrefixes: ["/"] },
        new URL("https://example.com/api/search"),
      ),
    ).toThrow("Forbidden source path");
  });
});
