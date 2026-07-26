import { offerV1Schema, type Money, type OfferV1 } from "@optimalen-nakup/domain";

import { secureFetch } from "./safe-fetch.js";

export const ecbDailyRatesUrl = new URL(
  "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml",
);

export interface EcbRateTable {
  date: string;
  /**
   * ECB reference rates are expressed as units of this currency for one euro.
   */
  perEur: Readonly<Record<string, number>>;
}

export interface CurrencyNormalization {
  offer: OfferV1;
  converted: boolean;
  sourceDate: string | null;
  originalCurrencies: string[];
}

export function parseEcbDailyRates(xml: string): EcbRateTable {
  const date = xml.match(/<Cube\s+time=["'](\d{4}-\d{2}-\d{2})["']/)?.[1];
  if (!date) {
    throw new Error("ECB rate document has no publication date");
  }
  const perEur: Record<string, number> = { EUR: 1 };
  const ratePattern =
    /<Cube\s+currency=["']([A-Z]{3})["']\s+rate=["']([0-9]+(?:\.[0-9]+)?)["']\s*\/?>/g;
  for (const match of xml.matchAll(ratePattern)) {
    const currency = match[1];
    const rate = Number(match[2]);
    if (currency && Number.isFinite(rate) && rate > 0) {
      perEur[currency] = rate;
    }
  }
  if (Object.keys(perEur).length === 1) {
    throw new Error("ECB rate document contains no usable rates");
  }
  return { date, perEur };
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function convertMoneyToEur(money: Money | null, rates: EcbRateTable): Money | null {
  if (!money || money.currency === "EUR") {
    return money;
  }
  const rate = rates.perEur[money.currency];
  if (!rate) {
    throw new Error(`ECB has no EUR reference rate for ${money.currency}`);
  }
  return {
    amount: roundCurrency(money.amount / rate),
    currency: "EUR",
  };
}

export function normalizeOfferWithRates(
  offer: OfferV1,
  rates: EcbRateTable,
): CurrencyNormalization {
  const monetaryFields = [
    "basePrice",
    "recurringPrice",
    "tax",
    "shipping",
    "installation",
    "mandatoryFees",
    "totalInitialCost",
    "estimatedTotalCost",
  ] as const;
  const originalCurrencies = [
    ...new Set(
      monetaryFields.flatMap((field) => {
        const money = offer[field];
        return money && money.currency !== "EUR" ? [money.currency] : [];
      }),
    ),
  ];
  if (originalCurrencies.length === 0) {
    return { offer, converted: false, sourceDate: null, originalCurrencies: [] };
  }
  const normalized = offerV1Schema.parse({
    ...offer,
    ...Object.fromEntries(
      monetaryFields.map((field) => [field, convertMoneyToEur(offer[field], rates)]),
    ),
    attributes: {
      ...offer.attributes,
      currencyNormalization: {
        originalCurrencies,
        targetCurrency: "EUR",
        rateDate: rates.date,
        source: ecbDailyRatesUrl.toString(),
      },
    },
  });
  return {
    offer: normalized,
    converted: true,
    sourceDate: rates.date,
    originalCurrencies,
  };
}

export class EcbCurrencyNormalizer {
  private cached: { rates: EcbRateTable; expiresAt: number } | null = null;

  constructor(
    private readonly loadRates: () => Promise<EcbRateTable> = async () => {
      const response = await secureFetch(ecbDailyRatesUrl, {
        maximumBytes: 250_000,
        maximumRedirects: 2,
        timeoutMs: 10_000,
        allowedContentTypes: ["application/xml", "text/xml"],
      });
      if (response.status !== 200) {
        throw new Error(`ECB rate endpoint returned HTTP ${response.status}`);
      }
      return parseEcbDailyRates(response.text());
    },
    private readonly now: () => number = Date.now,
  ) {}

  async normalize(offer: OfferV1): Promise<CurrencyNormalization> {
    const containsForeignCurrency = [
      offer.basePrice,
      offer.recurringPrice,
      offer.tax,
      offer.shipping,
      offer.installation,
      offer.mandatoryFees,
      offer.totalInitialCost,
      offer.estimatedTotalCost,
    ].some((money) => money !== null && money.currency !== "EUR");
    if (!containsForeignCurrency) {
      return { offer, converted: false, sourceDate: null, originalCurrencies: [] };
    }
    if (!this.cached || this.cached.expiresAt <= this.now()) {
      this.cached = {
        rates: await this.loadRates(),
        expiresAt: this.now() + 6 * 60 * 60 * 1_000,
      };
    }
    return normalizeOfferWithRates(offer, this.cached.rates);
  }
}
