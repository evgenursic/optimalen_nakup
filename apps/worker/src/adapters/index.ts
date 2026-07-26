export { bmwSiUsedManifest, createBmwSiUsedAdapter, extractBmwHtml } from "./bmw-si-used.js";
export { bigBangSiManifest, createBigBangSiAdapter, extractBigBangHtml } from "./bigbang-si.js";
export { createEnaaSiAdapter, enaaSiManifest, extractEnaaHtml } from "./enaa-si.js";

import type { SourceAdapterV1 } from "@optimalen-nakup/adapter-sdk";

import { createBigBangSiAdapter } from "./bigbang-si.js";
import { createBmwSiUsedAdapter } from "./bmw-si-used.js";
import { createEnaaSiAdapter } from "./enaa-si.js";

export function createSourceAdapters(approvedSourceIds: ReadonlySet<string>): SourceAdapterV1[] {
  return [
    createBmwSiUsedAdapter(approvedSourceIds),
    createEnaaSiAdapter(approvedSourceIds),
    createBigBangSiAdapter(approvedSourceIds),
  ];
}
