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

Saved searches additionally carry an email preference, bounded monitoring interval, and
last-scheduled timestamp. The hourly scheduler uses an idempotency bucket, plan entitlements, active
membership, and the confirmed filter before creating a new job. Completion creates channel-specific
alerts with a unique deduplication key; email becomes `sent` only after Resend returns a provider
message identifier.

User records carry deletion-request and deletion timestamps. Finalization suspends memberships,
deactivates monitoring, removes direct profile fields, and replaces the Clerk subject with a
non-reversible deleted-record marker while retaining audit referential integrity.
