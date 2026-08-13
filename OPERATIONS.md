# Operations

Updated: 2026-07-27

## Service objectives

- Public web health and worker health are continuously evaluated by Docker.
- Worker lease expiry, queue depth, completion rate, coverage, duration, page use, and model cost
  are visible in the tenant-safe administration surface.
- Source health records success, drift/failure reason, latency, consecutive failures, policy-review
  date, and circuit-breaker state.
- Alert dispatch distinguishes `sent`, `skipped`, and `failed`; an unconfigured email provider is
  never represented as delivery.
- LCP, INP, CLS, and TTFB are aggregated by normalized route, device class, and application version
  without direct identifiers.

Initial operational targets are 99.5% monthly public availability, a 24-hour recovery-point
objective after the first verified daily backup, and a four-hour recovery-time objective after a
successful clean-environment rehearsal. These are targets, not verified service levels.

## Health and restart behaviour

- Web: `GET /api/health`, no-store, returns process/version state without testing third-party
  credentials or leaking configuration.
- Worker: `GET /health`, healthy in production only when signed worker communication is configured.
- Caddy actively checks the web endpoint and Docker restarts unhealthy processes under
  `unless-stopped`.
- A release is accepted only after the external health endpoint succeeds and `web`, `worker`,
  `caddy`, `otel-collector`, `prometheus`, `loki`, and `grafana` are running.

A green liveness endpoint does not prove Clerk, Convex, billing, email, OpenAI, or source
functionality. Their exact smoke checks remain separate release evidence.

## Logging and observability

Application logs are structured JSON with service, version, worker, job, adapter, and correlation
identifiers where appropriate. Prompts, page bodies, access tokens, cookies, payment data,
passwords, webhook secrets, and direct contact details are excluded or redacted.

The observability profile:

- tails Docker JSON logs with the OpenTelemetry Collector;
- exports logs to Loki through OTLP;
- exposes collected metrics for Prometheus;
- scrapes Caddy and Collector metrics every 15 seconds; and
- provisions Loki and Prometheus data sources in non-anonymous Grafana bound to loopback.

Grafana should be reached through an SSH tunnel or a separately reviewed authenticated ingress. Do
not open ports 3002 or 9090 publicly.

## Backup

`ops/scripts/backup.sh` creates a full Convex export including file storage, stores only the
temporary ZIP locally, and sends it to an encrypted restic repository in configurable EU
S3-compatible storage. Default retention is 14 daily, 8 weekly, and 12 monthly snapshots. Every run
performs a bounded repository data check.

The systemd timer runs at 02:30 Europe/Ljubljana with a randomized delay and catches missed runs
after host downtime. First-run repository initialization requires the explicit
`RESTIC_AUTO_INIT=true` gate.

Monitor:

- `systemctl list-timers optimalen-nakup-backup.timer`;
- `journalctl -u optimalen-nakup-backup.service`;
- `restic snapshots --host optimalen-nakup-production --tag convex`; and
- age of the newest successful snapshot.

## Restore rehearsal

Run the backup image with `ops/scripts/restore-rehearsal.sh` in a clean, non-production environment.
The script restores the newest matching snapshot and verifies ZIP integrity. Import is disabled by
default; `ALLOW_RESTORE_IMPORT=true` additionally requires an explicit non-production
`RESTORE_TARGET_DEPLOYMENT` and refuses targets named `prod` or `production`.

A completed release rehearsal must prove:

1. a new backup can be read with credentials retrieved from the target secret store;
2. the ZIP passes integrity validation;
3. the import succeeds in an empty Convex test deployment;
4. tenant counts, representative evidence, and file objects match the recorded fixture; and
5. the observed RPO/RTO are written to `TEST_RESULTS.md`.

No restore rehearsal has been claimed without the external backup destination and test deployment.

## Incident handling

1. Use the admin kill switch for runaway collection and stop new worker claims.
2. Preserve partial job/evidence state and capture bounded service logs.
3. Disable only the affected source adapter when a source blocks access, changes policy, or returns
   CAPTCHA; do not bypass the control.
4. Rotate affected Clerk, Convex, OpenAI, billing, email, HMAC, registry, or backup credentials.
5. Reprocess signed webhooks only through idempotent event IDs.
6. Record impact, timeline, tenant scope, evidence integrity, containment, recovery, and follow-up
   actions in the audit trail.

For suspected tenant leakage, stop the affected path immediately, preserve authorization logs, and
treat the event as a security incident even if the exposed record appears low sensitivity.
