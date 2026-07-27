# Test results

## 2026-07-27 operations, evaluation, and performance milestone

Environment: Windows 11 with direct Node 22.18.0 and corepack pnpm 11.17.0. The Codex shell's nested
pnpm fallback still reports Node 24.14.0/pnpm 11.9.0, so the pinned Ubuntu Node 22 workflow remains
the authoritative clean-environment gate.

| Command or gate                                             | Result  | Evidence                                                                                     |
| ----------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------- |
| `corepack pnpm verify`                                      | Pass    | Format, zero-warning lint, strict types, 50 tests, and the Next.js standalone build passed.  |
| `corepack pnpm test:e2e`                                    | Pass    | All 16 desktop/mobile Chromium scenarios passed against the standalone production server.    |
| `corepack pnpm audit --prod --audit-level high`             | Pass    | No known production dependency vulnerabilities.                                              |
| `pnpm --filter @optimalen-nakup/worker deploy --prod ...`   | Pass    | Production worker deployment tree and entry point were materialized locally on 2026-07-26.   |
| Public Lighthouse, desktop, three runs per route            | Pass    | All four routes reached 100 in all categories and passed 170 KiB JS/50 KiB CSS budgets.      |
| Public Lighthouse, mobile, three runs per route             | Open    | Accessibility, Best Practices, SEO, and budgets pass; Performance medians remain below 100.  |
| `bash -n ops/scripts/*.sh`                                  | Pending | Local `bash` resolves to WSL, but no WSL distribution exists; Ubuntu Actions performs this.  |
| Docker build, Compose rendering, startup, and health checks | Pending | Docker is unavailable locally; the dedicated Ubuntu Actions job is authoritative after push. |

The 50 automated tests comprise 38 package tests and 12 Convex application, protocol, authorization,
and tenant-isolation tests. New coverage validates the ten-case evaluation inventory and metric
arithmetic, cautious worker concurrency default, CSP-compatible waitlist hydration, public health
headers, responsive navigation, skip links, and serious/critical axe findings on every measured
public route.

The standalone E2E launcher copies only generated public/static assets beside Next.js' traced server
and runs the same `server.js` entry point as the web image. This replaces the earlier `next start`
warning and prevents a development-adjacent runtime from being mistaken for container evidence. One
full-suite desktop navigation timed out under concurrent local load and passed on its configured
retry; the same axe route then passed a clean isolated rerun in 10.6 seconds. It is recorded as a
local flake, not concealed as a first-attempt success.

Lighthouse details and remaining release limits are recorded in `PERFORMANCE.md`. Local report JSON
and HTML exist under the ignored `lighthouse-reports/` directory. They are diagnostic evidence, not
durable release artifacts; GitHub Actions must upload the clean Linux reports before the release
gate can be considered stored.

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
