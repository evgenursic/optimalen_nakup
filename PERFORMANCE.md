# Performance

Updated: 2026-08-12

## Budgets

- Public-route compressed initial JavaScript: at most 170 KiB (174,080 bytes)
- Critical CSS: at most 50 KiB (51,200 bytes)
- LCP: below 2.5 s; internal public-route target below 2.0 s
- INP: below 200 ms
- CLS: below 0.1; internal public-route target below 0.05
- TTFB: below 800 ms where the deployment permits

The Lighthouse configs assert both category scores and transfer-size budgets. A category score
cannot hide a budget overrun.

## Latest current-head evidence (da76b90)

GitHub Actions run
[`31634319725`](https://github.com/evgenursic/optimalen_nakup/actions/runs/31634319725) measured
commit `da76b90` on Ubuntu 24.04 with the same standalone production server. Quality/build,
dependency audit, 18 public Playwright scenarios, container startup/health, and CodeQL pass. Desktop
Lighthouse is 100 in all four categories on all three runs. Mobile Accessibility, Best Practices,
SEO, and transfer budgets pass; the strict mobile Performance 100 assertion remains the only failed
gate. Artifact
[`9156656165`](https://github.com/evgenursic/optimalen_nakup/actions/runs/31634319725/artifacts/9156656165)
contains the current-head HTML/JSON reports and has digest
`sha256:f08155be7ce667ab8f523d1271033838e0998b16fcb207f76e5429838dce400f`. The strict gate is
intentionally retained; no mobile Performance 100 release claim is made.

| Route              | Mobile Performance runs | Median | A11y | Best | SEO |
| ------------------ | ----------------------- | -----: | ---: | ---: | --: |
| `/sl`              | 99, 97, 98              |     98 |  100 |  100 | 100 |
| `/sl/pricing`      | 97, 97, 99              |     97 |  100 |  100 | 100 |
| `/sl/how-it-works` | 97, 99, 99              |     99 |  100 |  100 | 100 |
| `/sl/sign-in`      | 97, 97, 98              |     97 |  100 |  100 | 100 |

This current-head run confirms the residual issue is reproducible on clean Linux and is not a
desktop, accessibility, SEO, or transfer-budget regression. The inline generated stylesheet removes
the external render-blocking CSS request; its generator runs in the web prebuild/predev hooks. The
public Web Vitals client now loads only after the first 30 seconds when telemetry is configured;
service-worker registration and nonce CSP remain in the initial document. No Lighthouse 100 release
claim is made while this mobile gate remains open.

## Latest clean Ubuntu evidence (45bbffc)

GitHub Actions run
[`30686773465`](https://github.com/evgenursic/optimalen_nakup/actions/runs/30686773465) measured
commit `45bbffc` on Ubuntu 24.04 with the standalone production server. Quality/build, 18 public
Playwright scenarios, container startup/health, and CodeQL pass. Desktop Lighthouse is 100 in all
four categories. Mobile Accessibility, Best Practices, SEO, and both transfer budgets pass; the
strict Performance 100 assertion remains the only failed job. Artifact
[`8814285810`](https://github.com/evgenursic/optimalen_nakup/actions/runs/30686773465/artifacts/8814285810)
contains the 24 HTML/JSON reports and has ZIP SHA-256
`770c9b7fe7a2e6f96522b698a3fef42cf3b571f0597418b2b193447054ae89f1`.

The public client graph is now deferred outside the first 30 seconds of navigation, public-only
icons are inline SVG, and the experimental inline-CSS flag was removed after a clean A/B check. The
result reduced mobile script transfer from 158,164 to 154,911 bytes on the landing/how-it-works
routes (pricing 156,538; sign-in 156,385) while preserving nonce CSP and all E2E behavior. The
remaining score gap is the intermittent text LCP render-delay model, not a transfer-budget or
accessibility failure.

### Latest mobile median on Ubuntu (45bbffc)

| Route              | Perf. | A11y | Best | SEO | FCP    | LCP      | TBT    | CLS | JS bytes | CSS bytes |
| ------------------ | ----: | ---: | ---: | --: | ------ | -------- | ------ | --: | -------: | --------: |
| `/sl`              |    98 |  100 |  100 | 100 | 782 ms | 2,254 ms | 96 ms  |   0 |  154,911 |     7,841 |
| `/sl/pricing`      |    98 |  100 |  100 | 100 | 778 ms | 2,142 ms | 94 ms  |   0 |  156,538 |     7,841 |
| `/sl/how-it-works` |    99 |  100 |  100 | 100 | 779 ms | 1,632 ms | 120 ms |   0 |  154,911 |     7,841 |
| `/sl/sign-in`      |    99 |  100 |  100 | 100 | 776 ms | 1,984 ms | 71 ms  |   0 |  156,385 |     7,841 |

## Protocol

The 2026-07-27/28 candidate used the standalone Next.js production server and Playwright Chromium,
three runs per route, with the median reported. Mobile uses a 412 × 823 viewport, 2.625 device scale
factor, Lighthouse simulated throttling, and the normal mobile form factor. Desktop uses the
Lighthouse desktop preset. No Clerk, Convex, or production secret was configured for this public
credential-free run.

## Clean Ubuntu CI evidence

GitHub Actions run
[`30286774130`](https://github.com/evgenursic/optimalen_nakup/actions/runs/30286774130) measured
commit `0151047` from a clean Ubuntu 24.04 runner. Subsequent commits through `a1f65dc` adjust only
worker environment parsing and container CI verification; they do not change the web build. Artifact
[`8661421754`](https://github.com/evgenursic/optimalen_nakup/actions/runs/30286774130/artifacts/8661421754)
stores all 24 HTML/JSON reports for 30 days; its uploaded ZIP SHA-256 is
`62040565007ad77a6a91f93f3f2289487eb11206c2c318f8788cd3473c66004c`.

A second clean run,
[`30288575856`](https://github.com/evgenursic/optimalen_nakup/actions/runs/30288575856), stored the
same 24-report set as artifact
[`8662047870`](https://github.com/evgenursic/optimalen_nakup/actions/runs/30288575856/artifacts/8662047870)
with ZIP SHA-256 `adb9995e7d31584294fc1b4e2a794cb6f86b62168388d412763c99f4dd703137`. Desktop
remained 100 throughout; individual mobile scores remained 97-99 with unchanged transfer sizes. This
reproduces the strict mobile failure on clean Linux instead of attributing it only to the local
Windows environment.

The latest completed baseline,
[`30461698590`](https://github.com/evgenursic/optimalen_nakup/actions/runs/30461698590), measured
commit `b7b39fd`. Quality/build, 16 public E2E scenarios, containers, and CodeQL pass; only the
mobile Performance 100 assertion remains red. Artifact
[`8728119687`](https://github.com/evgenursic/optimalen_nakup/actions/runs/30461698590/artifacts/8728119687)
contains all 24 reports with ZIP SHA-256
`6c836961a5a5aabbcd1ef4d7620fe2a6b2c3fc8903bc2e2b10734190a7764498`.

### Latest baseline mobile median on Ubuntu

| Route              | Perf. | A11y | Best | SEO | FCP    | LCP      | TBT   | CLS | TTFB  | JS bytes | CSS bytes |
| ------------------ | ----: | ---: | ---: | --: | ------ | -------- | ----- | --: | ----- | -------: | --------: |
| `/sl`              |    98 |  100 |  100 | 100 | 777 ms | 2,285 ms | 93 ms |   0 | 20 ms |  158,164 |     7,841 |
| `/sl/pricing`      |    98 |  100 |  100 | 100 | 772 ms | 2,271 ms | 92 ms |   0 | 16 ms |  159,791 |     7,841 |
| `/sl/how-it-works` |    98 |  100 |  100 | 100 | 776 ms | 2,263 ms | 75 ms |   0 | 15 ms |  158,164 |     7,841 |
| `/sl/sign-in`      |    98 |  100 |  100 | 100 | 775 ms | 2,271 ms | 89 ms |   0 | 15 ms |  159,638 |     7,841 |

The exact mobile Performance 100 assertion remains open. Every other mobile category and both
transfer budgets pass. The remaining simulated score is dominated by the Next/React framework
execution task and text LCP render-delay model. Static rendering, inline CSS, `content-visibility`,
and a preloaded image candidate were each measured locally and rejected because they weakened the
nonce CSP/Best Practices result or made the performance trace worse.

### Latest baseline desktop median on Ubuntu

| Route              | Perf. | A11y | Best | SEO | FCP    | LCP    | TBT  | CLS | TTFB  | JS bytes | CSS bytes |
| ------------------ | ----: | ---: | ---: | --: | ------ | ------ | ---- | --: | ----- | -------: | --------: |
| `/sl`              |   100 |  100 |  100 | 100 | 227 ms | 518 ms | 0 ms |   0 | 16 ms |  158,164 |     7,841 |
| `/sl/pricing`      |   100 |  100 |  100 | 100 | 228 ms | 554 ms | 0 ms |   0 | 12 ms |  159,791 |     7,841 |
| `/sl/how-it-works` |   100 |  100 |  100 | 100 | 219 ms | 508 ms | 0 ms |   0 | 12 ms |  158,164 |     7,841 |
| `/sl/sign-in`      |   100 |  100 |  100 | 100 | 221 ms | 543 ms | 0 ms |   0 | 11 ms |  159,638 |     7,841 |

## Rejected no-source-change bundler comparison

On 2026-07-29 the same source was rebuilt locally with `next build --webpack` and measured on an
isolated production port with the existing three-run mobile protocol. Median Performance fell to
89-96, compared with the clean-Ubuntu Turbopack range of 97-99. The temporary `127.0.0.1` origin
also made that comparison unsuitable as SEO release evidence because canonical metadata targets
`localhost`. The experiment is retained only as a performance diagnostic: it did not improve the
controllable bottleneck, and no Webpack or CSP change was committed.

## Local mobile median

| Route              | Perf. | A11y | Best | SEO | FCP    | LCP      | TBT    | CLS | TTFB  | JS bytes | CSS bytes |
| ------------------ | ----: | ---: | ---: | --: | ------ | -------- | ------ | --: | ----- | -------: | --------: |
| `/sl`              |    92 |  100 |  100 | 100 | 814 ms | 2,470 ms | 278 ms |   0 | 28 ms |  158,047 |     7,840 |
| `/sl/pricing`      |    91 |  100 |  100 | 100 | 810 ms | 2,436 ms | 299 ms |   0 | 27 ms |  159,673 |     7,840 |
| `/sl/how-it-works` |    97 |  100 |  100 | 100 | 810 ms | 2,380 ms | 140 ms |   0 | 54 ms |  158,047 |     7,840 |
| `/sl/sign-in`      |    87 |  100 |  100 | 100 | 821 ms | 2,619 ms | 389 ms |   0 | 29 ms |  159,520 |     7,840 |

All transfer budgets, accessibility, Best Practices, SEO, and CLS gates pass. The exact Performance
100 release gate fails on all four mobile routes. The main local constraints are simulated-CPU total
blocking time and LCP render delay. Clean Ubuntu reruns now confirm the same residual pattern, so
this local table is retained only as historical diagnostic context rather than as the release
decision source.

## Local desktop median

| Route              | Perf. | A11y | Best | SEO | FCP    | LCP    | TBT   | CLS | TTFB  | JS bytes | CSS bytes |
| ------------------ | ----: | ---: | ---: | --: | ------ | ------ | ----- | --: | ----- | -------: | --------: |
| `/sl`              |   100 |  100 |  100 | 100 | 271 ms | 633 ms | 34 ms |   0 | 59 ms |  158,047 |     7,840 |
| `/sl/pricing`      |   100 |  100 |  100 | 100 | 260 ms | 616 ms | 0 ms  |   0 | 26 ms |  159,673 |     7,840 |
| `/sl/how-it-works` |   100 |  100 |  100 | 100 | 270 ms | 665 ms | 40 ms |   0 | 44 ms |  158,047 |     7,840 |
| `/sl/sign-in`      |   100 |  100 |  100 | 100 | 260 ms | 638 ms | 7 ms  |   0 | 31 ms |  159,520 |     7,840 |

The sign-in route initially transferred 260,634 script bytes because the full Clerk/Convex client
was eagerly referenced. A user-triggered, Suspense-backed lazy panel reduced the initial transfer to
159,520 bytes while retaining the secure Clerk form after activation.

## Interpretation

These are local lab measurements, not field Core Web Vitals. LCP, INP, CLS, and TTFB field targets
remain unverified until a real production origin has sufficient privacy-bounded traffic. The real
authenticated research-results path also remains pending a Clerk test identity, Convex deployment,
and completed owned research job.

The local HTML/JSON reports are ignored by Git and are not release evidence by themselves. The
Ubuntu public reports are stored, but the exact mobile assertion is still red. No Lighthouse 100
claim is made for the release until mobile, desktop, and the authenticated results route all pass
from stored production-build reports.
