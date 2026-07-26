# Performance

## Budgets

- Public-route compressed initial JavaScript: at most 170 KB
- Critical CSS: at most 50 KB
- LCP: below 2.5 s; internal public-route target below 2.0 s
- INP: below 200 ms
- CLS: below 0.1; internal public-route target below 0.05
- TTFB: below 800 ms where the deployment permits

## Lighthouse protocol

Production builds only, mobile and desktop profiles, three runs per critical route, median reported.
Target routes are landing, pricing, product explanation, sign-in, and a reproducible authenticated
results route.

No Lighthouse score has been measured or claimed yet.
