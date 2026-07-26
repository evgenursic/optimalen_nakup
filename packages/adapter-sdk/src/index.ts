import type { Category, EvidenceRecordV1, FilterSpecV1, OfferV1 } from "@optimalen-nakup/domain";

export type SourcePolicyStatus = "approved" | "conditional" | "blocked";

export interface SourceManifest {
  id: string;
  name: string;
  sourceType: "official_api" | "licensed_feed" | "structured_web" | "public_web";
  countries: string[];
  languages: string[];
  categories: Category[];
  baseUrl: URL;
  robotsUrl: URL;
  termsUrl: URL | null;
  policyStatus: SourcePolicyStatus;
  policyReviewedAt: string;
  allowedPathPrefixes: string[];
  forbiddenPathPrefixes: string[];
  minimumDelayMs: number;
  maximumConcurrency: number;
}

export interface DiscoveryPage {
  url: URL;
  discoveredAt: string;
  cursor: string | null;
}

export interface DiscoveredListing {
  sourceOfferId: string;
  url: URL;
  titleHint: string | null;
}

export interface ExtractedOffer {
  offer: OfferV1;
  evidence: EvidenceRecordV1[];
  warnings: string[];
}

export interface SourceHealth {
  status: "healthy" | "degraded" | "blocked";
  checkedAt: string;
  latencyMs: number | null;
  message: string;
}

export interface AdapterContext {
  signal: AbortSignal;
  fetch: typeof globalThis.fetch;
  now(): Date;
  reportProgress(event: AdapterProgressEvent): Promise<void>;
}

export interface AdapterProgressEvent {
  type: "page_planned" | "page_inspected" | "listing_discovered" | "listing_verified";
  sourceId: string;
  url: string;
}

export interface SourceAdapterV1 {
  readonly manifest: SourceManifest;
  plan(spec: FilterSpecV1, context: AdapterContext): AsyncIterable<DiscoveryPage>;
  discover(page: DiscoveryPage, context: AdapterContext): Promise<DiscoveredListing[]>;
  extract(
    listing: DiscoveredListing,
    spec: FilterSpecV1,
    context: AdapterContext,
  ): Promise<ExtractedOffer>;
  healthCheck(context: AdapterContext): Promise<SourceHealth>;
}

export function assertSourceUrlAllowed(manifest: SourceManifest, url: URL): void {
  if (manifest.policyStatus !== "approved") {
    throw new Error(`Source ${manifest.id} is not approved`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Unsupported protocol for ${url.toString()}`);
  }
  if (url.origin !== manifest.baseUrl.origin) {
    throw new Error(`Unexpected origin for source ${manifest.id}`);
  }
  if (manifest.forbiddenPathPrefixes.some((prefix) => url.pathname.startsWith(prefix))) {
    throw new Error(`Forbidden source path: ${url.pathname}`);
  }
  if (!manifest.allowedPathPrefixes.some((prefix) => url.pathname.startsWith(prefix))) {
    throw new Error(`Source path is outside the allowlist: ${url.pathname}`);
  }
}
