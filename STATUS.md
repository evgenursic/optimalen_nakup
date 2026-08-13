# Status

Updated: 2026-08-13

## Verified

- Latest clean Ubuntu CI run
  [`31658076444`](https://github.com/evgenursic/optimalen_nakup/actions/runs/31658076444) for
  `74ac4f9` passes quality/build, dependency audit, containers, all 18 public Playwright scenarios,
  and the Lighthouse gate; CodeQL
  [`31658076472`](https://github.com/evgenursic/optimalen_nakup/actions/runs/31658076472) passes as
  well. Public Lighthouse median scores are 100 for Performance, Accessibility, Best Practices, and
  SEO on all four public routes in both mobile and desktop profiles, with transfer budgets passing.
  Artifact `9165300267` is retained with digest
  `sha256:8e3464a57d6ab4ac2e0faa13a0c89742a44381e51b24c93cddc5078bb60f345b`.
- Public critical CSS is now loaded once from the generated public stylesheet instead of being
  duplicated in the HTML and React Flight payload. The change preserves the request-scoped nonce for
  inline runtime scripts, passes the 18 public E2E/axe checks, and materially lowers mobile
  main-thread work. Individual Lighthouse samples remain subject to normal variance; the release
  gate is the configured three-run median.
- A 2026-08-13 read-only source-policy availability check returned HTTP 200 for BMW robots, Enaa
  robots and `/cms/63`, and Big Bang robots and `/pogoji-poslovanja/`. Adapter manifests were
  refreshed with the technical review timestamp and remain `conditional`; no live crawling or legal
  activation was performed.

- The nonce-propagating public SSR change in `47dcb31` passed quality/build, dependency audit,
  container startup/health, all 18 public Playwright scenarios, desktop Lighthouse, and CodeQL
  (`31656269642`, CodeQL `31656269578`). Mobile Accessibility, Best Practices, SEO, and transfer
  budgets pass; mobile Performance medians are 98/98/98/98, so the exact-100 mobile gate remains
  open. Artifact `9164652577` is retained with digest
  `sha256:5d50de7f0d1747b84b33930e9b2d35285fa96cf700e1bfe3cbdbd38575c806a6`.
- Public inline scripts and styles receive the request-scoped CSP nonce from the proxy. The public
  locale and how-it-works pages remain dynamic to preserve nonce correctness across clean builds; no
  `unsafe-inline` script policy or build-ID hash allowlist was introduced.

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
- The 2026-08-12 read-only source-policy recheck confirmed BMW robots/sitemap paths, Enaa robots and
  current terms at `/cms/63`, and Big Bang robots and current terms at `/pogoji-poslovanja/`. Stale
  terms paths were removed from the manifests. All three adapters remain conditional; this technical
  check does not replace owner/legal activation.
- Latest security-head CI run
  [`31645543065`](https://github.com/evgenursic/optimalen_nakup/actions/runs/31645543065) passes
  quality/build, dependency audit, 18 public Playwright scenarios, containers, and CodeQL
  (`31645543098`). Desktop Lighthouse remains 100 in every category; mobile medians are 97, 98, 98,
  and 98, so the strict mobile Performance 100 gate remains open.
- Official OpenAI documentation was reviewed for the Responses API and the configured
  `gpt-5.6-luna`, `gpt-5.6-terra`, and `gpt-5.6-sol` routing. Live API calls remain unverified until
  a project key and budget are configured.
- OpenAI model-cost accounting now uses the public standard short-context rates effective
  2026-07-30, with an explicit pricing version recorded on intake and worker cost events. The
  routing remains Luna for intake, Terra for extraction, and Sol for evidence-bound synthesis or
  disputes; deterministic arithmetic and scoring remain outside the model. Sol receives only the
  configurable top ranked synthesis candidates (default 10, bounded 1-20); all lower-ranked evidence
  remains persisted and visible in the result set.
- GitHub Actions quality, Playwright, dependency audit, and CodeQL workflows are present with action
  revisions pinned to commit SHAs.
- A clean Ubuntu RSC below-fold streaming experiment (`83d4cae`) passed build, container, CodeQL,
  and all 18 public E2E scenarios but did not improve mobile Lighthouse and reduced desktop `/sl`
  stability; it was reverted in `4fc6058`. The strict mobile Performance 100 gate remains open.
- Stable-head CI run
  [`31648571304`](https://github.com/evgenursic/optimalen_nakup/actions/runs/31648571304) passes
  quality/build, Playwright, containers, and CodeQL (`31648571336`). Desktop Lighthouse is 100 in
  every category; mobile Performance medians are 98/98/98/99, so the strict mobile gate is still
  open. Artifact `9161880420` is retained with digest
  `sha256:6521cd64f416bd909c8e265e3537f16970a8eff9d865563c1f99b2e9a5d61891`.
- The hero-rendering optimization in `f96adb9` replaces the first-viewport blur filter with a radial
  gradient. CI run
  [`31649694061`](https://github.com/evgenursic/optimalen_nakup/actions/runs/31649694061) passes
  quality/build, Playwright, containers, and CodeQL (`31649694038`); desktop Lighthouse is 100 in
  every category and mobile medians are 98/98/98/98. The strict mobile gate remains open.
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
- The generated Tailwind palette is limited to the semantic colors used by the application; the
  standalone critical stylesheet dropped from 30,750 to 29,264 bytes without changing public E2E/axe
  behavior or the nonce CSP.
- Public Web Vitals collection no longer adds a React client boundary to the first navigation. When
  telemetry is configured, the privacy-bounded static collector loads after 30 seconds; service
  worker registration and nonce CSP remain in the initial document. Format, lint, typecheck, tests,
  production builds, 18 public E2E scenarios, containers, and CodeQL pass for commit `f72a2b0`.
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
  [`30689797354`](https://github.com/evgenursic/optimalen_nakup/actions/runs/30689797354) verifies
  current commit `9f6281c`: quality/build, all 18 public E2E scenarios, and container startup/health
  pass; CodeQL run
  [`30689797336`](https://github.com/evgenursic/optimalen_nakup/actions/runs/30689797336) is also
  green. The only red job remains the intentionally strict mobile Lighthouse Performance 100
  assertion; its 24 reports are preserved as artifact `8815338691`.
- Follow-up commit `45bbffc` keeps the strict nonce CSP while deferring the public Web Vitals client
  graph and removing experimental inline CSS. Run
  [`30686773465`](https://github.com/evgenursic/optimalen_nakup/actions/runs/30686773465) confirms
  quality/build, 18 public E2E scenarios, containers, and CodeQL; mobile Lighthouse remains 97–99
  and its 24-report artifact is `8814285810` (digest recorded in `PERFORMANCE.md`).
- Current-head performance commit `f72a2b0` is verified by run
  [`30692258676`](https://github.com/evgenursic/optimalen_nakup/actions/runs/30692258676):
  quality/build, 18 public E2E scenarios, containers, and CodeQL pass; desktop Lighthouse is 100 in
  every category, while the strict mobile Performance gate remains the only failure. Mobile medians
  are 99, 98, 98, and 99; artifact `8816145747` is retained for the current-head reports (digest
  `sha256:a2c1f28a1ebfa82cc2641d5d4e0fa27ee4e8fba7da7914d4167d70cbf9f6a473`).
- Latest current-head commit `da76b90` is verified by run
  [`31634319725`](https://github.com/evgenursic/optimalen_nakup/actions/runs/31634319725): quality,
  dependency audit, 18 public E2E scenarios, containers, and CodeQL pass; desktop Lighthouse is 100
  in every category. Mobile medians are 98, 97, 99, and 97; artifact `9156656165` is retained with
  digest `sha256:f08155be7ce667ab8f523d1271033838e0998b16fcb207f76e5429838dce400f`.
- A bounded `contain: layout paint` public-section experiment (`b56a308`) was validated by run
  [`31635807214`](https://github.com/evgenursic/optimalen_nakup/actions/runs/31635807214): quality,
  dependency audit, 18 public E2E scenarios, and containers pass, but mobile Performance remains
  variable at medians 98, 99, 97, and 97. It was reverted in `c2b3e47`; the strict 100 gate remains
  open and no Lighthouse 100 claim is made.
- A follow-up `content-visibility: auto` experiment (`be3dbe3`) was validated by run
  [`31639501917`](https://github.com/evgenursic/optimalen_nakup/actions/runs/31639501917): quality,
  dependency audit, 18 public E2E scenarios, containers, and desktop Lighthouse pass, but mobile
  Performance regressed to medians 96, 97, 96, and 99. It was reverted in `21fdbd3`; artifact
  `9158512173` is retained and the strict 100 gate remains open.
- The production build now uses Webpack (`1c41642`), reducing local initial script transfer from
  approximately 153 KB to 129 KB. Run
  [`31640940677`](https://github.com/evgenursic/optimalen_nakup/actions/runs/31640940677) verifies
  quality/build, audit, containers, 18 public E2E scenarios, and CodeQL; desktop Lighthouse is 100
  in every category and mobile Performance medians are 99 on all four routes. The strict 100 gate
  remains open, while the separate LCP containment follow-up (`3558660`) was reverted in `caf5b34`
  after run `31642081563` showed no consistent gain.
- Current documentation-head CI run
  [`31642878579`](https://github.com/evgenursic/optimalen_nakup/actions/runs/31642878579) repeats
  the Webpack build, dependency audit, 18 public E2E scenarios, containers, and CodeQL
  [`31642878569`](https://github.com/evgenursic/optimalen_nakup/actions/runs/31642878569). Desktop
  is 100 in every category; mobile medians are 99, 99, 97, and 98. Artifact `9159800457` is retained
  with digest `sha256:1510b8bccd68ac677862a6a59a1688320d99cefde2aa4019d0ca4b87b5ec289b`.
- The next completed documentation-head rerun
  [`31643808786`](https://github.com/evgenursic/optimalen_nakup/actions/runs/31643808786) also
  passes quality/build, dependency audit, containers, all 18 public E2E scenarios, and CodeQL.
  Desktop is 100 in every category; mobile medians are 99, 99, 99, and 97. Artifact `9160148063` is
  retained with digest `sha256:5d57747d44b1f95d3e37fa7b62c40ae443090de12d5a5e2e5a602127be63a566`.

## In progress

- Figma product design system and critical-screen parity validation. The owner explicitly approved
  Phase 1 on 2026-07-29. File
  [`Optimalen Nakup — Product Design System and Application`](https://www.figma.com/design/6WnVVNi9BYt1LI67ZyAzPi)
  now contains the Phase 1 foundations: 68 variables across four collections, 14 semantic aliases,
  six Inter text styles, and three effect styles. Validation found zero broken aliases, missing WEB
  code syntax entries, or ALL_SCOPES variables. The post-correction readback then hit the Figma
  Starter-plan MCP tool-call limit (`INVALID_ARGUMENT`), so the post-correction validation and Phase
  2 page skeleton remain open; the local state ledger records all created IDs and completed steps.
  No further Figma mutations are attempted until that external limit resets or the plan is upgraded.
- Real backup/restore rehearsal, authenticated production E2E, and the authenticated Lighthouse
  result.
- Mobile Lighthouse Performance 100 remains open; the latest clean Ubuntu medians are 98, 97, 99,
  and 97 across the four public routes while every other category and transfer budget passes.
- Legal/owner approval and then a bounded live smoke test for each conditional source adapter.

## Next action

Continue the externally blocked Figma work when its read/write endpoint recovers, starting with the
post-correction readback and then the approved Phase 2 page skeleton. Preserve the strict mobile
Lighthouse 100 gate; production credentials remain reserved for authenticated E2E, backup/restore,
and bounded live-source verification.
