import type { OfferV1 } from "@optimalen-nakup/domain";
import { describe, expect, it } from "vitest";

import { priceTextMatches, sanitizeCapturedHtml } from "./playwright-verifier.js";

describe("sanitizeCapturedHtml", () => {
  it("removes active content, handlers, and all network-bearing attributes", () => {
    const sanitized = sanitizeCapturedHtml(`
      <html>
        <head>
          <base href="https://attacker.invalid/">
          <link rel="stylesheet" href="https://attacker.invalid/a.css">
          <meta http-equiv="refresh" content="0;url=https://attacker.invalid">
          <style>body { background: url(https://attacker.invalid/a.png) }</style>
          <script>fetch("https://attacker.invalid")</script>
        </head>
        <body onload="alert(1)">
          <img src="https://attacker.invalid/pixel" onerror="alert(2)">
          <a href="https://attacker.invalid">Safe visible title</a>
          <iframe src="https://attacker.invalid"></iframe>
        </body>
      </html>
    `);

    expect(sanitized).toContain("Safe visible title");
    expect(sanitized).not.toContain("attacker.invalid");
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("<iframe");
    expect(sanitized).not.toContain("onload");
    expect(sanitized).not.toContain("onerror");
  });

  it("matches common Slovenian and English thousands/decimal price formats", () => {
    const offer: Pick<OfferV1, "basePrice" | "totalInitialCost" | "estimatedTotalCost"> = {
      basePrice: { amount: 1_299, currency: "EUR" },
      totalInitialCost: null,
      estimatedTotalCost: null,
    };

    expect(priceTextMatches("Cena 1.299,00 €", offer)).toBe(true);
    expect(priceTextMatches("Price €1,299.00", offer)).toBe(true);
    expect(priceTextMatches("Cena ni objavljena", offer)).toBe(false);
  });
});
