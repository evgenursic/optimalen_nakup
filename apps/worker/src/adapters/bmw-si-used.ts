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
  id: "bmw-si-used",
  name: "BMW Slovenija — rabljena vozila",
  sourceType: "structured_web",
  countries: ["SI"],
  languages: ["sl"],
  categories: ["vehicles"],
  baseUrl: new URL("https://odkrijuzitek.bmw.si"),
  robotsUrl: new URL("https://odkrijuzitek.bmw.si/robots.txt"),
  termsUrl: null,
  policyStatus: "conditional",
  policyReviewedAt: "2026-07-26T12:19:00.000Z",
  policyReviewExpiresAt: "2026-08-25T12:19:00.000Z",
  policyNotes:
    "robots.txt advertises /rabljeno/sitemap.xml and blocks /rabljeno/api. Production activation still requires owner/legal approval.",
  allowedPathPrefixes: ["/robots.txt", "/rabljeno/sitemap.xml", "/rabljeno/iskanje/podrobnosti/"],
  forbiddenPathPrefixes: ["/rabljeno/api", "/api", "/typo3"],
  minimumDelayMs: 2_500,
  maximumConcurrency: 1,
};

export function extractBmwHtml(
  activeManifest: SourceManifest,
  html: string,
  listing: DiscoveredListing,
  collectedAt: Date,
): ExtractedOffer {
  const $ = load(html);
  const bodyText = normalizedText($("body").text());
  const attributes = tableAttributes(html);
  const title = normalizedText($("h1").first().text()) || listing.titleHint || "BMW";
  const price = parseEuroPrice(bodyText.match(/Cena\s+([\d .,\u00a0]+)\s*€/i)?.[1]);
  const seller =
    normalizedText(
      $("[class*='dealer'] h2, [class*='dealer'] h3, [class*='dealer-name']").first().text(),
    ) || null;
  const locationMatch = bodyText.match(/(?:BMW|MINI)[^,.]{0,80},\s*([A-ZČŠŽ][\p{L}\s-]{2,80})/u);
  const offer = baseOffer({
    manifest: activeManifest,
    listing,
    title,
    category: "vehicles",
    offerType: "vehicle",
    collectedAt,
    basePrice: price,
    providerName: "BMW Slovenija",
    sellerName: seller,
    location: locationMatch?.[1] ?? null,
    availability: price === null ? "unknown" : "in_stock",
    warranty: /24[- ]mese/i.test(bodyText) ? "BMW Premium Selection: 24 mesecev" : null,
    attributes: {
      attributesSchemaVersion: 1,
      mileage: Object.entries(attributes).find(([key]) => key.includes("prevo"))?.[1] ?? null,
      power: Object.entries(attributes).find(([key]) => key.includes("moč"))?.[1] ?? null,
      firstRegistration:
        Object.entries(attributes).find(([key]) => key.includes("registracij"))?.[1] ?? null,
      fuel: Object.entries(attributes).find(([key]) => key.includes("goriv"))?.[1] ?? null,
      transmission:
        Object.entries(attributes).find(([key]) => key.includes("menjalnik"))?.[1] ?? null,
      mSport: /M Sport paket/i.test(bodyText),
    },
  });
  const evidence = [
    evidenceFor(offer, "title", activeManifest.name, offer.canonicalUrl, collectedAt, title, "dom"),
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
      "attributes.mSport",
      activeManifest.name,
      offer.canonicalUrl,
      collectedAt,
      offer.attributes.mSport,
      "dom",
    ),
  ];
  return {
    offer,
    evidence,
    warnings: price === null ? ["price_missing"] : [],
    untrustedSourceText: bodyText.slice(0, 120_000),
    untrustedCapturedHtml: html.slice(0, 1_000_000),
  };
}

export function createBmwSiUsedAdapter(approvedSourceIds: ReadonlySet<string>) {
  const activeManifest = activateManifest(manifest, approvedSourceIds);
  return createSitemapAdapter({
    manifest: activeManifest,
    sitemapUrl: new URL("https://odkrijuzitek.bmw.si/rabljeno/sitemap.xml"),
    sitemapSelector: (url) =>
      url.origin === activeManifest.baseUrl.origin &&
      url.pathname === "/rabljeno/sitemap.xml" &&
      url.searchParams.get("sitemap") === "vehicle",
    listingSelector: (url) =>
      url.origin === activeManifest.baseUrl.origin &&
      /^\/rabljeno\/iskanje\/podrobnosti\/\d+\/?$/.test(url.pathname),
    category: "vehicles",
    extractHtml: (html, listing, collectedAt) =>
      extractBmwHtml(activeManifest, html, listing, collectedAt),
  });
}

export const bmwSiUsedManifest = manifest;
