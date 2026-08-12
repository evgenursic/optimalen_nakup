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
  tableAttributes,
} from "./common.js";

const manifest: SourceManifest = {
  id: "enaa-si",
  name: "Enaa",
  sourceType: "structured_web",
  countries: ["SI"],
  languages: ["sl"],
  categories: ["computers"],
  baseUrl: new URL("https://www.enaa.com"),
  robotsUrl: new URL("https://www.enaa.com/robots.txt"),
  termsUrl: new URL("https://www.enaa.com/cms/63"),
  policyStatus: "conditional",
  policyReviewedAt: "2026-08-12T22:00:00.000Z",
  policyReviewExpiresAt: "2026-09-11T22:00:00.000Z",
  policyNotes:
    "2026-08-12 technical review: robots.txt advertises /sitemap and blocks /search, /api and account/cart paths; terms are published at /cms/63. Production activation still requires owner/legal approval.",
  allowedPathPrefixes: ["/robots.txt", "/sitemap", "/"],
  forbiddenPathPrefixes: ["/search", "/api", "/ajax", "/basket", "/user", "/profil", "/addItem"],
  minimumDelayMs: 2_500,
  maximumConcurrency: 1,
};

export function extractEnaaHtml(
  activeManifest: SourceManifest,
  html: string,
  listing: DiscoveredListing,
  collectedAt: Date,
): ExtractedOffer {
  const $ = load(html);
  const bodyText = normalizedText($("body").text());
  const title = normalizedText($("h1").first().text()) || listing.titleHint || "Izdelek";
  const priceCandidate =
    $("[itemprop='price']").attr("content") ??
    $("meta[property='product:price:amount']").attr("content") ??
    $(".single-product-price-content").first().text();
  const price = parseEuroPrice(priceCandidate);
  const attributes = tableAttributes(html);
  const warranty =
    Object.entries(attributes).find(([key]) => key.includes("garancija"))?.[1] ?? null;
  const sku =
    $("meta[itemprop='sku']").attr("content") ??
    Object.entries(attributes).find(([key]) => key.includes("šifra"))?.[1] ??
    null;
  const offer = baseOffer({
    manifest: activeManifest,
    listing,
    title,
    category: "computers",
    offerType: "product",
    collectedAt,
    basePrice: price,
    providerName: "Enaa",
    sellerName: "Enaa",
    availability: /na zalogi/i.test(bodyText) ? "in_stock" : "unknown",
    warranty,
    attributes: {
      attributesSchemaVersion: 1,
      sku,
      specifications: attributes,
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
        "dom",
      ),
      evidenceFor(
        offer,
        "basePrice",
        activeManifest.name,
        offer.canonicalUrl,
        collectedAt,
        price,
        "dom",
      ),
      evidenceFor(
        offer,
        "availability",
        activeManifest.name,
        offer.canonicalUrl,
        collectedAt,
        offer.availability,
        "dom",
      ),
    ],
    warnings: price === null ? ["price_missing"] : [],
    untrustedSourceText: bodyText.slice(0, 120_000),
    untrustedCapturedHtml: html.slice(0, 1_000_000),
  };
}

export function createEnaaSiAdapter(approvedSourceIds: ReadonlySet<string>) {
  const activeManifest = activateManifest(manifest, approvedSourceIds);
  return createSitemapAdapter({
    manifest: activeManifest,
    sitemapUrl: new URL("https://www.enaa.com/sitemap"),
    sitemapSelector: (url) =>
      url.origin === activeManifest.baseUrl.origin &&
      url.pathname === "/sitemap" &&
      url.searchParams.get("key") === "oddelek" &&
      url.searchParams.get("oddelekID") === "1",
    listingSelector: (url) =>
      url.origin === activeManifest.baseUrl.origin &&
      url.pathname.split("/").filter(Boolean).length >= 2,
    category: "computers",
    extractHtml: (html, listing, collectedAt) =>
      extractEnaaHtml(activeManifest, html, listing, collectedAt),
  });
}

export const enaaSiManifest = manifest;
