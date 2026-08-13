# Deployment

Updated: 2026-07-27

## Production target

- Hostinger KVM 4: 4 vCPU, 16 GB RAM, 200 GB NVMe in an EU region
- Supported host: current Ubuntu LTS with Docker Engine and Compose v2
- Managed data plane: Convex; Clerk provides identity
- Core services: `web`, isolated `worker`, and Caddy
- Production observability profile: OpenTelemetry Collector, Prometheus, Loki, and Grafana
- No Redis or host-installed Node.js runtime

All application and third-party service images are immutable. Base and observability images carry
registry digests in `docker-compose.yml` or `ops/docker/Dockerfile`; application images are built by
SHA and resolved to GHCR digests before deployment.

## Environments

Development, staging, and production use separate Convex deployments, Clerk instances, billing
test/live modes, domains, secrets, source activations, and retention policies. Never point a staging
Clerk instance at a production Convex deployment.

The public URL and all `NEXT_PUBLIC_*` values are build-time inputs. A change to one of those values
requires a new immutable image, not an environment-only container restart.

## Host preparation

1. Create a non-password SSH deploy user with only the Docker and release-directory permissions it
   needs.
2. Pin the host key in the GitHub environment secret `SSH_KNOWN_HOSTS`; do not use
   `StrictHostKeyChecking=no`.
3. Create `/opt/optimalen-nakup/releases` and `/opt/optimalen-nakup/shared`.
4. Place production configuration in `/opt/optimalen-nakup/shared/.env`, owned by the deploy
   operator and mode `0600`.
5. Configure the firewall for SSH from trusted administration ranges plus public TCP 80/443 and
   UDP 443. Prometheus and Grafana bind only to loopback.
6. Install the backup service and timer from `ops/systemd`, then run `systemctl daemon-reload` and
   enable `optimalen-nakup-backup.timer`.

The shared environment file must replace every placeholder relevant to the enabled services. In
particular, production requires `APP_DOMAIN`, `ACME_EMAIL`, `HEALTHCHECK_URL`,
`GRAFANA_ADMIN_PASSWORD`, GHCR read credentials, Convex/Clerk secrets, the worker HMAC secret, and
backup credentials. The file is never uploaded as an artifact or committed.

## GitHub configuration

The image workflow publishes `web`, `worker`, and `backup` only from `main`, tags each image with
the full Git commit SHA, and records its registry digest. Configure repository variables for the
build-time public URL, Clerk publishable key, Convex URL, and default locale.

Create protected `staging` and `production` GitHub environments with:

- `DEPLOY_ROOT`, `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `SSH_PRIVATE_KEY`, and `SSH_KNOWN_HOSTS`;
- an approval rule for production; and
- only the environment-specific values used by authenticated production validation.

## Release procedure

1. Merge a green, reviewed commit to `main`.
2. Wait for all three SHA-tagged GHCR images to publish successfully.
3. Dispatch **Deploy immutable release** with the exact 40-character commit SHA and target
   environment.
4. The workflow checks out that SHA, resolves every application image to a registry digest, uploads
   only the Compose/ops release bundle, and invokes `ops/scripts/deploy.sh`.
5. The host pulls digest-pinned images and starts the core plus observability services.
6. The script polls the external `/api/health` URL, verifies every required container is running,
   and only then moves the `current` symlink.

On startup or health failure, the script restarts the previous release bundle and restores the
previous `current` target. A first deployment has no automatic predecessor, so it must be exercised
in staging before production.

## Manual rollback

Use the normal deployment workflow with a previously published, known-good main-branch SHA. This
retains the same validation and audit trail as a forward release. Emergency host-side rollback may
run the old release's digest-pinned `.images.env` and Compose bundle, but must be followed by an
incident record and GitHub deployment to reconcile state.

Never roll back Convex schema/data blindly. Apply forward-compatible schema changes and rehearse any
data migration separately.

## Current external blockers

The VPS, domain, DNS, production service accounts, production secrets, and approved live source
policies do not yet exist. The repository therefore contains a deployable procedure and safe
placeholders, but no claim of a public deployment or completed disaster-recovery rehearsal.
