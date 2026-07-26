import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP, type LookupFunction } from "node:net";

import { isPrivateIpAddress } from "@optimalen-nakup/security";

export interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

export type HostResolver = (hostname: string) => Promise<ResolvedAddress[]>;

export interface SecureFetchOptions {
  method?: "GET" | "HEAD";
  headers?: Record<string, string>;
  signal?: AbortSignal;
  maximumBytes?: number;
  maximumRedirects?: number;
  timeoutMs?: number;
  allowedContentTypes?: string[];
  resolver?: HostResolver;
}

export interface SecureFetchResult {
  url: URL;
  status: number;
  headers: Readonly<Record<string, string>>;
  body: Uint8Array;
  text(): string;
}

const blockedHostSuffixes = [".internal", ".local", ".localhost", ".home.arpa", ".onion"] as const;

const defaultAllowedContentTypes = [
  "application/json",
  "application/ld+json",
  "application/xhtml+xml",
  "application/xml",
  "text/html",
  "text/plain",
  "text/xml",
];

export class SecureFetchError extends Error {
  constructor(
    message: string,
    readonly code:
      | "BLOCKED_TARGET"
      | "CONTENT_TOO_LARGE"
      | "INVALID_CONTENT_TYPE"
      | "NETWORK_ERROR"
      | "REDIRECT_LIMIT",
  ) {
    super(message);
    this.name = "SecureFetchError";
  }
}

const defaultResolver: HostResolver = async (hostname) => {
  if (isIP(hostname) !== 0) {
    return [{ address: hostname, family: isIP(hostname) as 4 | 6 }];
  }
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  return addresses.map((entry) => ({
    address: entry.address,
    family: entry.family as 4 | 6,
  }));
};

export async function resolvePublicAddresses(
  hostname: string,
  resolver: HostResolver = defaultResolver,
): Promise<ResolvedAddress[]> {
  const normalizedHostname = hostname.toLowerCase().replace(/\.$/, "");
  if (
    normalizedHostname === "localhost" ||
    blockedHostSuffixes.some((suffix) => normalizedHostname.endsWith(suffix))
  ) {
    throw new SecureFetchError(`Blocked host: ${hostname}`, "BLOCKED_TARGET");
  }
  let addresses: ResolvedAddress[];
  try {
    addresses = await resolver(normalizedHostname);
  } catch (error) {
    throw new SecureFetchError(
      `DNS lookup failed: ${error instanceof Error ? error.message : "unknown error"}`,
      "NETWORK_ERROR",
    );
  }
  if (addresses.length === 0 || addresses.some((entry) => isPrivateIpAddress(entry.address))) {
    throw new SecureFetchError(`Host resolves to a blocked address: ${hostname}`, "BLOCKED_TARGET");
  }
  return addresses;
}

function validateUrl(url: URL): void {
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username !== "" ||
    url.password !== "" ||
    (url.port !== "" &&
      !(
        (url.protocol === "http:" && url.port === "80") ||
        (url.protocol === "https:" && url.port === "443")
      ))
  ) {
    throw new SecureFetchError(`Blocked URL: ${url.toString()}`, "BLOCKED_TARGET");
  }
}

function normalizeHeaders(
  headers: NodeJS.Dict<string | string[]>,
): Readonly<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined) {
      result[name.toLowerCase()] = Array.isArray(value) ? value.join(", ") : value;
    }
  }
  return result;
}

async function requestOnce(
  url: URL,
  address: ResolvedAddress,
  options: Required<
    Pick<SecureFetchOptions, "method" | "maximumBytes" | "timeoutMs" | "allowedContentTypes">
  > &
    Pick<SecureFetchOptions, "headers" | "signal">,
): Promise<SecureFetchResult & { location?: string }> {
  return await new Promise((resolve, reject) => {
    const lookupFunction: LookupFunction = (_hostname, _options, callback) => {
      callback(null, address.address, address.family);
    };
    const transport = url.protocol === "https:" ? httpsRequest : httpRequest;
    const request = transport(
      url,
      {
        method: options.method,
        headers: {
          accept:
            "text/html,application/xhtml+xml,application/xml,application/ld+json,application/json,text/plain;q=0.9",
          "accept-encoding": "identity",
          "user-agent":
            "OptimalenNakupResearchBot/0.1 (+https://github.com/evgenursic/optimalen_nakup)",
          ...options.headers,
        },
        lookup: lookupFunction,
        signal: options.signal,
      },
      (response) => {
        const headers = normalizeHeaders(response.headers);
        const contentLength = Number(headers["content-length"] ?? 0);
        if (contentLength > options.maximumBytes) {
          response.destroy();
          reject(
            new SecureFetchError(
              `Response exceeds ${options.maximumBytes} bytes`,
              "CONTENT_TOO_LARGE",
            ),
          );
          return;
        }
        const status = response.statusCode ?? 0;
        const location = headers.location;
        const redirect = status >= 300 && status < 400 && location;
        const contentType = (headers["content-type"] ?? "").split(";")[0]?.trim().toLowerCase();
        if (
          !redirect &&
          options.method !== "HEAD" &&
          (!contentType || !options.allowedContentTypes.includes(contentType))
        ) {
          response.destroy();
          reject(
            new SecureFetchError(
              `Blocked response content type: ${contentType || "missing"}`,
              "INVALID_CONTENT_TYPE",
            ),
          );
          return;
        }
        const chunks: Buffer[] = [];
        let bytes = 0;
        response.on("data", (chunk: Buffer) => {
          bytes += chunk.byteLength;
          if (bytes > options.maximumBytes) {
            response.destroy(
              new SecureFetchError(
                `Response exceeds ${options.maximumBytes} bytes`,
                "CONTENT_TOO_LARGE",
              ),
            );
            return;
          }
          chunks.push(chunk);
        });
        response.once("error", reject);
        response.once("end", () => {
          const body = Buffer.concat(chunks);
          resolve({
            url,
            status,
            headers,
            body,
            ...(location ? { location } : {}),
            text: () => new TextDecoder("utf-8", { fatal: false }).decode(body),
          });
        });
      },
    );
    request.setTimeout(options.timeoutMs, () => {
      request.destroy(new SecureFetchError("Request timed out", "NETWORK_ERROR"));
    });
    request.once("error", (error) => {
      reject(
        error instanceof SecureFetchError
          ? error
          : new SecureFetchError(error.message, "NETWORK_ERROR"),
      );
    });
    request.end();
  });
}

export async function secureFetch(
  input: URL | string,
  options: SecureFetchOptions = {},
): Promise<SecureFetchResult> {
  const maximumRedirects = options.maximumRedirects ?? 5;
  const resolver = options.resolver ?? defaultResolver;
  let currentUrl = input instanceof URL ? new URL(input) : new URL(input);
  for (let redirectCount = 0; redirectCount <= maximumRedirects; redirectCount += 1) {
    validateUrl(currentUrl);
    const addresses = await resolvePublicAddresses(currentUrl.hostname, resolver);
    const selectedAddress = addresses[0];
    if (!selectedAddress) {
      throw new SecureFetchError("DNS resolution returned no usable address", "BLOCKED_TARGET");
    }
    const result = await requestOnce(currentUrl, selectedAddress, {
      method: options.method ?? "GET",
      maximumBytes: options.maximumBytes ?? 2 * 1024 * 1024,
      timeoutMs: options.timeoutMs ?? 15_000,
      allowedContentTypes: options.allowedContentTypes ?? defaultAllowedContentTypes,
      ...(options.headers ? { headers: options.headers } : {}),
      ...(options.signal ? { signal: options.signal } : {}),
    });
    if (result.status < 300 || result.status >= 400 || !result.location) {
      return result;
    }
    if (redirectCount === maximumRedirects) {
      throw new SecureFetchError("Redirect limit exceeded", "REDIRECT_LIMIT");
    }
    currentUrl = new URL(result.location, currentUrl);
  }
  throw new SecureFetchError("Redirect limit exceeded", "REDIRECT_LIMIT");
}
