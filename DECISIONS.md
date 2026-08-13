# Decisions

## 2026-08-01

- Keep the three-stage GPT-5.6 route: Luna for high-volume intake/routing, Terra for ambiguous
  extraction and normalisation, and Sol for evidence-bound final synthesis or disputes. Do not use a
  single flagship model for deterministic parsing, scoring, arithmetic, or aggregation.
- Keep all ranked offers in Convex, but send only the configurable top synthesis candidates to Sol
  (default 10, bounded 1–20), matching the deterministic recommendation set and reducing redundant
  context, latency, and model cost without hiding lower-ranked evidence.
- Pin model-cost accounting to the official standard short-context API pricing effective 2026-07-30
  and record `openai-api-pricing-2026-07-30` with every intake/worker cost event. Recheck this
  version before production activation rather than treating a historical price snapshot as live.
- Defer the public Web Vitals client graph until after the first 30 seconds of navigation and use
  inline SVG paths for public-only icons. Remove experimental inline CSS after clean Ubuntu evidence
  showed no mobile score improvement. Do not trade away per-request nonce CSP or hydration/PWA
  behavior for a synthetic Lighthouse shortcut.

## 2026-08-12

- Use the Webpack production bundler via `next build --webpack`. The clean Ubuntu run `31640940677`
  confirmed quality/build, containers, 18 public E2E scenarios, and CodeQL while reducing local
  initial script transfer from approximately 153 KB to 129 KB. Turbopack remains available for local
  development only.
- Do not retain layout, `content-visibility`, or narrow LCP containment experiments without a
  reproducible gain. Runs `31635807214`, `31639501917`, and `31642081563` showed variable or
  regressed mobile Performance, so those changes were reverted while the strict 100 gate stays open.

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
- The production bundler decision is recorded above: Webpack is used for production, while Turbopack
  remains available for local development.
- Web Vitals device segmentation is derived server-side as `mobile`, `tablet`, `desktop`, or
  `unknown`. Raw User-Agent values are not retained; existing rows remain valid through an optional
  schema field while all new writes require a validated class.
- PWA support uses a nonce-authorized inline registration and a bounded static-only service worker.
  It intentionally provides no navigation or data cache, preventing private or stale research
  results from becoming offline cache entries.
