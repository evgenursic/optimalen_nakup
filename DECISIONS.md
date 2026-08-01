# Decisions

## 2026-08-01

- Keep the three-stage GPT-5.6 route: Luna for high-volume intake/routing, Terra for ambiguous
  extraction and normalisation, and Sol for evidence-bound final synthesis or disputes. Do not use a
  single flagship model for deterministic parsing, scoring, arithmetic, or aggregation.
- Pin model-cost accounting to the official standard short-context API pricing effective 2026-07-30
  and record `openai-api-pricing-2026-07-30` with every intake/worker cost event. Recheck this
  version before production activation rather than treating a historical price snapshot as live.

## 2026-07-26

- Product name: Optimalen Nakup.
- Launch: Slovenia first; Slovenian and English; EUR.
- Initial verticals: vehicles, computers, and white goods.
- Backend: managed Convex; long-running collection in a separate worker.
- Authentication: Clerk identities with Convex-managed organizations and roles.
- Billing: Lemon Squeezy Merchant of Record; no affiliate revenue in version 1.
- Infrastructure: Docker Compose on Hostinger KVM 4; no Redis.
- Source policy: adapters are disabled unless their current policy status is approved.
- Design source of truth: versioned repository tokens mirrored into Figma and CSS.
- Theme: accessible light theme in version 1; semantic tokens remain dark-theme-ready.
- Hosting: no second Sites production runtime.
- License: all rights reserved pending qualified review.

## 2026-07-29

- Public pages retain per-request nonce CSP and dynamic rendering. Next.js requires dynamic
  rendering to apply a fresh nonce to framework and inline scripts; weakening the script policy or
  silently serving a static page without matching nonces is not an acceptable Lighthouse shortcut.
- Turbopack remains the production bundler. A no-source-change local Webpack comparison produced
  materially lower mobile Performance scores (89-96 versus the clean-Ubuntu Turbopack range of
  97-99), so the alternative was rejected and no code change was kept.
- Web Vitals device segmentation is derived server-side as `mobile`, `tablet`, `desktop`, or
  `unknown`. Raw User-Agent values are not retained; existing rows remain valid through an optional
  schema field while all new writes require a validated class.
- PWA support uses a nonce-authorized inline registration and a bounded static-only service worker.
  It intentionally provides no navigation or data cache, preventing private or stale research
  results from becoming offline cache entries.
