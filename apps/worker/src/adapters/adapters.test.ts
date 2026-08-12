import { describe, expect, it } from "vitest";

import {
  sanitizedBigBangHtml,
  sanitizedBmwHtml,
  sanitizedEnaaHtml,
} from "../fixtures/sanitized-pages.js";
import { extractBigBangHtml } from "./bigbang-si.js";
import { extractBmwHtml } from "./bmw-si-used.js";
import { parseEuroPrice, parseSitemapLocations } from "./common.js";
import { extractEnaaHtml } from "./enaa-si.js";
import { bigBangSiManifest, bmwSiUsedManifest, enaaSiManifest } from "./index.js";

const collectedAt = new Date("2026-07-26T12:00:00.000Z");

describe("deterministic adapters", () => {
  it("tracks the current official terms URLs without activating a source", () => {
    expect(enaaSiManifest.termsUrl?.toString()).toBe("https://www.enaa.com/cms/63");
    expect(bigBangSiManifest.termsUrl?.toString()).toBe(
      "https://www.bigbang.si/pogoji-poslovanja/",
    );
    expect(enaaSiManifest.policyStatus).toBe("conditional");
    expect(bigBangSiManifest.policyStatus).toBe("conditional");
    expect(bmwSiUsedManifest.termsUrl).toBeNull();
  });

  it("extracts the BMW M Sport evidence case without AI", () => {
    const url = new URL("https://odkrijuzitek.bmw.si/rabljeno/iskanje/podrobnosti/123456");
    const extracted = extractBmwHtml(
      { ...bmwSiUsedManifest, policyStatus: "approved" },
      sanitizedBmwHtml,
      { sourceOfferId: "123456", url, titleHint: null },
      collectedAt,
    );
    expect(extracted.offer.basePrice?.amount).toBe(45_490);
    expect(extracted.offer.attributes.mSport).toBe(true);
    expect(extracted.evidence.find((record) => record.field === "attributes.mSport")).toMatchObject(
      { status: "verified", method: "dom", excerpt: "true" },
    );
  });

  it("extracts Enaa stock, price and warranty from sanitized DOM", () => {
    const url = new URL("https://www.enaa.com/prenosni-racunalniki/testni-prenosnik");
    const extracted = extractEnaaHtml(
      { ...enaaSiManifest, policyStatus: "approved" },
      sanitizedEnaaHtml,
      { sourceOfferId: "test-14", url, titleHint: null },
      collectedAt,
    );
    expect(extracted.offer.basePrice?.amount).toBe(1_299.99);
    expect(extracted.offer.availability).toBe("in_stock");
    expect(extracted.offer.warranty).toBe("24");
  });

  it("prefers Big Bang JSON-LD and parses sitemap locations", () => {
    const url = new URL("https://www.bigbang.si/hladilnik-primer-300-izdelek-12345678/");
    const extracted = extractBigBangHtml(
      { ...bigBangSiManifest, policyStatus: "approved" },
      sanitizedBigBangHtml,
      { sourceOfferId: "12345678", url, titleHint: null },
      collectedAt,
    );
    expect(extracted.offer.basePrice?.amount).toBe(699.99);
    expect(extracted.offer.attributes.sku).toBe("TEST-300");
    expect(extracted.evidence[0]?.method).toBe("json_ld");
    expect(
      parseSitemapLocations(`<urlset><url><loc>${url.toString()}</loc></url></urlset>`),
    ).toEqual([url]);
  });

  it("normalizes Slovenian and decimal price notation", () => {
    expect(parseEuroPrice("1.299,99 €")).toBe(1_299.99);
    expect(parseEuroPrice("699.99")).toBe(699.99);
    expect(parseEuroPrice("45 490 €")).toBe(45_490);
  });
});
