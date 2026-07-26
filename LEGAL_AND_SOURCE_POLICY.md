# Legal and source policy

## Source approval

Every adapter has an owner, purpose, country/category scope, robots URL, terms URL, review date,
allowed paths, forbidden paths, rate policy, retention policy, and status: `approved`,
`conditional`, or `blocked`.

The 2026-07-26 technical review recorded these initial candidates:

- `bmw-si-used`: `https://odkrijuzitek.bmw.si/rabljeno/sitemap.xml` and public
  `/rabljeno/iskanje/podrobnosti/…` pages; `/rabljeno/api` is forbidden.
- `enaa-si`: `https://www.enaa.com/sitemap` department sitemap and public product pages; `/search`,
  `/api`, account, and cart paths are forbidden.
- `bigbang-si`: `https://www.bigbang.si/sitemap.xml` and public product pages; `/api`, admin, data,
  account, upload, and comparison paths are forbidden.

Robots and terms are rechecked before live activation and periodically afterward. Ambiguous or
conflicting permission blocks the adapter instead of triggering evasion.

All three manifests remain `conditional` by default and automatically require review again after
2026-08-25. Robots is a technical preference signal, not legal permission. Production activation
requires explicit owner/legal approval through `WORKER_APPROVED_SOURCE_IDS`; a CAPTCHA, HTTP 403 or
429 opens the source circuit and stops further requests. Default source concurrency is one with a
2.5-second minimum interval.

## Evidence storage

Store normalized claims, timestamps, hashes, source URLs, and the shortest useful excerpts. Do not
retain full copyrighted pages. Regression fixtures must be minimal and sanitized.

## Product statements

Coverage is exhaustive only within the explicitly confirmed scope and accessible approved sources.
Recommendations are informational, require user judgment, and never conceal commercial
relationships. Version 1 has no affiliate or sponsored ranking.

Privacy, terms, cookie, and disclosure templates require qualified legal review before launch.
