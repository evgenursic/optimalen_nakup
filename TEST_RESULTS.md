# Test results

## 2026-08-01 current-head CI evidence (`a0b3de3`)

| Command or gate                          | Result | Evidence                                                         |
| ---------------------------------------- | ------ | ---------------------------------------------------------------- |
| GitHub quality/production build          | Pass   | Run `30690962971`, quality job completed successfully.           |
| Public Playwright E2E                    | Pass   | Run `30690962971`, all 18 desktop/mobile scenarios passed.       |
| Container build/startup/health           | Pass   | Run `30690962971`, container job completed successfully.         |
| CodeQL                                   | Pass   | Run `30690962968` for the same commit.                           |
| Public Lighthouse desktop                | Pass   | Three runs per route, all categories 100; artifact `8815725793`. |
| Public Lighthouse mobile Performance 100 | Open   | Mobile medians 98/99/98/98; other categories and budgets pass.   |

Artifact `8815725793` is retained for the current-head reports; its ZIP digest is
`sha256:864a417b7020d9a4f65dd38bb22f32b194b28e6763592dfff69644e79d551f90`. The strict mobile gate
remains intentionally enforced and is the only failed CI assertion.

## 2026-08-01 synthesis-context bound

| Command or gate        | Result      | Evidence                                                                                                                                                       |
| ---------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `corepack pnpm verify` | Pass        | Format, zero-warning lint, strict TypeScript, 16 workspace test tasks, 13 root Convex/integration tests, and all 9 production builds pass on commit `9f6281c`. |
| Worker unit tests      | Pass        | 16 tests pass, including the top-ranked synthesis-candidate bound.                                                                                             |
| Config unit tests      | Pass        | 8 tests pass, including the default and override for `WORKER_MAX_SYNTHESIS_OFFERS`.                                                                            |
| AI context policy      | Implemented | Sol receives only the bounded ranked prefix (default 10, configurable 1-20); all ranked offers remain persisted.                                               |

The CSS palette-scope change reduces the standalone stylesheet from 30,750 to 29,264 bytes; the
public E2E/axe suite remains green and the mobile Lighthouse gate is still intentionally open.

The local shell reports the expected non-blocking Node 24.14/pnpm 11.9 engine warning; CI runs on
the pinned Node 22 workflow and remains authoritative for release evidence.

## 2026-08-01 public performance optimization follow-up

| Command or gate                              | Result | Evidence                                                                                                                                                   |
| -------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web strict typecheck, lint, build            | Pass   | Public client deferral, inline SVG icons, and cacheable CSS compile without warnings.                                                                      |
| `corepack pnpm format:check`                 | Pass   | All repository files match Prettier.                                                                                                                       |
| `corepack pnpm test`                         | Pass   | 16 workspace tasks plus 13 root Convex/integration tests pass.                                                                                             |
| GitHub quality/build, E2E, container, CodeQL | Pass   | Run `30686773465` is green for every job except the intentionally strict mobile Lighthouse Performance 100 gate.                                           |
| Public Lighthouse mobile                     | Open   | Run `30686773465`; medians are 98–99, with all other categories and transfer budgets passing. Artifact `8814285810` is digest-checked in `PERFORMANCE.md`. |

The attempted static-public-page variant was rejected: removing the per-request layout headers
caused Next inline/client scripts to lose the nonce, breaking CSP-compatible waitlist hydration and
PWA registration. The final branch retains dynamic nonce rendering and strict CSP.

## 2026-08-01 OpenAI model-cost accounting correction

The official [OpenAI API pricing table](https://developers.openai.com/api/docs/pricing) was
rechecked after the 2026-07-30 pricing change. Standard short-context rates are now represented for
the configured GPT-5.6 family: Luna $0.20/$0.02/$1.20, Terra $2.00/$0.20/$12.00, and Sol
$5.00/$0.50/$30.00 per million input/cached-input/output tokens. Cache writes remain calculated at
1.25x uncached input, as specified by the same table. The worker and web intake now emit pricing
version `openai-api-pricing-2026-07-30`.

| Command or gate                                   | Result | Evidence                                                                    |
| ------------------------------------------------- | ------ | --------------------------------------------------------------------------- |
| `corepack pnpm --filter @optimalen-nakup/ai test` | Pass   | 3 AI cost-accounting tests pass, including the corrected Terra calculation. |
| AI lint, typecheck, and build                     | Pass   | Package lint, strict TypeScript, and declaration build pass.                |
| Web and worker typecheck                          | Pass   | Both application package typechecks pass.                                   |
| `corepack pnpm test`                              | Pass   | 16 workspace tasks and 13 root Convex/integration tests pass.               |
| `corepack pnpm build`                             | Pass   | All 9 workspace production builds pass; Next.js standalone build passes.    |
| `corepack pnpm format:check`                      | Pass   | All files match Prettier formatting.                                        |

## 2026-07-28 operations, evaluation, and performance milestone

Environment: Windows 11 with direct Node 22.18.0 and corepack pnpm 11.17.0. The Codex shell's nested
pnpm fallback still reports Node 24.14.0/pnpm 11.9.0, so the pinned Ubuntu Node 22 workflow remains
the authoritative clean-environment gate.

| Command or gate                                             | Result | Evidence                                                                                      |
| ----------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| `corepack pnpm verify`                                      | Pass   | Format, zero-warning lint, strict types, 58 tests, and the Next.js standalone build passed.   |
| Web Vitals device classification and persistence tests      | Pass   | Four new tests cover coarse classification, storage, and absence of retained User-Agent data. |
| `corepack pnpm test:e2e`                                    | Pass   | All 18 desktop/mobile Chromium scenarios passed against the standalone production server.     |
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
[`30461698590`](https://github.com/evgenursic/optimalen_nakup/actions/runs/30461698590)
independently passes the quality/production-build job, all 16 public Playwright scenarios, and the
complete container startup/health job for commit `b7b39fd`. CodeQL run
[`30461703790`](https://github.com/evgenursic/optimalen_nakup/actions/runs/30461703790) also passes.
Only the strict mobile Lighthouse Performance 100 job fails. Its uploaded `lighthouse-public`
artifact is `8728119687`, contains all 24 HTML/JSON reports, and has ZIP SHA-256
`6c836961a5a5aabbcd1ef4d7620fe2a6b2c3fc8903bc2e2b10734190a7764498`.

The 58 automated tests comprise 45 package tests and 13 Convex application, protocol, authorization,
and tenant-isolation tests. New coverage validates the ten-case evaluation inventory and metric
arithmetic, cautious worker concurrency default, CSP-compatible waitlist hydration, public health
headers, responsive navigation, skip links, serious/critical axe findings on every measured public
route, strict optional-secret parsing that accepts credential-free startup without accepting a short
configured secret, privacy-bounded device classification for Web Vitals, and PWA registration that
proves its runtime cache contains only the approved public static allowlist.

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
