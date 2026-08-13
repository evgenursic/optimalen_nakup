export interface CheckoutRequest {
  organizationId: string;
  userId: string;
  customerEmail: string;
  variantId: string;
  locale: "sl" | "en";
  redirectUrl: string;
}

export interface CheckoutResult {
  url: string;
  checkoutId: string;
}

export interface PortalResult {
  url: string;
  expiresInHours: 24;
}

export interface BillingProvider {
  readonly configured: boolean;
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
  createCustomerPortal(customerId: string): Promise<PortalResult>;
}

export interface LemonSqueezyBillingConfiguration {
  apiKey: string;
  storeId: string;
  testMode: boolean;
  fetch?: typeof globalThis.fetch;
}

interface JsonApiResource {
  id?: unknown;
  attributes?: unknown;
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} is missing from the provider response`);
  }
  return value as Record<string, unknown>;
}

function assertRedirectUrl(value: string): void {
  const url = new URL(value);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("Billing redirect URL must use HTTPS");
  }
}

function assertExternalHttpsUrl(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} is missing from the provider response`);
  }
  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new Error(`${label} must use HTTPS`);
  }
  return url.toString();
}

export class LemonSqueezyBillingProvider implements BillingProvider {
  readonly configured = true;
  readonly #apiKey: string;
  readonly #storeId: string;
  readonly #testMode: boolean;
  readonly #fetch: typeof globalThis.fetch;

  constructor(configuration: LemonSqueezyBillingConfiguration) {
    if (!configuration.apiKey || !configuration.storeId) {
      throw new Error("Lemon Squeezy API key and store ID are required");
    }
    this.#apiKey = configuration.apiKey;
    this.#storeId = configuration.storeId;
    this.#testMode = configuration.testMode;
    this.#fetch = configuration.fetch ?? globalThis.fetch;
  }

  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    assertRedirectUrl(request.redirectUrl);
    if (!/^[A-Za-z0-9_-]+$/.test(request.organizationId + request.userId)) {
      throw new Error("Billing identity contains unsupported characters");
    }
    if (!/^\d+$/.test(request.variantId)) {
      throw new Error("Lemon Squeezy variant ID must be numeric");
    }

    const response = await this.#request("/checkouts", {
      method: "POST",
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            product_options: {
              redirect_url: request.redirectUrl,
              enabled_variants: [Number(request.variantId)],
            },
            checkout_options: {
              embed: false,
              locale: request.locale,
            },
            checkout_data: {
              email: request.customerEmail,
              billing_address: {
                country: "SI",
              },
              custom: {
                organization_id: request.organizationId,
                user_id: request.userId,
              },
            },
            test_mode: this.#testMode,
          },
          relationships: {
            store: {
              data: {
                type: "stores",
                id: this.#storeId,
              },
            },
            variant: {
              data: {
                type: "variants",
                id: request.variantId,
              },
            },
          },
        },
      }),
    });
    const data = asRecord(response.data, "checkout data") as JsonApiResource;
    const attributes = asRecord(data.attributes, "checkout attributes");
    return {
      url: assertExternalHttpsUrl(attributes.url, "Checkout URL"),
      checkoutId:
        typeof data.id === "string"
          ? data.id
          : (() => {
              throw new Error("Checkout ID is missing from the provider response");
            })(),
    };
  }

  async createCustomerPortal(customerId: string): Promise<PortalResult> {
    if (!/^\d+$/.test(customerId)) {
      throw new Error("Lemon Squeezy customer ID must be numeric");
    }
    const response = await this.#request(`/customers/${customerId}`, { method: "GET" });
    const data = asRecord(response.data, "customer data");
    const attributes = asRecord(data.attributes, "customer attributes");
    const urls = asRecord(attributes.urls, "customer URLs");
    return {
      url: assertExternalHttpsUrl(urls.customer_portal, "Customer portal URL"),
      expiresInHours: 24,
    };
  }

  async #request(path: string, init: RequestInit): Promise<Record<string, unknown>> {
    const response = await this.#fetch(`https://api.lemonsqueezy.com/v1${path}`, {
      ...init,
      headers: {
        accept: "application/vnd.api+json",
        authorization: `Bearer ${this.#apiKey}`,
        "content-type": "application/vnd.api+json",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`Lemon Squeezy request failed with status ${response.status}`);
    }
    return asRecord(await response.json(), "Lemon Squeezy response");
  }
}

export class ClosedBetaBillingProvider implements BillingProvider {
  readonly configured = false;

  async createCheckout(): Promise<never> {
    throw new Error("Billing is not configured; use the closed-beta waitlist");
  }

  async createCustomerPortal(): Promise<never> {
    throw new Error("Billing is not configured; no customer portal is available");
  }
}

export interface EmailMessage {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html?: string;
  idempotencyKey: string;
  tags?: { name: string; value: string }[];
}

export type EmailDeliveryResult =
  { status: "sent"; providerMessageId: string } | { status: "recorded" };

export interface EmailProvider {
  readonly configured: boolean;
  send(message: EmailMessage): Promise<EmailDeliveryResult>;
}

export class ResendEmailProvider implements EmailProvider {
  readonly configured = true;
  readonly #apiKey: string;
  readonly #fetch: typeof globalThis.fetch;

  constructor(apiKey: string, providerFetch: typeof globalThis.fetch = globalThis.fetch) {
    if (!apiKey) {
      throw new Error("Resend API key is required");
    }
    this.#apiKey = apiKey;
    this.#fetch = providerFetch;
  }

  async send(message: EmailMessage): Promise<EmailDeliveryResult> {
    if (message.to.length < 1 || message.to.length > 50) {
      throw new Error("Email must have between 1 and 50 recipients");
    }
    if (message.idempotencyKey.length < 1 || message.idempotencyKey.length > 256) {
      throw new Error("Email idempotency key must have between 1 and 256 characters");
    }
    const response = await this.#fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.#apiKey}`,
        "content-type": "application/json",
        "idempotency-key": message.idempotencyKey,
      },
      body: JSON.stringify({
        from: message.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        tags: message.tags,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`Resend request failed with status ${response.status}`);
    }
    const payload = asRecord(await response.json(), "Resend response");
    if (typeof payload.id !== "string") {
      throw new Error("Resend response did not contain a message ID");
    }
    return { status: "sent", providerMessageId: payload.id };
  }
}

export class LocalEmailProvider implements EmailProvider {
  readonly configured = false;
  readonly #record: ((message: EmailMessage) => void) | undefined;

  constructor(record?: (message: EmailMessage) => void) {
    this.#record = record;
  }

  async send(message: EmailMessage): Promise<EmailDeliveryResult> {
    this.#record?.(message);
    return { status: "recorded" };
  }
}

export function createBillingProvider(configuration: {
  apiKey?: string | undefined;
  storeId?: string | undefined;
  testMode?: boolean | undefined;
}): BillingProvider {
  if (configuration.apiKey && configuration.storeId) {
    return new LemonSqueezyBillingProvider({
      apiKey: configuration.apiKey,
      storeId: configuration.storeId,
      testMode: configuration.testMode ?? true,
    });
  }
  return new ClosedBetaBillingProvider();
}

export function createEmailProvider(
  apiKey: string | undefined,
  providerFetch: typeof globalThis.fetch = globalThis.fetch,
): EmailProvider {
  return apiKey ? new ResendEmailProvider(apiKey, providerFetch) : new LocalEmailProvider();
}
