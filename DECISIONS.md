# Decisions

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
