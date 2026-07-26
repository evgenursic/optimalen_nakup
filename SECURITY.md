# Security

## Threat model

Primary threats are SSRF through URLs, prompt injection from pages, malicious HTML or files, tenant
leakage, forged worker callbacks, webhook replay, stored XSS, CSV injection, unsafe redirects,
oversized payloads, runaway crawling/AI cost, dependency compromise, and privilege escalation.

## Required controls

- Only `http` and `https`; resolve DNS and reject private, loopback, link-local, multicast, and
  cloud metadata ranges before every request and redirect.
- Per-source allowlists, robots/terms gates, maximum redirects, response-size limits, timeouts,
  content-type checks, concurrency limits, and circuit breakers.
- No scripts execute during deterministic parsing. Before selective Playwright verification,
  scripts, frames, forms, styles, handlers, and URL-bearing attributes are removed. Chromium runs
  with JavaScript and service workers disabled, and every network request is aborted.
- HTTP collection validates every DNS result, pins one validated public address into the socket
  lookup, and repeats URL/DNS validation for each redirect to prevent DNS rebinding.
- Page content is placed only in bounded data fields; extraction models have no tools and are
  instructed to ignore embedded instructions.
- Server-side authorization for every public Convex function, least-privilege roles, secure
  invitation tokens, and explicit tenant-isolation tests.
- HMAC worker callbacks with timestamp, nonce, constant-time comparison, replay storage, and
  idempotent writes.
- Lemon Squeezy raw-body signature verification and idempotent, order-aware event processing.
- CSP, HSTS in production, frame denial, MIME sniffing protection, restrictive referrer and
  permissions policies, secure cookies, and origin checks.
- CSV cells beginning with formula control characters are escaped.
- Secrets are environment-only and are redacted from logs and error output.

This document is an engineering threat model, not a third-party penetration-test report.
