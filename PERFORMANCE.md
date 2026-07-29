# Performance

Updated: 2026-07-29

## Budgets

- Public-route compressed initial JavaScript: at most 170 KiB (174,080 bytes)
- Critical CSS: at most 50 KiB (51,200 bytes)
- LCP: below 2.5 s; internal public-route target below 2.0 s
- INP: below 200 ms
- CLS: below 0.1; internal public-route target below 0.05
- TTFB: below 800 ms where the deployment permits

The Lighthouse configs assert both category scores and transfer-size budgets. A category score
cannot hide a budget overrun.

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
[`30459547228`](https://github.com/evgenursic/optimalen_nakup/actions/runs/30459547228), measured
commit `b2cff1e`. Quality/build, 16 public E2E scenarios, containers, and CodeQL pass; only the
mobile Performance 100 assertion remains red. Artifact
[`8727262935`](https://github.com/evgenursic/optimalen_nakup/actions/runs/30459547228/artifacts/8727262935)
contains all 24 reports with ZIP SHA-256
`ae9d8b949d07bac7be6100f42adda708d8730283b60f2e988607e718fc9bfeea`.

### Latest baseline mobile median on Ubuntu

| Route              | Perf. | A11y | Best | SEO | FCP    | LCP      | TBT   | CLS | TTFB  | JS bytes | CSS bytes |
| ------------------ | ----: | ---: | ---: | --: | ------ | -------- | ----- | --: | ----- | -------: | --------: |
| `/sl`              |    98 |  100 |  100 | 100 | 773 ms | 2,250 ms | 69 ms |   0 | 20 ms |  158,164 |     7,841 |
| `/sl/pricing`      |    99 |  100 |  100 | 100 | 774 ms | 1,737 ms | 73 ms |   0 | 15 ms |  159,791 |     7,841 |
| `/sl/how-it-works` |    99 |  100 |  100 | 100 | 771 ms | 1,587 ms | 71 ms |   0 | 14 ms |  158,164 |     7,841 |
| `/sl/sign-in`      |    99 |  100 |  100 | 100 | 770 ms | 2,231 ms | 43 ms |   0 | 10 ms |  159,638 |     7,841 |

The exact mobile Performance 100 assertion remains open. Every other mobile category and both
transfer budgets pass. One retained Pricing trace scored 88 after an isolated 480 ms unattributed
main-thread task; the route median was 99 and the outlier was not removed from the artifact. The
remaining simulated score is dominated by the Next/React framework execution task and text LCP
render-delay model. Static rendering, inline CSS, `content-visibility`, and a preloaded image
candidate were each measured locally and rejected because they weakened the nonce CSP/Best Practices
result or made the performance trace worse.

### Latest baseline desktop median on Ubuntu

| Route              | Perf. | A11y | Best | SEO | FCP    | LCP    | TBT  | CLS | TTFB  | JS bytes | CSS bytes |
| ------------------ | ----: | ---: | ---: | --: | ------ | ------ | ---- | --: | ----- | -------: | --------: |
| `/sl`              |   100 |  100 |  100 | 100 | 217 ms | 503 ms | 0 ms |   0 | 12 ms |  158,164 |     7,841 |
| `/sl/pricing`      |   100 |  100 |  100 | 100 | 224 ms | 546 ms | 0 ms |   0 | 12 ms |  159,791 |     7,841 |
| `/sl/how-it-works` |   100 |  100 |  100 | 100 | 216 ms | 491 ms | 0 ms |   0 | 11 ms |  158,164 |     7,841 |
| `/sl/sign-in`      |   100 |  100 |  100 | 100 | 220 ms | 527 ms | 0 ms |   0 | 10 ms |  159,638 |     7,841 |

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
