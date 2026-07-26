# Data model

Tenant-owned tables include `organizationId` in indexes used by their access paths.

## Identity and tenancy

`users`, `organizations`, `memberships`, `invitations`, `auditEvents`.

## Research

`researchRequests`, `filterSpecs`, `jobs`, `jobEvents`, `offers`, `offerVersions`,
`offerAttributes`, `evidence`, `recommendationSets`, `scoreComponents`.

## Sources and operations

`sources`, `sourceHealth`, `workerNonces`, `modelUsage`, `usageLedger`, `adminConfig`, `webVitals`.

## Monitoring and commercial

`savedSearches`, `alertRules`, `alerts`, `alertDeliveries`, `subscriptions`, `entitlements`,
`billingWebhookEvents`, `waitlistEntries`.

High-volume event and result queries are paginated. Documents contain only bounded structured data
and short excerpts. Large generated exports use Convex file storage and store storage IDs, not
expiring URLs.
