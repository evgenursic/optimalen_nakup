import { offerV1Schema } from "@optimalen-nakup/domain";
import { describe, expect, it, vi } from "vitest";

import { EcbCurrencyNormalizer, normalizeOfferWithRates, parseEcbDailyRates } from "./currency.js";

const xml = `<?xml version="1.0"?>
<Envelope>
  <Cube>
    <Cube time="2026-07-24">
      <Cube currency="USD" rate="1.2000"/>
      <Cube currency="GBP" rate="0.8000"/>
    </Cube>
  </Cube>
</Envelope>`;

function foreignOffer() {
  return offerV1Schema.parse({
    schemaVersion: 1,
    sourceId: "fixture",
    sourceOfferId: "usd-1",
    canonicalUrl: "https://example.com/usd-1",
    title: "Foreign price",
    category: "computers",
    offerType: "product",
    providerName: null,
    sellerName: null,
    basePrice: { amount: 1_200, currency: "USD" },
    recurringPrice: null,
    tax: null,
    shipping: { amount: 12, currency: "USD" },
    installation: null,
    mandatoryFees: null,
    totalInitialCost: { amount: 1_212, currency: "USD" },
    estimatedTotalCost: { amount: 1_212, currency: "USD" },
    location: null,
    availability: "in_stock",
    deliveryOrStartDate: null,
    warranty: null,
    collectedAt: "2026-07-26T12:00:00.000Z",
    staleAfter: "2026-07-27T12:00:00.000Z",
    attributes: {},
  });
}

describe("ECB currency normalization", () => {
  it("parses official reference-rate shape and converts every monetary field", () => {
    const rates = parseEcbDailyRates(xml);
    const normalized = normalizeOfferWithRates(foreignOffer(), rates);

    expect(normalized.offer.basePrice).toEqual({ amount: 1_000, currency: "EUR" });
    expect(normalized.offer.shipping).toEqual({ amount: 10, currency: "EUR" });
    expect(normalized.offer.totalInitialCost).toEqual({ amount: 1_010, currency: "EUR" });
    expect(normalized.originalCurrencies).toEqual(["USD"]);
    expect(normalized.offer.attributes.currencyNormalization).toMatchObject({
      rateDate: "2026-07-24",
      targetCurrency: "EUR",
    });
  });

  it("does not load rates for an already-EUR offer and caches foreign rates", async () => {
    const loadRates = vi.fn(async () => parseEcbDailyRates(xml));
    const normalizer = new EcbCurrencyNormalizer(loadRates, () =>
      Date.parse("2026-07-26T12:00:00.000Z"),
    );
    const eurOffer = offerV1Schema.parse({
      ...foreignOffer(),
      basePrice: { amount: 1_000, currency: "EUR" },
      shipping: null,
      totalInitialCost: { amount: 1_000, currency: "EUR" },
      estimatedTotalCost: { amount: 1_000, currency: "EUR" },
    });

    await normalizer.normalize(eurOffer);
    await normalizer.normalize(foreignOffer());
    await normalizer.normalize(foreignOffer());

    expect(loadRates).toHaveBeenCalledTimes(1);
  });
});
