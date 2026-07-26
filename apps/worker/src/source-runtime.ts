import {
  assertSourceUrlAllowed,
  type AdapterContext,
  type AdapterProgressEvent,
  type SourceManifest,
} from "@optimalen-nakup/adapter-sdk";

import { secureFetch } from "./safe-fetch.js";

interface RobotsRule {
  allow: boolean;
  pattern: string;
}

export class SourceBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceBlockedError";
  }
}

function patternMatches(pattern: string, path: string): boolean {
  if (pattern === "") {
    return false;
  }
  const anchoredAtEnd = pattern.endsWith("$");
  const body = anchoredAtEnd ? pattern.slice(0, -1) : pattern;
  const escaped = body.replaceAll(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*");
  return new RegExp(`^${escaped}${anchoredAtEnd ? "$" : ""}`).test(path);
}

export function parseRobotsRules(
  contents: string,
  userAgent = "OptimalenNakupResearchBot",
): RobotsRule[] {
  const groups: { agents: string[]; rules: RobotsRule[] }[] = [];
  let current: { agents: string[]; rules: RobotsRule[] } | undefined;
  let ruleSeen = false;
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) {
      if (current && (current.agents.length > 0 || current.rules.length > 0)) {
        groups.push(current);
      }
      current = undefined;
      ruleSeen = false;
      continue;
    }
    const separator = line.indexOf(":");
    if (separator < 0) {
      continue;
    }
    const directive = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (directive === "user-agent") {
      if (!current || ruleSeen) {
        if (current) {
          groups.push(current);
        }
        current = { agents: [], rules: [] };
        ruleSeen = false;
      }
      current.agents.push(value.toLowerCase());
    } else if ((directive === "allow" || directive === "disallow") && current) {
      current.rules.push({ allow: directive === "allow", pattern: value });
      ruleSeen = true;
    }
  }
  if (current) {
    groups.push(current);
  }
  const normalizedAgent = userAgent.toLowerCase();
  const exactGroups = groups.filter((group) =>
    group.agents.some((agent) => agent !== "*" && normalizedAgent.includes(agent)),
  );
  const selected =
    exactGroups.length > 0 ? exactGroups : groups.filter((group) => group.agents.includes("*"));
  return selected.flatMap((group) => group.rules);
}

export function robotsAllows(rules: RobotsRule[], url: URL): boolean {
  const path = `${url.pathname}${url.search}`;
  const matches = rules
    .filter((rule) => patternMatches(rule.pattern, path))
    .sort(
      (left, right) =>
        right.pattern.replaceAll("*", "").length - left.pattern.replaceAll("*", "").length ||
        Number(right.allow) - Number(left.allow),
    );
  return matches[0]?.allow ?? true;
}

export interface SourceRuntimeOptions {
  manifest: SourceManifest;
  signal: AbortSignal;
  onProgress(event: AdapterProgressEvent): Promise<void>;
  beforeRequest?(url: URL): Promise<void>;
  onRequest?(url: URL, status: number): Promise<void>;
  now?: () => Date;
  sleep?: (milliseconds: number) => Promise<void>;
}

export class SourceRuntime {
  private readonly now: () => Date;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private lastRequestStartedAt = 0;
  private robotsRules: RobotsRule[] | undefined;
  private blockedReason: string | undefined;
  private requestChain = Promise.resolve();

  constructor(private readonly options: SourceRuntimeOptions) {
    this.now = options.now ?? (() => new Date());
    this.sleep =
      options.sleep ??
      ((milliseconds) =>
        new Promise((resolve) => {
          setTimeout(resolve, milliseconds);
        }));
  }

  context(): AdapterContext {
    return {
      signal: this.options.signal,
      now: this.now,
      reportProgress: this.options.onProgress,
      fetch: async (input, init) => {
        const url =
          input instanceof URL
            ? input
            : input instanceof Request
              ? new URL(input.url)
              : new URL(input);
        return await this.serializedFetch(url, init);
      },
    };
  }

  private async serializedFetch(url: URL, init?: RequestInit): Promise<Response> {
    const operation = this.requestChain.then(async () => await this.fetch(url, init));
    this.requestChain = operation.then(
      () => undefined,
      () => undefined,
    );
    return await operation;
  }

  private async fetch(url: URL, init?: RequestInit): Promise<Response> {
    if (this.blockedReason) {
      throw new SourceBlockedError(this.blockedReason);
    }
    assertSourceUrlAllowed(this.options.manifest, url, this.now());
    if (!this.robotsRules) {
      await this.loadRobots();
    }
    const robotsRules = this.robotsRules;
    if (!robotsRules) {
      throw new SourceBlockedError("robots.txt policy was not loaded");
    }
    if (url.toString() !== this.options.manifest.robotsUrl.toString()) {
      if (!robotsAllows(robotsRules, url)) {
        throw new SourceBlockedError(`robots.txt disallows ${url.pathname}`);
      }
    }
    const delay = Math.max(
      0,
      this.lastRequestStartedAt + this.options.manifest.minimumDelayMs - Date.now(),
    );
    if (delay > 0) {
      await this.sleep(delay);
    }
    await this.options.beforeRequest?.(url);
    this.lastRequestStartedAt = Date.now();
    const maximumBytes = /\/sitemap/i.test(url.pathname) ? 6 * 1024 * 1024 : 2 * 1024 * 1024;
    const result = await secureFetch(url, {
      method: init?.method === "HEAD" ? "HEAD" : "GET",
      signal: this.options.signal,
      maximumBytes,
      timeoutMs: 20_000,
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
    });
    const text = result.text();
    if (
      result.status === 403 ||
      result.status === 429 ||
      /\b(captcha|access denied|verify you are human|cf-chl-)\b/i.test(text.slice(0, 200_000))
    ) {
      this.blockedReason = `${this.options.manifest.id} blocked automated access (HTTP ${result.status})`;
      throw new SourceBlockedError(this.blockedReason);
    }
    await this.options.onRequest?.(result.url, result.status);
    return new Response(Buffer.from(result.body), {
      status: result.status,
      headers: result.headers,
    });
  }

  private async loadRobots(): Promise<void> {
    assertSourceUrlAllowed(this.options.manifest, this.options.manifest.robotsUrl, this.now());
    await this.options.beforeRequest?.(this.options.manifest.robotsUrl);
    const result = await secureFetch(this.options.manifest.robotsUrl, {
      signal: this.options.signal,
      maximumBytes: 256 * 1024,
      timeoutMs: 10_000,
      allowedContentTypes: ["text/plain"],
    });
    if (result.status < 200 || result.status >= 300) {
      throw new SourceBlockedError(`robots.txt returned HTTP ${result.status}`);
    }
    await this.options.onRequest?.(result.url, result.status);
    this.robotsRules = parseRobotsRules(result.text());
  }
}
