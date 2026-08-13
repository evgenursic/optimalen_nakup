#!/bin/sh
set -eu

umask 077

required_variables="
BACKUP_S3_ENDPOINT
BACKUP_S3_BUCKET
BACKUP_S3_REGION
BACKUP_S3_ACCESS_KEY_ID
BACKUP_S3_SECRET_ACCESS_KEY
CONVEX_DEPLOY_KEY
RESTIC_PASSWORD
"

for variable_name in $required_variables; do
  eval "variable_value=\${$variable_name:-}"
  if [ -z "$variable_value" ]; then
    echo "Required environment variable is missing: $variable_name" >&2
    exit 1
  fi
done

backup_output_dir="${BACKUP_OUTPUT_DIR:-/backups}"
mkdir -p "$backup_output_dir"
work_dir="$(mktemp -d "$backup_output_dir/convex-export.XXXXXX")"
trap 'rm -rf "$work_dir"' EXIT INT TERM

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive_path="$work_dir/convex-$timestamp.zip"

if [ -n "${CONVEX_DEPLOYMENT:-}" ]; then
  pnpm exec convex export \
    --deployment "$CONVEX_DEPLOYMENT" \
    --include-file-storage \
    --path "$archive_path"
else
  pnpm exec convex export --prod --include-file-storage --path "$archive_path"
fi

export AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="$BACKUP_S3_REGION"
export RESTIC_REPOSITORY="s3:${BACKUP_S3_ENDPOINT%/}/$BACKUP_S3_BUCKET"

if ! restic snapshots >/dev/null 2>&1; then
  if [ "${RESTIC_AUTO_INIT:-false}" != "true" ]; then
    echo "Restic repository is not initialized; set RESTIC_AUTO_INIT=true for the first run." >&2
    exit 1
  fi
  restic init
fi

restic backup "$archive_path" \
  --host "${BACKUP_HOST_NAME:-optimalen-nakup-production}" \
  --tag convex \
  --tag daily

restic forget \
  --host "${BACKUP_HOST_NAME:-optimalen-nakup-production}" \
  --tag convex \
  --keep-daily "${BACKUP_KEEP_DAILY:-14}" \
  --keep-weekly "${BACKUP_KEEP_WEEKLY:-8}" \
  --keep-monthly "${BACKUP_KEEP_MONTHLY:-12}" \
  --prune

restic check --read-data-subset="${BACKUP_CHECK_SUBSET:-1/50}"
echo "Encrypted Convex backup completed at $timestamp."
