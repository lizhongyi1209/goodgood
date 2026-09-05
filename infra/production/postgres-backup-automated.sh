#!/usr/bin/env bash
set -euo pipefail

readonly config_file="/etc/goodgood/production/postgres-backup.env"
readonly backup_root="/var/backups/goodgood-production"
readonly backup_tool="/usr/local/sbin/goodgood-production-postgres"
readonly lock_file="/run/lock/goodgood-production-postgres-backup.lock"
readonly expected_password_file="/etc/goodgood/production/secrets/backups/restic-password"
readonly expected_access_key_file="/etc/goodgood/production/secrets/backups/r2-access-key-id"
readonly expected_secret_key_file="/etc/goodgood/production/secrets/backups/r2-secret-access-key"
readonly snapshot_host="goodgood-production"

archive_path=""
temporary_archive=""

usage() {
  cat >&2 <<'EOF'
Usage:
  postgres-backup-automated.sh init
  postgres-backup-automated.sh run
  postgres-backup-automated.sh maintain
  postgres-backup-automated.sh check
  postgres-backup-automated.sh restore-latest-drill
EOF
  exit 64
}

fail() {
  printf '%s\n' "$1" >&2
  exit "${2:-78}"
}

cleanup() {
  if [[ -n "${temporary_archive}" && -e "${temporary_archive}" ]]; then
    rm -f -- "${temporary_archive}"
  fi
  if [[ -n "${archive_path}" && -e "${archive_path}" ]]; then
    rm -f -- "${archive_path}"
  fi
}
trap cleanup EXIT

if [[ "${EUID}" -ne 0 ]]; then
  fail "Run the automated PostgreSQL backup tool through sudo." 77
fi

action="${1:-}"
if [[ "$#" -ne 1 ]]; then
  usage
fi
case "${action}" in
  init | run | maintain | check | restore-latest-drill) ;;
  *) usage ;;
esac

for command_name in chmod chown date flock grep install jq mktemp mv restic rm stat wc; do
  command -v "${command_name}" >/dev/null 2>&1 || \
    fail "Required command ${command_name} is unavailable." 69
done
if [[ ! -x "${backup_tool}" ]]; then
  fail "The reviewed production PostgreSQL backup/restore tool is not installed." 69
fi

validate_root_secret_file() {
  local path="$1"
  local label="$2"
  if [[ ! -f "${path}" || -L "${path}" ]]; then
    fail "${label} must be a regular non-symbolic-link file."
  fi
  if [[ "$(stat --format '%u:%g:%a' "${path}")" != "0:0:600" ]]; then
    fail "${label} must be root:root mode 0600."
  fi
  [[ -s "${path}" ]] || fail "${label} must not be empty."
}

validate_root_secret_file "${config_file}" "The backup configuration"
allowed_config='^(#.*|[[:space:]]*|(RESTIC_REPOSITORY|RESTIC_PASSWORD_FILE|GOODGOOD_BACKUP_R2_ACCESS_KEY_ID_FILE|GOODGOOD_BACKUP_R2_SECRET_ACCESS_KEY_FILE)=[A-Za-z0-9_./:-]+)$'
if grep --invert-match --extended-regexp "${allowed_config}" "${config_file}" >/dev/null; then
  fail "The backup configuration contains an unsupported or unsafe entry."
fi
for config_name in \
  RESTIC_REPOSITORY \
  RESTIC_PASSWORD_FILE \
  GOODGOOD_BACKUP_R2_ACCESS_KEY_ID_FILE \
  GOODGOOD_BACKUP_R2_SECRET_ACCESS_KEY_FILE; do
  if [[ "$(grep --count "^${config_name}=" "${config_file}")" -ne 1 ]]; then
    fail "The backup configuration must define ${config_name} exactly once."
  fi
done
# The allowlist above rejects shell expansion and inline credentials.
# shellcheck disable=SC1090
source "${config_file}"

: "${RESTIC_REPOSITORY:?RESTIC_REPOSITORY is required}"
: "${RESTIC_PASSWORD_FILE:?RESTIC_PASSWORD_FILE is required}"
: "${GOODGOOD_BACKUP_R2_ACCESS_KEY_ID_FILE:?GOODGOOD_BACKUP_R2_ACCESS_KEY_ID_FILE is required}"
: "${GOODGOOD_BACKUP_R2_SECRET_ACCESS_KEY_FILE:?GOODGOOD_BACKUP_R2_SECRET_ACCESS_KEY_FILE is required}"

if [[ ! "${RESTIC_REPOSITORY}" =~ ^s3:https://[a-f0-9]{32}\.r2\.cloudflarestorage\.com/goodgood-postgres-backups/production$ ]]; then
  fail "RESTIC_REPOSITORY must use the isolated production prefix."
fi
if [[ "${RESTIC_PASSWORD_FILE}" != "${expected_password_file}" || \
  "${GOODGOOD_BACKUP_R2_ACCESS_KEY_ID_FILE}" != "${expected_access_key_file}" || \
  "${GOODGOOD_BACKUP_R2_SECRET_ACCESS_KEY_FILE}" != "${expected_secret_key_file}" ]]; then
  fail "Backup secret paths must match the reviewed production locations."
fi

validate_root_secret_file "${RESTIC_PASSWORD_FILE}" "The Restic password"
validate_root_secret_file "${GOODGOOD_BACKUP_R2_ACCESS_KEY_ID_FILE}" "The R2 access-key ID"
validate_root_secret_file "${GOODGOOD_BACKUP_R2_SECRET_ACCESS_KEY_FILE}" "The R2 secret-access key"
if [[ "$(wc -c <"${RESTIC_PASSWORD_FILE}")" -lt 33 ]]; then
  fail "The Restic password must contain at least 32 characters."
fi

AWS_ACCESS_KEY_ID="$(<"${GOODGOOD_BACKUP_R2_ACCESS_KEY_ID_FILE}")"
AWS_SECRET_ACCESS_KEY="$(<"${GOODGOOD_BACKUP_R2_SECRET_ACCESS_KEY_FILE}")"
if [[ ! "${AWS_ACCESS_KEY_ID}" =~ ^[A-Za-z0-9_-]{16,128}$ || \
  ! "${AWS_SECRET_ACCESS_KEY}" =~ ^[A-Za-z0-9_+/=-]{32,256}$ ]]; then
  fail "The R2 credential files are malformed."
fi

export RESTIC_REPOSITORY RESTIC_PASSWORD_FILE AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
export AWS_DEFAULT_REGION="auto"
export RESTIC_CACHE_DIR="/var/cache/goodgood-production-restic"

restic_command() {
  restic --option s3.bucket-lookup=path "$@"
}

install -o root -g root -m 0700 -d "${backup_root}" "${RESTIC_CACHE_DIR}"
umask 077
exec 9>"${lock_file}"
flock --nonblock 9 || fail "Another production backup operation is running." 75

case "${action}" in
  init)
    restic_command init
    printf 'backup_repository=initialized\n'
    ;;
  check)
    restic_command check --read-data
    printf 'backup_repository=verified\n'
    ;;
  run)
    timestamp="$(date --utc +%Y%m%dT%H%M%SZ)"
    archive_path="${backup_root}/production-auto-${timestamp}.dump"
    "${backup_tool}" backup "${archive_path}"
    restic_command backup \
      --host "${snapshot_host}" \
      --tag production \
      --tag automated \
      --tag postgresql \
      "${archive_path}"
    printf 'automated_backup=passed\n'
    ;;
  maintain)
    restic_command forget \
      --host "${snapshot_host}" \
      --tag production,automated,postgresql \
      --group-by host,tags \
      --keep-within 24h \
      --keep-daily 14 \
      --keep-weekly 8 \
      --keep-monthly 12 \
      --prune
    restic_command check --read-data
    printf 'retention=daily:14,weekly:8,monthly:12,within:24h\n'
    printf 'backup_repository=verified\n'
    ;;
  restore-latest-drill)
    snapshot_json="$(restic_command snapshots \
      --host "${snapshot_host}" \
      --tag production,automated,postgresql \
      --json)"
    latest_snapshot='sort_by(.time) | last'
    snapshot_id="$(jq --exit-status --raw-output "${latest_snapshot} | .id // empty" <<<"${snapshot_json}")" || \
      fail "A latest production PostgreSQL snapshot is required." 66
    snapshot_path="$(jq --exit-status --raw-output "${latest_snapshot} | if (.paths | length) == 1 then .paths[0] else empty end" <<<"${snapshot_json}")" || \
      fail "The latest production snapshot must contain one archive path." 66
    if [[ ! "${snapshot_id}" =~ ^[a-f0-9]{64}$ || \
      ! "${snapshot_path}" =~ ^/var/backups/goodgood-production/production-auto-[0-9]{8}T[0-9]{6}Z\.dump$ ]]; then
      fail "The latest snapshot identity or archive path is malformed." 66
    fi

    timestamp="$(date --utc +%Y%m%dT%H%M%SZ)"
    archive_path="${backup_root}/production-offhost-drill-${timestamp}.dump"
    if [[ -e "${archive_path}" || -L "${archive_path}" ]]; then
      fail "The restore-drill archive already exists; refusing to overwrite it."
    fi
    temporary_archive="$(mktemp "${backup_root}/.production-offhost-drill.partial.XXXXXX")"
    chown root:root "${temporary_archive}"
    chmod 0600 "${temporary_archive}"
    restic_command dump "${snapshot_id}" "${snapshot_path}" >"${temporary_archive}"
    [[ -s "${temporary_archive}" ]] || fail "Restic produced an empty archive." 70
    mv "${temporary_archive}" "${archive_path}"
    temporary_archive=""
    chown root:root "${archive_path}"
    chmod 0600 "${archive_path}"
    "${backup_tool}" restore-drill "${archive_path}"
    printf 'off_host_restore_drill=passed\n'
    printf 'snapshot=%s\n' "${snapshot_id}"
    ;;
esac
