# Deployment

## Target

- Hostinger KVM 4: 4 vCPU, 16 GB RAM, 200 GB NVMe, EU region
- Ubuntu LTS, Docker Engine with Compose, Caddy, Convex managed backend
- Containers: web, worker, caddy; observability profile adds OpenTelemetry, Prometheus, Loki, and
  Grafana

## Environments

Development, staging, and production use separate Convex deployments, Clerk instances, billing
test/live modes, domains, secrets, and retention policies.

## Current external blockers

The VPS, domain, DNS, production service accounts, and production secrets do not yet exist.
Repository work, CI, images, configuration validation, and runbooks continue without them.

The final runbook will include first deployment, health verification, rollback, DNS/HTTPS, secret
rotation, backup, restore, and disaster-recovery exercises.
