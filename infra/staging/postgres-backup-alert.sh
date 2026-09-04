#!/usr/bin/env bash
set -euo pipefail

readonly recipient_file="/etc/goodgood/staging/secrets/backups/alert-email"
readonly smtp_config_file="/etc/goodgood/staging/secrets/backups/msmtp.conf"

fail() {
  printf '%s\n' "$1" >&2
  exit "${2:-78}"
}

if [[ "${EUID}" -ne 0 ]]; then
  fail "Run the PostgreSQL backup alert through systemd or sudo." 77
fi
for command_name in date msmtp stat; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    fail "Required command ${command_name} is unavailable." 69
  fi
done
validate_root_file() {
  local path="$1"
  local label="$2"
  if [[ ! -f "${path}" || -L "${path}" || \
    "$(stat --format '%u:%g:%a' "${path}")" != "0:0:600" || \
    ! -s "${path}" ]]; then
    fail "${label} must be a non-empty root:root 0600 regular file."
  fi
}

validate_root_file "${recipient_file}" "The alert recipient"
validate_root_file "${smtp_config_file}" "The SMTP configuration"

failed_unit="${1:-}"
if [[ "$#" -ne 1 || ! "${failed_unit}" =~ ^[A-Za-z0-9_.@:-]{1,128}$ ]]; then
  fail "Supply one safe systemd unit name." 64
fi

recipient="$(<"${recipient_file}")"
if [[ ! "${recipient}" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,63}$ ]]; then
  fail "The alert recipient file must contain one valid email address."
fi

if ! {
  printf 'To: %s\n' "${recipient}"
  printf 'Subject: [GoodGood staging] PostgreSQL backup failed\n'
  printf 'Date: %s\n' "$(date --utc --rfc-email)"
  printf 'Content-Type: text/plain; charset=UTF-8\n'
  printf '\n'
  printf 'The GoodGood staging PostgreSQL backup failed at %s.\n' \
    "$(date --utc +%Y-%m-%dT%H:%M:%SZ)"
  printf 'Unit: %s\n' "${failed_unit}"
  printf 'Inspect the root journal. No automatic retry or restore was attempted.\n'
} | msmtp --file="${smtp_config_file}" -- "${recipient}" >/dev/null 2>&1; then
  fail "The SMTP relay failed to deliver the backup alert." 70
fi
printf 'backup_alert=delivered\n'
