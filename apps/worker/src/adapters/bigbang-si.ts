import type {
  DiscoveredListing,
  ExtractedOffer,
  SourceManifest,
} from "@optimalen-nakup/adapter-sdk";
import { load } from "cheerio";

import {
  activateManifest,
  baseOffer,
  createSitemapAdapter,
  evidenceFor,
  normalizedText,
  parseEuroPrice,
} from "./common.js";

const manifest: SourceManifest = {
  id: "bigbang-si",
  name: "Big Bang",
  sourceType: "structured_web",
  countries: ["SI"],
  languages: ["sl"],
  categories: ["white_goods"],
  baseUrl: new URL("https://www.bigbang.si"),
  robotsUrl: new URL("https://www.bigbang.si/robots.txt"),
  termsUrl: new URL("https://www.bigbang.si/splosni-pogoji-poslovanja/"),
  policyStatus: "conditional",
  policyReviewedAt: "2026-07-26T12:18:00.000Z",
  policyReviewExpiresAt: "2026-08-25T12:18:00.000Z",
  policyNotes:
    "robots.txt advertises /sitemap.xml and blocks /api plus account/admin/data paths. Production activation still requires owner/legal approval.",
  allowedPathPrefixes: ["/robots.txt", "/sitemap", "/"],
  forbiddenPathPrefixes: [
    "/api",
    "/admin",
    "/data",
    "/webshop",
    "/uporabnik",
    "/compareproducts",
    "/upload_data",
  ],
  minimumDelayMs: 2_500,
  maximumConcurrency: 1,
};

function findProductJsonLd(html: string): Record<string, unknown> | null {
  const $ = load(html);
  const candidates: unknown[] = [];
  $("script[type='application/ld+json']").each((_index, element) => {
    try {
      const decoded = JSON.parse($(element).text()) as unknown;
      candidates.push(decoded);
    } catch {
      // Malformed third-party JSON-LD is ignored in favor of deterministic DOM fallback.
    }
  });
  const queue = [...candidates];
  while (queue.length > 0) {
    const candidate = queue.shift();
    if (Array.isArray(candidate)) {
      queue.push(...candidate);
    } else if (candidate && typeof candidate === "object") {
      const record = candidate as Record<string, unknown>;
      if (record["@type"] === "Product") {
        return record;
      }
      if (Array.isArray(record["@graph"])) {
        queue.push(...record["@graph"]);
      }
    }
  }
  return null;
}

export function extractBigBangHtml(
  activeManifest: SourceManifest,
  html: string,
  listing: DiscoveredListing,
  collectedAt: Date,
): ExtractedOffer {
  const $ = load(html);
  const bodyText = normalizedText($("body").text());
  const product = findProductJsonLd(html);
  const offers = Array.isArray(product?.offers)
    ? (product.offers[0] as Record<string, unknown> | undefined)
    : product?.offers && typeof product.offers === "object"
      ? (product.offers as Record<string, unknown>)
      : undefined;
  const title =
    (typeof product?.name === "string" ? normalizedText(product.name) : "") ||
    normalizedText($("h1").first().text()) ||
    listing.titleHint ||
    "Izdelek";
  const price = parseEuroPrice(
    typeof offers?.price === "string" || typeof offers?.price === "number"
      ? String(offers.price)
      : $("[class*='current-price']").first().text(),
  );
  const availabilityValue =
    typeof offers?.availability === "string" ? offers.availability.toLowerCase() : "";
  const availability = availabilityValue.includes("instock")
    ? "in_stock"
    : availabilityValue.includes("outofstock")
      ? "unavailable"
      : "unknown";
  const brand =
    product?.brand && typeof product.brand === "object"
      ? (product.brand as Record<string, unknown>).name
      : null;
  const sku =
    typeof product?.sku === "string"
      ? product.sku
      : (listing.url.pathname.match(/-izdelek-(\d+)\/?$/)?.[1] ?? null);
  const offer = baseOffer({
    manifest: activeManifest,
    listing,
    title,
    category: "white_goods",
    offerType: "product",
    collectedAt,
    basePrice: price,
    providerName: typeof brand === "string" ? brand : null,
    sellerName: "Big Bang",
    availability,
    attributes: {
      attributesSchemaVersion: 1,
      sku,
      brand,
    },
  });
  return {
    offer,
    evidence: [
      evidenceFor(
        offer,
        "title",
        activeManifest.name,
        offer.canonicalUrl,
        collectedAt,
        title,
        product ? "json_ld" : "dom",
      ),
      evidenceFor(
        offer,
        "basePrice",
        activeManifest.name,
        offer.canonicalUrl,
        collectedAt,
        price,
        product ? "json_ld" : "dom",
      ),
      evidenceFor(
        offer,
        "availability",
        activeManifest.name,
        offer.canonicalUrl,
        collectedAt,
        availability,
        product ? "json_ld" : "dom",
      ),
    ],
    warnings: price === null ? ["price_missing"] : [],
    untrustedSourceText: bodyText.slice(0, 120_000),
    untrustedCapturedHtml: html.slice(0, 1_000_000),
  };
}

export function createBigBangSiAdapter(approvedSourceIds: ReadonlySet<string>) {
  const activeManifest = activateManifest(manifest, approvedSourceIds);
  return createSitemapAdapter({
    manifest: activeManifest,
    sitemapUrl: new URL("https://www.bigbang.si/sitemap.xml"),
    sitemapSelector: (url) =>
      url.origin === activeManifest.baseUrl.origin && /^\/sitemap\d+\.xml$/.test(url.pathname),
    listingSelector: (url) =>
      url.origin === activeManifest.baseUrl.origin && /-izdelek-\d+\/?$/.test(url.pathname),
    category: "white_goods",
    extractHtml: (html, listing, collectedAt) =>
      extractBigBangHtml(activeManifest, html, listing, collectedAt),
  });
}

export const bigBangSiManifest = manifest;
