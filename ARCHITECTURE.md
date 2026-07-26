# Architecture

## System boundaries

- `apps/web`: Next.js App Router application, public content, authentication UI, realtime research
  experience, results, billing, and administration.
- `convex`: source of truth for application state, realtime events, tenancy, billing state, usage,
  alerts, audit data, and worker leases.
- `apps/worker`: isolated Node.js process for sitemap discovery, HTTP collection, Playwright
  verification, OpenAI calls, normalization, deduplication, scoring, and exports.
- `packages`: versioned domain contracts, adapter SDK, security primitives, configuration, design
  tokens, and fixtures shared without circular dependencies.

## Data flow

1. The web application submits an intake request to Convex.
2. A bounded OpenAI Responses API call returns `FilterSpecV1`; the user edits and confirms it.
3. Convex creates an entitlement-checked job and emits realtime progress.
4. The worker claims a lease through an HMAC-authenticated endpoint and sends heartbeats.
5. Approved adapters discover and verify pages while enforcing source and job budgets.
6. Extracted claims become normalized offers and per-field evidence records.
7. Deterministic scoring produces a versioned breakdown; AI may explain but cannot create facts.
8. Results, coverage, warnings, exports, saved searches, and alerts read from Convex.

## Invariants

- The worker never needs an interactive developer browser session.
- External page content is untrusted and cannot redefine agent instructions.
- Convex is not used for large raw page archives; short evidence and storage references are bounded.
- A tenant ID from a browser request never establishes authorization.
- Every retryable side effect carries an idempotency key.
- Cancellation stops new work and retains committed evidence and coverage.
