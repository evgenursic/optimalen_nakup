# Test results

## 2026-08-13 explicit public Lighthouse median gate (`0a9202e`)

| Gate                       | Result | Evidence                                                                 |
| -------------------------- | ------ | ------------------------------------------------------------------------ |
| Push CI quality/build      | Pass   | Run `31660347514`; format, lint, types, tests, audit and build passed.   |
| Push CI Playwright         | Pass   | Run `31660347514`; all 18 public desktop/mobile scenarios passed.        |
| Push CI containers         | Pass   | Run `31660347514`; Compose and observability health checks passed.       |
| Push CI public Lighthouse  | Pass   | Artifact `9166090565`; explicit medians are 100 for all routes/profiles. |
| PR merge public Lighthouse | Open   | Run `31660349768`; merge-environment mobile `how-it-works` median 0.99.  |
| CodeQL                     | Pass   | Run `31660349746` for the same commit.                                   |

The gate now uses a repository-owned script to calculate the median of exactly three JSON reports
per route and category. LHCI still enforces transfer budgets; its per-sample category threshold is
set to zero only because LHCI otherwise ignores the configured median for category assertions. The
explicit script remains strict at median 1.00. The push and PR merge runners produced different
mobile measurements for the same source, so the merge result remains an honest open variance blocker
rather than being hidden by a looser threshold. Artifact digest:
`sha256:730bffc1bab9b59a5a477a0a577527e28a77d63b55893c1d266be35188de6aa4`.

## 2026-08-13 source-policy availability recheck

| Endpoint                                     | Result   | Evidence                                                     |
| -------------------------------------------- | -------- | ------------------------------------------------------------ |
| BMW `robots.txt`                             | Pass     | HTTP 200; redirected to `robots_sl.txt`; sitemap advertised. |
| Enaa `robots.txt`                            | Pass     | HTTP 200; `/sitemap` advertised; restricted paths unchanged. |
| Enaa current terms `/cms/63`                 | Pass     | HTTP 200.                                                    |
| Big Bang `robots.txt`                        | Pass     | HTTP 200; `/sitemap.xml` advertised.                         |
| Big Bang current terms `/pogoji-poslovanja/` | Pass     | HTTP 200.                                                    |
| Adapter activation                           | Not done | All manifests remain `conditional`; legal approval required. |

The checks were read-only and performed on 2026-08-13. They update the technical review timestamps
to 2026-08-13 with expiry on 2026-09-12; they do not authorize live crawling or replace a
terms/legal review.

## 2026-08-13 verified public Lighthouse 100 CI (`74ac4f9`)

| Command or gate                 | Result | Evidence                                                                   |
| ------------------------------- | ------ | -------------------------------------------------------------------------- |
| GitHub quality/production build | Pass   | Run `31658076444`; formatting, lint, strict types, tests, audit, build.    |
| Public Playwright E2E           | Pass   | Run `31658076444`; all 18 desktop/mobile scenarios passed.                 |
| Container build/startup/health  | Pass   | Run `31658076444`; Compose and observability checks passed.                |
| CodeQL                          | Pass   | Run `31658076472` for the same source.                                     |
| Public Lighthouse desktop       | Pass   | Three-run category assertions passed for all four public routes.           |
| Public Lighthouse mobile        | Pass   | Three-run category assertions passed; median Performance is 100 per route. |
| Public transfer budgets         | Pass   | Script and stylesheet budgets passed in both Lighthouse profiles.          |

The artifact contains all 24 production-build reports. Its raw samples include one mobile pricing
score of 99 and one sign-in score of 87; the configured median aggregation is 100 for every public
route and category. ZIP digest:
`sha256:8e3464a57d6ab4ac2e0faa13a0c89742a44381e51b24c93cddc5078bb60f345b`.

## 2026-08-13 local verification after nonce-CSP change

`corepack pnpm verify` passed on the current working tree: formatting, lint, strict TypeScript,
workspace/root tests, and all nine production builds completed successfully. The Windows machine
uses Node `24.19.0` while the repository support range is Node 22, so pnpm emitted the expected
engine warning; the authoritative CI run uses Node `22.18.0` and also passed.

## 2026-08-13 nonce-CSP CI evidence (`47dcb31`)

| Command or gate                          | Result | Evidence                                                                |
| ---------------------------------------- | ------ | ----------------------------------------------------------------------- |
| GitHub quality/production build          | Pass   | Run `31656269642`; formatting, lint, strict types, tests, audit, build. |
| Public Playwright E2E                    | Pass   | Run `31656269642`; all 18 desktop/mobile scenarios passed.              |
| Container build/startup/health           | Pass   | Run `31656269642`; Compose and observability checks passed.             |
| CodeQL                                   | Pass   | Run `31656269578` for the same source.                                  |
| Public Lighthouse desktop                | Pass   | Three runs per route; all category assertions passed.                   |
| Public Lighthouse mobile Performance 100 | Open   | Medians 98/98/98/98; other categories and budgets passed.               |

The request-scoped CSP nonce is now propagated from the proxy to public inline style and runtime
scripts. This removes the fragile build-specific hash list that failed on clean CI builds without
loosening script policy. Artifact `9164652577` has ZIP digest
`sha256:5d50de7f0d1747b84b33930e9b2d35285fa96cf700e1bfe3cbdbd38575c806a6`.

## 2026-08-13 rejected RSC streaming experiment (`83d4cae`)

| Command or gate                          | Result | Evidence                                                                |
| ---------------------------------------- | ------ | ----------------------------------------------------------------------- |
| GitHub quality/production build          | Pass   | Run `31647693574`; formatting, lint, strict types, tests, audit, build. |
| Public Playwright E2E                    | Pass   | Run `31647693574`; all 18 desktop/mobile scenarios passed.              |
| Container build/startup/health           | Pass   | Run `31647693574`; Compose and observability checks passed.             |
| CodeQL                                   | Pass   | Run `31647693576` for the same source commit.                           |
| Local `corepack pnpm verify` on revert   | Pass   | Formatting, lint, strict types, 58 tests, and 9 production builds.      |
| Local Playwright E2E on revert           | Pass   | `corepack pnpm test:e2e`; all 18 desktop/mobile scenarios passed.       |
| Public Lighthouse desktop                | Open   | `/sl` values 99/100/99; other routes passed their category assertions.  |
| Public Lighthouse mobile Performance 100 | Open   | Values 97/98/99, 97/98/98, 97/98/98, and 98/99/98 by route.             |

The experiment streamed below-fold landing sections behind an async React Server Component boundary.
It preserved all public E2E behavior but did not improve the mobile gate and introduced desktop
score variability, so it was reverted in `4fc6058`. Artifact `9161583646` has ZIP digest
`sha256:46da05dd5560143568ae50336808cd6eb0d1c510daf99342eecce6a4c82b1d26`.

## 2026-08-13 stable-head CI evidence (`8c4bec4`)

| Command or gate                          | Result | Evidence                                                                |
| ---------------------------------------- | ------ | ----------------------------------------------------------------------- |
| GitHub quality/production build          | Pass   | Run `31648571304`; formatting, lint, strict types, tests, audit, build. |
| Public Playwright E2E                    | Pass   | Run `31648571304`; all 18 desktop/mobile scenarios passed.              |
| Container build/startup/health           | Pass   | Run `31648571304`; Compose and observability checks passed.             |
| CodeQL                                   | Pass   | Run `31648571336` for the same source.                                  |
| Public Lighthouse desktop                | Pass   | Three runs per route, all categories 100; artifact `9161880420`.        |
| Public Lighthouse mobile Performance 100 | Open   | Medians 98/98/98/99; other categories and budgets pass.                 |

The report artifact ZIP digest is
`sha256:6521cd64f416bd909c8e265e3537f16970a8eff9d865563c1f99b2e9a5d61891`; the strict mobile
Performance assertion remains intentionally enforced.

## 2026-08-13 hero-rendering optimization (`f96adb9`)

| Command or gate                          | Result | Evidence                                                                |
| ---------------------------------------- | ------ | ----------------------------------------------------------------------- |
| GitHub quality/production build          | Pass   | Run `31649694061`; formatting, lint, strict types, tests, audit, build. |
| Public Playwright E2E                    | Pass   | Run `31649694061`; all 18 desktop/mobile scenarios passed.              |
| Container build/startup/health           | Pass   | Run `31649694061`; Compose and observability checks passed.             |
| CodeQL                                   | Pass   | Run `31649694038` for the same source.                                  |
| Public Lighthouse desktop                | Pass   | Three runs per route, all categories 100; artifact `9162304050`.        |
| Public Lighthouse mobile Performance 100 | Open   | Medians 98/98/98/98; other categories and budgets pass.                 |

The `blur-3xl` decorative hero effect was replaced with a radial gradient. It preserves the visual
role and public E2E behavior while avoiding a filter-heavy first viewport. Artifact ZIP digest:
`sha256:280e76f2d8bde6da05cec88a2718082c4ddd1dbc3d748d24778a41ce9197448b`.

## 2026-08-12 redirect-allowlist CI evidence (`56d4fb9`)

| Command or gate                          | Result | Evidence                                                                |
| ---------------------------------------- | ------ | ----------------------------------------------------------------------- |
| GitHub quality/production build          | Pass   | Run `31645543065`; formatting, lint, strict types, tests, audit, build. |
| Public Playwright E2E                    | Pass   | Run `31645543065`; all 18 desktop/mobile scenarios passed.              |
| Container build/startup/health           | Pass   | Run `31645543065`; Compose and observability checks passed.             |
| CodeQL                                   | Pass   | Run `31645543098` for the same commit.                                  |
| Public Lighthouse desktop                | Pass   | Three runs per route, all categories 100; artifact `9160851515`.        |
| Public Lighthouse mobile Performance 100 | Open   | Medians 97/98/98/98; other categories and budgets pass.                 |

The Lighthouse artifact digest is
`sha256:eda67620a40aeae17a75c7d26a99a87222b545662a6221ba13b453418c74529f`. The only failed CI
assertion is the intentionally strict mobile Performance 100 gate; no threshold was weakened.

## 2026-08-12 source-policy recheck

| Check                           | Result        | Evidence                                                                                                                    |
| ------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| BMW `robots.txt`                | Pass          | HTTP 200; redirect to Slovenian robots policy; `/rabljeno/sitemap.xml` advertised and `/rabljeno/api` disallowed.           |
| Enaa `robots.txt` and terms     | Pass          | HTTP 200 robots; `/sitemap` advertised; current terms URL `/cms/63` returns HTTP 200; stale `/splosni-pogoji` returned 404. |
| Big Bang `robots.txt` and terms | Pass          | HTTP 200 robots; `/sitemap.xml` advertised; current terms URL `/pogoji-poslovanja/` returns HTTP 200.                       |
| Adapter policy activation       | Not performed | All three manifests remain `conditional`; owner/legal approval is still required.                                           |
| Worker adapter tests            | Pass          | `corepack pnpm --filter @optimalen-nakup/worker test`: 7 files, 18 tests.                                                   |

The worker security tests also cover redirect URL validation; the full local `corepack pnpm verify`
run passed after this change (format, lint, strict typecheck, 16 workspace test tasks, 13 root
Convex/integration tests, and all 9 production builds).

The network checks were read-only and were not treated as permission to enable live crawling.

## 2026-08-12 current-head CI evidence (`da76b90`)

| Command or gate                          | Result | Evidence                                                         |
| ---------------------------------------- | ------ | ---------------------------------------------------------------- |
| GitHub quality/production build          | Pass   | Run `31634319725`, quality job and dependency audit passed.      |
| Public Playwright E2E                    | Pass   | Run `31634319725`, all 18 desktop/mobile scenarios passed.       |
| Container build/startup/health           | Pass   | Run `31634319725`, container job completed successfully.         |
| CodeQL                                   | Pass   | Run `31634319677` for the same commit.                           |
| Public Lighthouse desktop                | Pass   | Three runs per route, all categories 100; artifact `9156656165`. |
| Public Lighthouse mobile Performance 100 | Open   | Mobile medians 98/97/99/97; other categories and budgets pass.   |

Artifact `9156656165` is retained for the current-head reports; its ZIP digest is
`sha256:f08155be7ce667ab8f523d1271033838e0998b16fcb207f76e5429838dce400f`. The strict mobile gate
remains intentionally enforced and is the only failed CI assertion.

## 2026-08-12 Webpack production-build optimization (`1c41642`)

| Command or gate                          | Result | Evidence                                                                  |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------- |
| Webpack production build                 | Pass   | `next build --webpack` completed in the quality job of run `31640940677`. |
| Dependency audit                         | Pass   | Run `31640940677`, no production vulnerabilities reported.                |
| Public Playwright E2E                    | Pass   | Run `31640940677`, all 18 desktop/mobile scenarios passed.                |
| Container build/startup/health           | Pass   | Run `31640940677`, container job completed successfully.                  |
| Public Lighthouse desktop                | Pass   | Three runs per route, all categories 100; artifact `9159087180`.          |
| Public Lighthouse mobile Performance 100 | Open   | All route medians are 99; other categories and budgets pass.              |

The Webpack build reduced local initial script transfer to approximately 129 KB from approximately
153 KB without changing the CSP, PWA, accessibility, or public E2E behavior. The artifact ZIP digest
is `sha256:008834322d7d85edc89997b0894f8a90ac410c1fdc405a717681db5a8d210ebe`.

The subsequent current-head run `31642878579` repeats the same gates with the full documentation
tree and CodeQL `31642878569`; all non-Lighthouse jobs pass. The current mobile medians are
99/99/97/98 and the current report artifact is `9159800457`, digest
`sha256:1510b8bccd68ac677862a6a59a1688320d99cefde2aa4019d0ca4b87b5ec289b`.

The next completed docs-head rerun `31643808786` also passes quality/build, dependency audit,
containers, all 18 public Playwright scenarios, and CodeQL. Desktop Lighthouse remains 100 in every
category. Mobile Performance medians are 99/99/99/97; Accessibility, Best Practices, SEO, and
transfer budgets pass. Artifact `9160148063` is retained with digest
`sha256:5d57747d44b1f95d3e37fa7b62c40ae443090de12d5a5e2e5a602127be63a566`. The strict mobile
Performance 100 assertion remains open.

## 2026-08-12 rejected below-fold deferral experiment (`be3dbe3`)

| Command or gate                          | Result | Evidence                                                         |
| ---------------------------------------- | ------ | ---------------------------------------------------------------- |
| GitHub quality/production build          | Pass   | Run `31639501917`, quality job and dependency audit passed.      |
| Public Playwright E2E                    | Pass   | Run `31639501917`, all 18 desktop/mobile scenarios passed.       |
| Container build/startup/health           | Pass   | Run `31639501917`, container job completed successfully.         |
| Public Lighthouse desktop                | Pass   | Three runs per route, all categories 100; artifact `9158512173`. |
| Public Lighthouse mobile Performance 100 | Open   | Medians 96/97/96/99; worse than the documented baseline.         |

The experiment added `content-visibility: auto` to light below-the-fold sections. It was reverted in
`21fdbd3` after the clean Ubuntu run showed a regression in the strict mobile Performance gate. The
artifact ZIP digest is `sha256:6dca96f6fc97e1f43ad27b853853b7d11e43ff086a1da48e19d4457ba45e577c`.

## 2026-08-12 rejected performance experiment (`b56a308`)

| Command or gate                          | Result | Evidence                                                         |
| ---------------------------------------- | ------ | ---------------------------------------------------------------- |
| GitHub quality/production build          | Pass   | Run `31635807214`, quality job and dependency audit passed.      |
| Public Playwright E2E                    | Pass   | Run `31635807214`, all 18 desktop/mobile scenarios passed.       |
| Container build/startup/health           | Pass   | Run `31635807214`, container job completed successfully.         |
| Public Lighthouse desktop                | Pass   | Three runs per route, all categories 100; artifact `9157204112`. |
| Public Lighthouse mobile Performance 100 | Open   | Medians 98/99/97/97; no material improvement over the baseline.  |

The experiment added `contain: layout paint` to independent public sections. It preserved the
accessibility tree and axe checks, but the variable mobile score did not justify the extra CSS
complexity, so it was reverted in `c2b3e47`. The artifact ZIP digest is
`sha256:493c4f761a3bdd8dde3ca41b844b8550199943e12422e9ae84442ea547478e5d`.

## 2026-08-01 previous current-head CI evidence (`a0b3de3`)

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
