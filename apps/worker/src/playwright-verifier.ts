import type { OfferV1 } from "@optimalen-nakup/domain";
import { load } from "cheerio";
import { chromium, type Browser } from "playwright";

const maximumVerificationHtmlBytes = 1_000_000;

export interface BrowserVerificationResult {
  titleVisible: boolean;
  priceVisible: boolean | null;
  renderedTextLength: number;
}

function normalizedText(value: string): string {
  return value.replaceAll(/\s+/g, " ").trim().toLocaleLowerCase("sl");
}

/**
 * Removes every active-content and outbound-request surface before Chromium sees
 * the captured document. Source markup is data, never an instruction channel.
 */
export function sanitizeCapturedHtml(input: string): string {
  const $ = load(input.slice(0, maximumVerificationHtmlBytes));
  $("script,noscript,iframe,frame,object,embed,applet,base,link,style,form").remove();
  $("meta[http-equiv]").remove();
  $("*").each((_index, element) => {
    for (const attribute of Object.keys($(element).attr() ?? {})) {
      const name = attribute.toLocaleLowerCase("en");
      if (
        name.startsWith("on") ||
        name === "style" ||
        name === "src" ||
        name === "srcset" ||
        name === "href" ||
        name === "action" ||
        name === "formaction" ||
        name === "poster" ||
        name === "background" ||
        name === "data"
      ) {
        $(element).removeAttr(attribute);
      }
    }
  });
  return $.html();
}

export function priceTextMatches(
  renderedText: string,
  offer: Pick<OfferV1, "basePrice" | "totalInitialCost" | "estimatedTotalCost">,
): boolean | null {
  const amount =
    offer.basePrice?.amount ?? offer.totalInitialCost?.amount ?? offer.estimatedTotalCost?.amount;
  if (amount === undefined) {
    return null;
  }
  const [whole = "", decimal = "00"] = amount.toFixed(2).split(".");
  const groupedWithDot = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const groupedWithComma = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const groupedWithSpace = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const candidates = [
    String(amount),
    amount.toFixed(2),
    amount.toFixed(2).replace(".", ","),
    groupedWithDot,
    `${groupedWithDot},${decimal}`,
    groupedWithComma,
    `${groupedWithComma}.${decimal}`,
    groupedWithSpace,
    `${groupedWithSpace},${decimal}`,
    new Intl.NumberFormat("sl-SI", { maximumFractionDigits: 2 }).format(amount),
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount),
  ];
  const normalized = normalizedText(renderedText);
  return candidates.some((candidate) => normalized.includes(normalizedText(candidate)));
}

export class OfflinePlaywrightVerifier {
  private browser: Browser | null = null;

  async verify(capturedHtml: string, offer: OfferV1): Promise<BrowserVerificationResult> {
    this.browser ??= await chromium.launch({ headless: true });
    const context = await this.browser.newContext({
      acceptDownloads: false,
      javaScriptEnabled: false,
      serviceWorkers: "block",
    });
    try {
      const page = await context.newPage();
      await page.route("**/*", async (route) => {
        await route.abort("blockedbyclient");
      });
      await page.setContent(sanitizeCapturedHtml(capturedHtml), {
        waitUntil: "domcontentloaded",
        timeout: 10_000,
      });
      const renderedText = await page.locator("body").innerText({ timeout: 5_000 });
      return {
        titleVisible: normalizedText(renderedText).includes(normalizedText(offer.title)),
        priceVisible: priceTextMatches(renderedText, offer),
        renderedTextLength: renderedText.length,
      };
    } finally {
      await context.close();
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
