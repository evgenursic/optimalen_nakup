# Requirements

## Product

Optimalen Nakup is an evidence-first subscription SaaS for researching purchasable offers. Version 1
launches in Slovenia in Slovenian and English with EUR pricing and supports vehicles, computers, and
white goods.

A successful research flow must:

1. interpret natural-language requirements into editable hard filters, preferences, and weights;
2. require confirmation before a costly research job;
3. inspect only approved sources within explicit page, time, and cost limits;
4. normalize and deduplicate offers while preserving evidence;
5. disclose verified, inferred, missing, stale, conflicting, and inaccessible data;
6. show realtime progress, numerical coverage, transparent scoring, and direct source links;
7. preserve useful partial results after failure or cancellation;
8. support saved searches, deduplicated in-app/email alerts, export, and administration.

## Commercial

- Plans: Starter, Pro, and Business; prices remain externally configurable.
- Billing: Lemon Squeezy Merchant of Record with monthly/annual variants and test mode.
- Affiliate and sponsored ranking: excluded from version 1.
- Closed beta remains functional when public prices or live billing credentials are absent.

## Quality gates

- WCAG 2.2 AA target with keyboard and screen-reader verification.
- Lighthouse target of 100 in Performance, Accessibility, Best Practices, and SEO on real production
  builds and representative routes.
- Tenant isolation, signed worker callbacks, SSRF protection, webhook replay protection, bounded
  crawling, and denial-of-wallet controls.
- No completion claim without a real permitted source and reproducible end-to-end evidence.
