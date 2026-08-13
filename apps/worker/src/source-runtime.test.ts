import { describe, expect, it } from "vitest";

import { parseRobotsRules, robotsAllows } from "./source-runtime.js";

describe("robots policy", () => {
  const rules = parseRobotsRules(`
    User-agent: *
    Disallow: /api/
    Disallow: /private/*
    Allow: /private/public$
  `);

  it("uses longest matching allow/disallow rules", () => {
    expect(robotsAllows(rules, new URL("https://example.com/products/1"))).toBe(true);
    expect(robotsAllows(rules, new URL("https://example.com/api/search"))).toBe(false);
    expect(robotsAllows(rules, new URL("https://example.com/private/record"))).toBe(false);
    expect(robotsAllows(rules, new URL("https://example.com/private/public"))).toBe(true);
    expect(robotsAllows(rules, new URL("https://example.com/private/public/more"))).toBe(false);
  });

  it("selects a specific user-agent group over the wildcard group", () => {
    const specific = parseRobotsRules(`
      User-agent: *
      Disallow: /all/

      User-agent: OptimalenNakupResearchBot
      Disallow: /bot-only/
    `);
    expect(robotsAllows(specific, new URL("https://example.com/all/page"))).toBe(true);
    expect(robotsAllows(specific, new URL("https://example.com/bot-only/page"))).toBe(false);
  });
});
