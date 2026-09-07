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
register_path=""
manifest_path=""
temporary_archive=""
temporary_register=""
temporary_manifest=""
archive_owned="false"
register_owned="false"
manifest_owned="false"

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
  for cleanup_path in \
    "${temporary_archive}" \
    "${temporary_register}" \
    "${temporary_manifest}"; do
    if [[ -n "${cleanup_path}" && -e "${cleanup_path}" ]]; then
      rm -f -- "${cleanup_path}"
    fi
  done
  if [[ "${archive_owned}" == "true" && -e "${archive_path}" ]]; then
    rm -f -- "${archive_path}"
  fi
  if [[ "${register_owned}" == "true" && -e "${register_path}" ]]; then
    rm -f -- "${register_path}"
  fi
  if [[ "${manifest_owned}" == "true" && -e "${manifest_path}" ]]; then
    rm -f -- "${manifest_path}"
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
    bundle_stem="${backup_root}/production-auto-${timestamp}"
    archive_path="${bundle_stem}.dump"
    register_path="${bundle_stem}.account-deletion-register.json"
    manifest_path="${bundle_stem}.recovery-manifest.json"
    "${backup_tool}" backup \
      "${archive_path}" \
      "${register_path}" \
      "${manifest_path}"
    archive_owned="true"
    register_owned="true"
    manifest_owned="true"
    restic_command backup \
      --host "${snapshot_host}" \
      --tag production \
      --tag automated \
      --tag postgresql \
      --tag deletion-register \
      --tag recovery-point \
      "${archive_path}" \
      "${register_path}" \
      "${manifest_path}"
    printf 'automated_backup=passed\n'
    printf 'recovery_point_files=3\n'
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
      --tag production,automated,postgresql,deletion-register,recovery-point \
      --json)"
    latest_snapshot='sort_by(.time) | last'
    snapshot_id="$(jq --exit-status --raw-output "${latest_snapshot} | .id // empty" <<<"${snapshot_json}")" || \
      fail "A latest production recovery-point snapshot is required." 66
    snapshot_time="$(jq --exit-status --raw-output "${latest_snapshot} | .time // empty" <<<"${snapshot_json}")" || \
      fail "The latest recovery-point snapshot time is required." 66
    snapshot_paths="$(jq --exit-status --compact-output "${latest_snapshot} | .paths" <<<"${snapshot_json}")" || \
      fail "The latest recovery-point paths are required." 66
    if [[ "$(jq --raw-output 'length' <<<"${snapshot_paths}")" -ne 3 ]]; then
      fail "The latest production recovery point must contain exactly three files." 66
    fi
    archive_snapshot_path="$(jq --exit-status --raw-output \
      '[.[] | select(test("^/var/backups/goodgood-production/production-auto-[0-9]{8}T[0-9]{6}Z\\.dump$"))] | if length == 1 then .[0] else empty end' \
      <<<"${snapshot_paths}")" || fail "The recovery point must contain one database archive." 66
    register_snapshot_path="$(jq --exit-status --raw-output \
      '[.[] | select(test("^/var/backups/goodgood-production/production-auto-[0-9]{8}T[0-9]{6}Z\\.account-deletion-register\\.json$"))] | if length == 1 then .[0] else empty end' \
      <<<"${snapshot_paths}")" || fail "The recovery point must contain one deletion register." 66
    manifest_snapshot_path="$(jq --exit-status --raw-output \
      '[.[] | select(test("^/var/backups/goodgood-production/production-auto-[0-9]{8}T[0-9]{6}Z\\.recovery-manifest\\.json$"))] | if length == 1 then .[0] else empty end' \
      <<<"${snapshot_paths}")" || fail "The recovery point must contain one recovery manifest." 66
    if [[ ! "${snapshot_id}" =~ ^[a-f0-9]{64}$ ]]; then
      fail "The latest recovery-point snapshot identity is malformed." 66
    fi
    bundle_stem="${archive_snapshot_path%.dump}"
    [[ "${register_snapshot_path}" == "${bundle_stem}.account-deletion-register.json" && \
      "${manifest_snapshot_path}" == "${bundle_stem}.recovery-manifest.json" ]] || \
      fail "The recovery-point files do not share one exact stem." 66
    snapshot_epoch="$(date --date "${snapshot_time}" +%s)" || \
      fail "The latest recovery-point snapshot time is malformed." 66
    now_epoch="$(date --utc +%s)"
    snapshot_age_seconds=$((now_epoch - snapshot_epoch))
    if [[ "${snapshot_age_seconds}" -lt 0 || "${snapshot_age_seconds}" -gt 3600 ]]; then
      fail "The latest production recovery point is older than the one-hour RPO." 70
    fi

    archive_path="${archive_snapshot_path}"
    register_path="${register_snapshot_path}"
    manifest_path="${manifest_snapshot_path}"
    for output_path in "${archive_path}" "${register_path}" "${manifest_path}"; do
      if [[ -e "${output_path}" || -L "${output_path}" ]]; then
        fail "A recovery-point extraction target already exists; refusing to overwrite it."
      fi
    done

    extract_recovery_file() {
      local snapshot_path="$1"
      local destination_path="$2"
      local temporary_variable="$3"
      local owned_variable="$4"
      local temporary_path
      temporary_path="$(mktemp "${backup_root}/.production-offhost-drill.partial.XXXXXX")"
      printf -v "${temporary_variable}" '%s' "${temporary_path}"
      chown root:root "${temporary_path}"
      chmod 0600 "${temporary_path}"
      restic_command dump "${snapshot_id}" "${snapshot_path}" >"${temporary_path}"
      [[ -s "${temporary_path}" ]] || fail "Restic produced an empty recovery-point file." 70
      mv "${temporary_path}" "${destination_path}"
      printf -v "${temporary_variable}" '%s' ""
      printf -v "${owned_variable}" '%s' "true"
      chown root:root "${destination_path}"
      chmod 0600 "${destination_path}"
    }
    extract_recovery_file "${archive_snapshot_path}" "${archive_path}" temporary_archive archive_owned
    extract_recovery_file "${register_snapshot_path}" "${register_path}" temporary_register register_owned
    extract_recovery_file "${manifest_snapshot_path}" "${manifest_path}" temporary_manifest manifest_owned
    "${backup_tool}" restore-drill \
      "${archive_path}" \
      "${register_path}" \
      "${manifest_path}"
    printf 'off_host_restore_drill=passed\n'
    printf 'snapshot=%s\n' "${snapshot_id}"
    printf 'snapshot_age_seconds=%s\n' "${snapshot_age_seconds}"
    ;;
esac
