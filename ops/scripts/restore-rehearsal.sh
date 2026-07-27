#!/bin/sh
set -eu

umask 077

required_variables="
BACKUP_S3_ENDPOINT
BACKUP_S3_BUCKET
BACKUP_S3_REGION
BACKUP_S3_ACCESS_KEY_ID
BACKUP_S3_SECRET_ACCESS_KEY
RESTIC_PASSWORD
"

for variable_name in $required_variables; do
  eval "variable_value=\${$variable_name:-}"
  if [ -z "$variable_value" ]; then
    echo "Required environment variable is missing: $variable_name" >&2
    exit 1
  fi
done

export AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="$BACKUP_S3_REGION"
export RESTIC_REPOSITORY="s3:${BACKUP_S3_ENDPOINT%/}/$BACKUP_S3_BUCKET"

restore_root="$(mktemp -d)"
trap 'rm -rf "$restore_root"' EXIT INT TERM

restic restore latest \
  --host "${BACKUP_HOST_NAME:-optimalen-nakup-production}" \
  --tag convex \
  --target "$restore_root"

archive_path="$(find "$restore_root" -type f -name 'convex-*.zip' -print -quit)"
if [ -z "$archive_path" ]; then
  echo "No Convex ZIP archive was present in the restored snapshot." >&2
  exit 1
fi

unzip -t "$archive_path" >/dev/null

if [ "${ALLOW_RESTORE_IMPORT:-false}" = "true" ]; then
  if [ -z "${RESTORE_TARGET_DEPLOYMENT:-}" ]; then
    echo "RESTORE_TARGET_DEPLOYMENT is required when ALLOW_RESTORE_IMPORT=true." >&2
    exit 1
  fi
  case "$RESTORE_TARGET_DEPLOYMENT" in
    prod|production)
      echo "Restore rehearsal refuses a production target." >&2
      exit 1
      ;;
  esac
  pnpm exec convex import \
    --deployment "$RESTORE_TARGET_DEPLOYMENT" \
    --replace-all \
    --yes \
    "$archive_path"
fi

echo "Restore rehearsal completed: restic restore and ZIP integrity are valid."
