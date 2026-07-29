# Test results

## 2026-07-28 operations, evaluation, and performance milestone

Environment: Windows 11 with direct Node 22.18.0 and corepack pnpm 11.17.0. The Codex shell's nested
pnpm fallback still reports Node 24.14.0/pnpm 11.9.0, so the pinned Ubuntu Node 22 workflow remains
the authoritative clean-environment gate.

| Command or gate                                             | Result | Evidence                                                                                      |
| ----------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| `corepack pnpm verify`                                      | Pass   | Format, zero-warning lint, strict types, 58 tests, and the Next.js standalone build passed.   |
| Web Vitals device classification and persistence tests      | Pass   | Four new tests cover coarse classification, storage, and absence of retained User-Agent data. |
| `corepack pnpm test:e2e`                                    | Pass   | All 16 desktop/mobile Chromium scenarios passed against the standalone production server.     |
| `corepack pnpm audit --prod --audit-level high`             | Pass   | No known production dependency vulnerabilities.                                               |
| `pnpm --filter @optimalen-nakup/worker deploy --prod ...`   | Pass   | Production worker deployment tree and entry point were materialized locally on 2026-07-26.    |
| `corepack pnpm convex:codegen`                              | Note   | The standalone command produced no output before the local four-minute timeout.               |
| `corepack pnpm exec convex dev --once --typecheck enable`   | Pass   | Local Convex deployment accepted the schema and functions after a 15.09 s type-check.         |
| Public Lighthouse, desktop, three runs per route            | Pass   | All four routes reached 100 in all categories and passed 170 KiB JS/50 KiB CSS budgets.       |
| Public Lighthouse, mobile, three runs per route             | Open   | Accessibility, Best Practices, SEO, and budgets pass; Performance medians remain below 100.   |
| `bash -n ops/scripts/*.sh`                                  | Pass   | The pinned Ubuntu 24.04 Actions runner parses every operations script successfully.           |
| Docker build, Compose rendering, startup, and health checks | Pass   | Web, worker, Caddy, OTel, Prometheus, Loki, and Grafana passed on Ubuntu 24.04.               |

GitHub Actions run
[`30368022436`](https://github.com/evgenursic/optimalen_nakup/actions/runs/30368022436) is the
authoritative container evidence. It rendered the observability/backup Compose model, built the web,
worker, and backup targets, started all core and observability services, confirmed the public web
health endpoint, confirmed the credential-free worker's explicit `503 not_configured` state, and
verified OTel, Prometheus, Loki, and Grafana from the private application network before clean
shutdown.

Latest completed baseline run
[`30459547228`](https://github.com/evgenursic/optimalen_nakup/actions/runs/30459547228)
independently passes the quality/production-build job, all 16 public Playwright scenarios, the
complete container startup/health job, and CodeQL for commit `b2cff1e`. Only the strict mobile
Lighthouse Performance 100 job fails. Its uploaded `lighthouse-public` artifact is `8727262935`,
contains all 24 HTML/JSON reports, and has ZIP SHA-256
`ae9d8b949d07bac7be6100f42adda708d8730283b60f2e988607e718fc9bfeea`.

The 58 automated tests comprise 45 package tests and 13 Convex application, protocol, authorization,
and tenant-isolation tests. New coverage validates the ten-case evaluation inventory and metric
arithmetic, cautious worker concurrency default, CSP-compatible waitlist hydration, public health
headers, responsive navigation, skip links, serious/critical axe findings on every measured public
route, strict optional-secret parsing that accepts credential-free startup without accepting a short
configured secret, and privacy-bounded device classification for Web Vitals.

The standalone E2E launcher copies only generated public/static assets beside Next.js' traced server
and runs the same `server.js` entry point as the web image. This replaces the earlier `next start`
warning and prevents a development-adjacent runtime from being mistaken for container evidence. One
full-suite desktop navigation timed out under concurrent local load and passed on its configured
retry; the same axe route then passed a clean isolated rerun in 10.6 seconds. It is recorded as a
local flake, not concealed as a first-attempt success.

Lighthouse details and remaining release limits are recorded in `PERFORMANCE.md`. Local report JSON
and HTML exist under the ignored `lighthouse-reports/` directory and remain diagnostic only. Two
clean Ubuntu runs uploaded all 24 public HTML/JSON reports as digest-checked GitHub Actions
artifacts; the current-head run adds a third digest-checked 24-report set. The stored evidence still
fails the exact mobile Performance 100 assertion.

Convex tests cover tenant isolation, verified-email invitations, waitlist deduplication/rate
limiting, subscription replay protection, worker request idempotency, lease claiming, budget
cancellation, user-scoped pins/alerts, scheduled monitoring, public-pricing validation, intake-cost
deduplication, platform-admin access, last-owner deletion protection, and account anonymization.

Worker fixtures and unit/integration tests cover HMAC construction and retry idempotency, DNS
rebinding/private-address rejection, redirect checks, robots parsing, rate/circuit controls,
sanitized offline Playwright input, ECB conversion/cache behavior, all three initial adapters, the
BMW M Sport evidence case, hard filters, TCO, conflicts, scoring, partial completion, model-cost
deduplication, and source-health recovery. Authenticated production E2E, real backup/restore, and
live-source results remain unclaimed.
