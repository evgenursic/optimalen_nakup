import { createHash } from "node:crypto";

import {
  assertSourceUrlAllowed,
  type DiscoveredListing,
  type DiscoveryPage,
  type ExtractedOffer,
  type SourceAdapterV1,
  type SourceManifest,
} from "@optimalen-nakup/adapter-sdk";
import {
  evidenceRecordV1Schema,
  offerV1Schema,
  type Category,
  type EvidenceRecordV1,
  type ExtractionMethod,
  type FilterSpecV1,
  type OfferV1,
} from "@optimalen-nakup/domain";
import { load } from "cheerio";
import { XMLParser } from "fast-xml-parser";

export interface AdapterDefinition {
  manifest: SourceManifest;
  sitemapUrl: URL;
  sitemapSelector(url: URL): boolean;
  listingSelector(url: URL): boolean;
  category: Category;
  extractHtml(html: string, listing: DiscoveredListing, collectedAt: Date): ExtractedOffer;
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  processEntities: false,
  trimValues: true,
});

function walkLocations(value: unknown, locations: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      walkLocations(item, locations);
    }
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "loc" && typeof child === "string") {
      locations.push(child);
    } else {
      walkLocations(child, locations);
    }
  }
}

export function parseSitemapLocations(xml: string): URL[] {
  const decoded = xmlParser.parse(xml) as unknown;
  const locations: string[] = [];
  walkLocations(decoded, locations);
  return locations.flatMap((location) => {
    try {
      return [new URL(location)];
    } catch {
      return [];
    }
  });
}

function queryTokens(spec: FilterSpecV1): string[] {
  return spec.query
    .toLocaleLowerCase("sl")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 3)
    .slice(0, 20);
}

export function selectListings(
  urls: URL[],
  spec: FilterSpecV1,
  predicate: (url: URL) => boolean,
): URL[] {
  const tokens = queryTokens(spec);
  const candidates = urls.filter(predicate).map((url) => {
    const haystack = decodeURIComponent(url.pathname).toLocaleLowerCase("sl");
    const score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0);
    return { url, score };
  });
  candidates.sort(
    (left, right) =>
      right.score - left.score || left.url.toString().localeCompare(right.url.toString()),
  );
  const matched = candidates.filter((candidate) => candidate.score > 0);
  return (matched.length > 0 ? matched : candidates).slice(0, 500).map(({ url }) => url);
}

export function parseEuroPrice(input: string | undefined | null): number | null {
  if (!input) {
    return null;
  }
  const match = input.replaceAll("\u00a0", " ").match(/(\d[\d .]*(?:,\d{1,2}|\.\d{2})?)/);
  if (!match?.[1]) {
    return null;
  }
  let normalized = match[1].replaceAll(" ", "");
  if (normalized.includes(",")) {
    normalized = normalized.replaceAll(".", "").replace(",", ".");
  } else if ((normalized.match(/\./g) ?? []).length > 1) {
    normalized = normalized.replaceAll(".", "");
  } else if (/\.\d{3}$/.test(normalized)) {
    normalized = normalized.replace(".", "");
  }
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function normalizedText(input: string): string {
  return input.replaceAll(/\s+/g, " ").trim();
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function evidenceFor(
  offer: OfferV1,
  field: string,
  sourceName: string,
  sourceUrl: string,
  collectedAt: Date,
  value: unknown,
  method: ExtractionMethod,
  confidence = 0.96,
): EvidenceRecordV1 {
  const excerpt =
    value === null || value === undefined
      ? null
      : normalizedText(typeof value === "string" ? value : JSON.stringify(value)).slice(0, 500);
  return evidenceRecordV1Schema.parse({
    schemaVersion: 1,
    offerSourceId: offer.sourceId,
    field,
    sourceUrl,
    sourceName,
    collectedAt: collectedAt.toISOString(),
    status: excerpt === null ? "missing" : "verified",
    confidence: excerpt === null ? 0 : confidence,
    method,
    excerpt,
    contentHash: sha256(`${field}:${excerpt ?? "missing"}`),
    staleAt: offer.staleAfter,
  });
}

export function baseOffer(input: {
  manifest: SourceManifest;
  listing: DiscoveredListing;
  title: string;
  category: Category;
  offerType: OfferV1["offerType"];
  collectedAt: Date;
  basePrice: number | null;
  providerName?: string | null;
  sellerName?: string | null;
  location?: string | null;
  availability: OfferV1["availability"];
  warranty?: string | null;
  attributes?: Record<string, unknown>;
}): OfferV1 {
  const price =
    input.basePrice === null ? null : { amount: input.basePrice, currency: "EUR" as const };
  return offerV1Schema.parse({
    schemaVersion: 1,
    sourceId: input.manifest.id,
    sourceOfferId: input.listing.sourceOfferId,
    canonicalUrl: input.listing.url.toString(),
    title: normalizedText(input.title),
    category: input.category,
    offerType: input.offerType,
    providerName: input.providerName ?? null,
    sellerName: input.sellerName ?? null,
    basePrice: price,
    recurringPrice: null,
    tax: null,
    shipping: null,
    installation: null,
    mandatoryFees: null,
    totalInitialCost: price,
    estimatedTotalCost: price,
    location: input.location ?? null,
    availability: input.availability,
    deliveryOrStartDate: null,
    warranty: input.warranty ?? null,
    collectedAt: input.collectedAt.toISOString(),
    staleAfter: new Date(input.collectedAt.getTime() + 24 * 60 * 60 * 1_000).toISOString(),
    attributes: input.attributes ?? {},
  });
}

export function activateManifest(
  manifest: SourceManifest,
  approvedSourceIds: ReadonlySet<string>,
): SourceManifest {
  return {
    ...manifest,
    policyStatus: approvedSourceIds.has(manifest.id) ? "approved" : "conditional",
  };
}

export function createSitemapAdapter(definition: AdapterDefinition): SourceAdapterV1 {
  return {
    manifest: definition.manifest,
    async *plan(spec, context): AsyncIterable<DiscoveryPage> {
      assertSourceUrlAllowed(definition.manifest, definition.sitemapUrl, context.now());
      await context.reportProgress({
        type: "page_planned",
        sourceId: definition.manifest.id,
        url: definition.sitemapUrl.toString(),
      });
      const response = await context.fetch(definition.sitemapUrl, {
        signal: context.signal,
        headers: { accept: "application/xml,text/xml;q=0.9" },
      });
      if (!response.ok) {
        throw new Error(`Sitemap returned HTTP ${response.status}`);
      }
      const locations = parseSitemapLocations(await response.text());
      const childSitemaps = locations.filter(definition.sitemapSelector);
      if (childSitemaps.length === 0) {
        yield {
          url: definition.sitemapUrl,
          discoveredAt: context.now().toISOString(),
          cursor: specCursor(spec),
        };
        return;
      }
      for (const url of childSitemaps.slice(0, 100)) {
        assertSourceUrlAllowed(definition.manifest, url, context.now());
        yield {
          url,
          discoveredAt: context.now().toISOString(),
          cursor: specCursor(spec),
        };
      }
    },
    async discover(page, context) {
      assertSourceUrlAllowed(definition.manifest, page.url, context.now());
      await context.reportProgress({
        type: "page_inspected",
        sourceId: definition.manifest.id,
        url: page.url.toString(),
      });
      const response = await context.fetch(page.url, {
        signal: context.signal,
        headers: { accept: "application/xml,text/xml;q=0.9" },
      });
      if (!response.ok) {
        throw new Error(`Sitemap page returned HTTP ${response.status}`);
      }
      const urls = selectListings(
        parseSitemapLocations(await response.text()),
        // `discover` deliberately has no spec argument in SourceAdapterV1. The plan cursor
        // carries a compact, encoded query in adapters created below.
        decodeSpecCursor(page.cursor, definition.category),
        definition.listingSelector,
      );
      return urls.map((url) => {
        const sourceOfferId =
          url.pathname.match(/(\d+)\/?$/)?.[1] ?? sha256(url.toString()).slice(0, 24);
        return {
          sourceOfferId,
          url,
          titleHint: normalizedText(
            decodeURIComponent(url.pathname)
              .split("/")
              .filter(Boolean)
              .at(-1)
              ?.replaceAll("-", " ") ?? "",
          ),
        };
      });
    },
    async extract(listing, _spec, context) {
      assertSourceUrlAllowed(definition.manifest, listing.url, context.now());
      const response = await context.fetch(listing.url, {
        signal: context.signal,
        headers: { accept: "text/html,application/xhtml+xml" },
      });
      if (!response.ok) {
        throw new Error(`Detail page returned HTTP ${response.status}`);
      }
      const extracted = definition.extractHtml(await response.text(), listing, context.now());
      await context.reportProgress({
        type: "listing_verified",
        sourceId: definition.manifest.id,
        url: listing.url.toString(),
      });
      return extracted;
    },
    async healthCheck(context) {
      const startedAt = performance.now();
      try {
        assertSourceUrlAllowed(definition.manifest, definition.manifest.robotsUrl, context.now());
        const response = await context.fetch(definition.manifest.robotsUrl, {
          method: "GET",
          signal: context.signal,
          headers: { accept: "text/plain" },
        });
        return {
          status: response.ok ? "healthy" : "degraded",
          checkedAt: context.now().toISOString(),
          latencyMs: Math.round(performance.now() - startedAt),
          message: `robots.txt returned HTTP ${response.status}`,
        };
      } catch (error) {
        return {
          status: "blocked",
          checkedAt: context.now().toISOString(),
          latencyMs: Math.round(performance.now() - startedAt),
          message: error instanceof Error ? error.message : "Health check failed",
        };
      }
    },
  };
}

function decodeSpecCursor(cursor: string | null, category: Category): FilterSpecV1 {
  if (cursor) {
    try {
      return filterSpecV1SchemaForCursor(JSON.parse(Buffer.from(cursor, "base64url").toString()));
    } catch {
      // A malformed cursor cannot broaden access; it only disables query ranking.
    }
  }
  return filterSpecV1SchemaForCursor({
    category,
    query: "izdelek",
  });
}

function filterSpecV1SchemaForCursor(input: unknown): FilterSpecV1 {
  const candidate = input as { category?: Category; query?: string };
  return {
    schemaVersion: 1,
    category: candidate.category ?? "computers",
    mode: "best_overall",
    query: candidate.query && candidate.query.length >= 3 ? candidate.query : "izdelek",
    hardRequirements: [],
    preferences: [],
    exclusions: [],
    budget: null,
    geography: { countries: ["SI"], maximumDistanceKm: null, origin: null },
    acceptableConditions: ["new"],
    timing: { neededBy: null, maximumDeliveryDays: null },
    riskTolerance: "medium",
    weights: {
      hardFilterCompliance: 0.2,
      priceCompetitiveness: 0.16,
      qualityFit: 0.16,
      sellerConfidence: 0.1,
      evidenceConfidence: 0.14,
      reliability: 0.08,
      totalCostOfOwnership: 0.08,
      preferenceFit: 0.08,
    },
    confirmedAt: null,
  };
}

export function specCursor(spec: FilterSpecV1): string {
  return Buffer.from(JSON.stringify({ category: spec.category, query: spec.query })).toString(
    "base64url",
  );
}

export function tableAttributes(html: string): Record<string, string> {
  const $ = load(html);
  const attributes: Record<string, string> = {};
  $("tr").each((_index, row) => {
    const cells = $(row).find("th,td");
    if (cells.length >= 2) {
      const key = normalizedText($(cells[0]).text()).toLocaleLowerCase("sl");
      const value = normalizedText($(cells[1]).text());
      if (key && value && !(key in attributes)) {
        attributes[key] = value;
      }
    }
  });
  return attributes;
}
