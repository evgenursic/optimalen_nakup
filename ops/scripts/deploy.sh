#!/bin/sh
set -eu

umask 077

release_sha="${1:-}"
web_image="${2:-}"
worker_image="${3:-}"
backup_image="${4:-}"
deploy_root="${DEPLOY_ROOT:-/opt/optimalen-nakup}"
secrets_file="${DEPLOY_ENV_FILE:-$deploy_root/shared/.env}"

read_env_value() {
  variable_name="$1"
  sed -n "s/^${variable_name}=//p" "$secrets_file" | tail -n 1 | tr -d '\r'
}

if [ "${#release_sha}" -ne 40 ]; then
  echo "Release SHA must contain exactly 40 hexadecimal characters." >&2
  exit 1
fi
case "$release_sha" in
  *[!0-9a-f]*)
    echo "Release SHA must be lowercase hexadecimal." >&2
    exit 1
    ;;
esac

for image_reference in "$web_image" "$worker_image" "$backup_image"; do
  case "$image_reference" in
    ghcr.io/*@sha256:*)
      ;;
    *)
      echo "Every release image must be a GHCR reference pinned by sha256 digest." >&2
      exit 1
      ;;
  esac
  image_digest="${image_reference##*@sha256:}"
  if [ "${#image_digest}" -ne 64 ]; then
    echo "Image digest must contain exactly 64 hexadecimal characters." >&2
    exit 1
  fi
  case "$image_digest" in
    *[!0-9a-f]*)
      echo "Image digest must be lowercase hexadecimal." >&2
      exit 1
      ;;
  esac
done

candidate="$deploy_root/releases/$release_sha"
current_link="$deploy_root/current"
previous=""
if [ -L "$current_link" ]; then
  previous="$(readlink -f "$current_link")"
fi

if [ ! -f "$candidate/docker-compose.yml" ] || [ ! -f "$candidate/ops/caddy/Caddyfile" ]; then
  echo "Release bundle is incomplete: $candidate" >&2
  exit 1
fi
if [ ! -f "$secrets_file" ]; then
  echo "Production environment file is missing: $secrets_file" >&2
  exit 1
fi

app_domain="$(read_env_value APP_DOMAIN)"
acme_email="$(read_env_value ACME_EMAIL)"
grafana_admin_password="$(read_env_value GRAFANA_ADMIN_PASSWORD)"
healthcheck_url="${HEALTHCHECK_URL:-$(read_env_value HEALTHCHECK_URL)}"
case "$app_domain" in
  ""|http://localhost|https://localhost|*.invalid)
    echo "APP_DOMAIN must be the reviewed deployment hostname." >&2
    exit 1
    ;;
esac
case "$acme_email" in
  *@*.*)
    ;;
  *)
    echo "ACME_EMAIL must be configured for certificate operations." >&2
    exit 1
    ;;
esac
if [ "${#grafana_admin_password}" -lt 16 ]; then
  echo "GRAFANA_ADMIN_PASSWORD must contain at least 16 characters." >&2
  exit 1
fi
case "$healthcheck_url" in
  https://*/api/health)
    ;;
  *)
    echo "HEALTHCHECK_URL must be the deployed HTTPS /api/health endpoint." >&2
    exit 1
    ;;
esac

cat >"$candidate/.images.env" <<EOF
APP_VERSION=$release_sha
BACKUP_IMAGE=$backup_image
DEPLOY_ENV_FILE=$secrets_file
WEB_IMAGE=$web_image
WORKER_IMAGE=$worker_image
EOF

compose_candidate() {
  docker compose \
    --env-file "$secrets_file" \
    --env-file "$candidate/.images.env" \
    -f "$candidate/docker-compose.yml" \
    --profile observability \
    "$@"
}

rollback() {
  if [ -z "$previous" ] || [ ! -f "$previous/docker-compose.yml" ]; then
    echo "No previous release is available for automatic rollback." >&2
    return 1
  fi
  echo "Rolling back to $previous." >&2
  docker compose \
    --env-file "$secrets_file" \
    --env-file "$previous/.images.env" \
    -f "$previous/docker-compose.yml" \
    --profile observability \
    up --detach --no-build --remove-orphans \
    web worker caddy otel-collector prometheus loki grafana
  ln -sfn "$previous" "$current_link"
}

if [ -z "${GHCR_USERNAME:-}" ]; then
  GHCR_USERNAME="$(read_env_value GHCR_USERNAME)"
fi
if [ -z "${GHCR_TOKEN:-}" ]; then
  GHCR_TOKEN="$(read_env_value GHCR_TOKEN)"
fi
if [ -n "${GHCR_TOKEN:-}" ] && [ -n "${GHCR_USERNAME:-}" ]; then
  printf '%s' "$GHCR_TOKEN" | docker login ghcr.io --username "$GHCR_USERNAME" --password-stdin
fi

compose_candidate pull web worker caddy otel-collector prometheus loki grafana
if ! compose_candidate up --detach --no-build --remove-orphans \
  web worker caddy otel-collector prometheus loki grafana; then
  rollback || true
  exit 1
fi

healthy=false
attempt=1
while [ "$attempt" -le 24 ]; do
  if curl --fail --silent --show-error --max-time 10 "$healthcheck_url" >/dev/null; then
    healthy=true
    break
  fi
  attempt=$((attempt + 1))
  sleep 5
done

if [ "$healthy" != "true" ]; then
  compose_candidate ps >&2 || true
  compose_candidate logs --tail 200 web worker caddy >&2 || true
  rollback || true
  exit 1
fi

running_services="$(compose_candidate ps --status running --services)"
for service_name in web worker caddy otel-collector prometheus loki grafana; do
  if ! printf '%s\n' "$running_services" | grep -qx "$service_name"; then
    echo "Required service is not running: $service_name" >&2
    compose_candidate ps >&2 || true
    compose_candidate logs --tail 200 "$service_name" >&2 || true
    rollback || true
    exit 1
  fi
done

ln -sfn "$candidate" "$current_link"
echo "Release $release_sha is healthy and active."
