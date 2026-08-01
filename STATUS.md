# Status

Updated: 2026-08-01

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
- OpenAI model-cost accounting now uses the public standard short-context rates effective
  2026-07-30, with an explicit pricing version recorded on intake and worker cost events. The
  routing remains Luna for intake, Terra for extraction, and Sol for evidence-bound synthesis or
  disputes; deterministic arithmetic and scoring remain outside the model.
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
  server-secret, rate-limited ingestion. It records the route, application version, and only a
  server-derived coarse device class; the User-Agent value is never persisted. Field targets remain
  unverified until production traffic. The migration-safe optional schema field and required new
  write validator passed a one-shot local Convex deployment.
- Digest-pinned multi-stage images, a hardened Compose topology, Caddy ingress, a production
  observability profile, GHCR publication, SHA/digest-based SSH deployment with automatic rollback,
  encrypted daily Convex backups, and a guarded restore rehearsal are implemented. Linux container
  execution remains pending until the milestone runs in GitHub Actions.
- A primary-source-backed competitor matrix, landing messages, interview tasks, outreach, pricing
  experiments, privacy-bounded analytics events, and a 30-day closed-beta decision plan are recorded
  in `MARKET_VALIDATION.md`.
- The versioned evaluation package now contains all ten required scenarios plus executable,
  evidence-first metric calculations and automated arithmetic checks.
- Public pages run against the same standalone server entry point as the container, use per-request
  nonce CSP without `unsafe-eval`, and pass 18 desktop/mobile production E2E checks.
- The installable PWA now registers through the existing CSP nonce. Its bounded service worker
  caches only same-origin hashed Next.js static assets, the public icon, and the manifest; it never
  intercepts or stores navigations, HTML, API responses, authenticated application data, or research
  results.
- Three-run desktop Lighthouse medians are 100 in Performance, Accessibility, Best Practices, and
  SEO for all four public routes. All public transfer budgets pass after deferring the Clerk sign-in
  client until user activation.
- Two clean Ubuntu 24.04 Lighthouse runs stored all 24 public reports per run as digest-checked
  artifacts. Mobile Performance remains 97-99 rather than the required exact 100; Accessibility,
  Best Practices, SEO, and transfer budgets are 100/pass.
- The Ubuntu container job parses the shell scripts, renders the full Compose model, builds the web,
  worker, and backup targets, and starts the hardened web, disconnected worker, Caddy, OTel,
  Prometheus, Loki, and Grafana services. Web, explicit disconnected-worker state, and every
  observability endpoint pass from the intended private network.
- Latest completed CI baseline
  [`30461698590`](https://github.com/evgenursic/optimalen_nakup/actions/runs/30461698590) verifies
  commit `b7b39fd`: quality/build, all 16 public E2E scenarios, and container startup/health pass;
  CodeQL run [`30461703790`](https://github.com/evgenursic/optimalen_nakup/actions/runs/30461703790)
  is also green. The only red job remains the intentionally strict mobile Lighthouse Performance 100
  assertion; its 24 reports are preserved as artifact `8728119687` with ZIP SHA-256
  `6c836961a5a5aabbcd1ef4d7620fe2a6b2c3fc8903bc2e2b10734190a7764498`.

## In progress

- Figma product design system and critical-screen parity validation. The owner explicitly approved
  Phase 1 on 2026-07-29. The existing file and its sole page remain readable through metadata, while
  a fresh read-only Phase 1 inventory through the general endpoint returned `INVALID_ARGUMENT`
  before any mutation.
- Real backup/restore rehearsal, authenticated production E2E, and the authenticated Lighthouse
  result.
- Mobile Lighthouse Performance 100 remains open; the latest clean Ubuntu medians are 98 on all four
  public routes while every other category and transfer budget passes.
- Legal/owner approval and then a bounded live smoke test for each conditional source adapter.

## Next action

Continue the externally blocked Figma work when its write endpoint recovers, while preserving the
strict mobile Lighthouse 100 gate. Production credentials remain reserved for authenticated E2E,
backup/restore, and bounded live-source verification.
