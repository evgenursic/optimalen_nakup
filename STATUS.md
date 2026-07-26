# Status

Updated: 2026-07-26

## Verified

- Repository bootstrap committed and pushed to `main`.
- Development branch `codex/initial-production-build` created and pushed.
- Draft pull request [#1](https://github.com/evgenursic/optimalen_nakup/pull/1) opened and
  intentionally left in draft.
- Product, market, vertical, authentication, billing, and infrastructure defaults recorded.
- Node 22/pnpm monorepo, shared versioned domain contracts, design tokens, security primitives,
  localized Next.js public surface, and isolated worker process compile successfully.
- Convex local backend accepts the indexed multi-tenant schema and functions.
- Clerk identity mapping, organization RBAC, plan entitlements, usage limits, audit events, research
  jobs, signed worker lease protocol, idempotent worker calls, Lemon Squeezy webhook state, and
  tenant isolation have automated coverage.
- Clerk/Convex client composition, verified-email invitations, closed-beta waitlist, Lemon Squeezy
  checkout/customer portal providers, signed idempotent subscription processing, and Resend/local
  email transports are implemented.
- The signed worker protocol now implements claim, heartbeat, events, offer/recommendation writes,
  completion, failure, model-cost accounting, and source-health reporting with retry-safe
  idempotency.
- The isolated research runner enforces runtime, page, and AI-cost budgets; cancellation; partial
  coverage; expired source-policy gates; DNS-pinned SSRF protection; robots rules; source pacing;
  circuit breakers; deterministic extraction; conflict analysis; scoring; and evidence-bound AI
  synthesis.
- Sanitized fixtures cover the BMW M Sport evidence case, ENAA computers, and Big Bang white goods.
  Foreign currencies are normalized from the ECB daily reference-rate feed. Ambiguous pages can be
  rendered only after active content and network surfaces are removed, in a JavaScript-disabled
  Playwright context with all requests blocked.
- Official OpenAI documentation was reviewed for the Responses API and the configured
  `gpt-5.6-luna`, `gpt-5.6-terra`, and `gpt-5.6-sol` routing. Live API calls remain unverified until
  a project key and budget are configured.
- GitHub Actions quality, Playwright, dependency audit, and CodeQL workflows are present with action
  revisions pinned to commit SHAs.
- The authenticated surface now includes workspace bootstrap/switching, natural-language intake,
  explicit filter confirmation, live progress, sortable and paginated responsive results, dynamic
  category attributes, evidence and score inspection, pinning, four-offer comparison, formula-safe
  CSV, printable/PDF output, and cancellation.
- Saved searches schedule bounded repeat research at 24/72/168-hour intervals, respect monthly and
  page entitlements, create deduplicated in-app alerts, and dispatch through Resend only when the
  provider confirms delivery. Unconfigured email is recorded as `skipped`, never `sent`.
- Workspace settings implement verified-email invitations, RBAC management, billing checkout/portal,
  bounded personal JSON export, and a last-owner-safe deletion flow that removes Clerk identity and
  anonymizes Convex data.
- Administration implements entitlements, monthly usage/model cost, audit events, source health, a
  worker kill switch, and non-sensitive platform configuration. Public prices appear only from a
  valid EUR admin configuration; otherwise the real closed-beta waitlist remains.
- LCP, INP, CLS, and TTFB instrumentation omits dynamic identifiers and uses same-origin,
  server-secret, rate-limited ingestion. Field targets remain unverified until production traffic.

## In progress

- Figma product design system and critical-screen parity validation.
- Docker/Hostinger deployment, observability, backup/restore rehearsal, authenticated E2E, and
  Lighthouse release evidence.
- Legal/owner approval and then a bounded live smoke test for each conditional source adapter.

## Next action

Create and verify the required Figma file, then implement and exercise the pinned container,
deployment, observability, backup/restore, authenticated-E2E, and Lighthouse release gates.
