# Performance

Updated: 2026-07-27

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

The 2026-07-27 candidate used the standalone Next.js production server and Playwright Chromium,
three runs per route, with the median reported. Mobile uses a 412 × 823 viewport, 2.625 device scale
factor, Lighthouse simulated throttling, and the normal mobile form factor. Desktop uses the
Lighthouse desktop preset. No Clerk, Convex, or production secret was configured for this public
credential-free run.

## Mobile median

| Route              | Perf. | A11y | Best | SEO | FCP    | LCP      | TBT    | CLS | TTFB  | JS bytes | CSS bytes |
| ------------------ | ----: | ---: | ---: | --: | ------ | -------- | ------ | --: | ----- | -------: | --------: |
| `/sl`              |    92 |  100 |  100 | 100 | 814 ms | 2,470 ms | 278 ms |   0 | 28 ms |  158,047 |     7,840 |
| `/sl/pricing`      |    91 |  100 |  100 | 100 | 810 ms | 2,436 ms | 299 ms |   0 | 27 ms |  159,673 |     7,840 |
| `/sl/how-it-works` |    97 |  100 |  100 | 100 | 810 ms | 2,380 ms | 140 ms |   0 | 54 ms |  158,047 |     7,840 |
| `/sl/sign-in`      |    87 |  100 |  100 | 100 | 821 ms | 2,619 ms | 389 ms |   0 | 29 ms |  159,520 |     7,840 |

All transfer budgets, accessibility, Best Practices, SEO, and CLS gates pass. The exact Performance
100 release gate fails on all four mobile routes. The main local constraints are simulated-CPU total
blocking time and LCP render delay; they must be retested on the clean Linux runner before further
route-level optimization is chosen.

## Desktop median

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
Ubuntu workflow stores reports as artifacts even when the strict mobile assertion fails. No
Lighthouse 100 claim is made for the release until mobile, desktop, and the authenticated results
route all pass from stored production-build reports.
