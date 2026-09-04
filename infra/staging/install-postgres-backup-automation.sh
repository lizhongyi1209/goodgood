#!/usr/bin/env bash
set -euo pipefail

readonly config_root="/etc/goodgood/staging"
readonly backup_root="/var/backups/goodgood"
readonly cache_root="/var/cache/goodgood-restic"
readonly systemd_root="/etc/systemd/system"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this PostgreSQL backup installer through sudo." >&2
  exit 77
fi
if [[ ! -r /etc/os-release ]]; then
  echo "Cannot identify the host operating system." >&2
  exit 69
fi
# shellcheck disable=SC1091
source /etc/os-release
if [[ "${ID:-}" != "ubuntu" || "${VERSION_ID:-}" != "24.04" ]]; then
  echo "This installer accepts only Ubuntu 24.04." >&2
  exit 78
fi

source_root="${1:-}"
if [[ "$#" -ne 1 || ! -d "${source_root}" ]]; then
  echo "Supply the reviewed infra/staging source directory." >&2
  exit 64
fi
source_root="$(realpath --canonicalize-existing "${source_root}")"

required_sources=(
  "${source_root}/postgres-backup-restore.sh"
  "${source_root}/postgres-backup-automated.sh"
  "${source_root}/postgres-backup-alert.sh"
  "${source_root}/postgres-backup.env.example"
  "${source_root}/postgres-backup-msmtp.conf.example"
  "${source_root}/systemd/goodgood-postgres-backup.service"
  "${source_root}/systemd/goodgood-postgres-backup.timer"
  "${source_root}/systemd/goodgood-postgres-backup-alert@.service"
)
for source_path in "${required_sources[@]}"; do
  if [[ ! -f "${source_path}" || -L "${source_path}" ]]; then
    echo "Required reviewed source ${source_path} is missing or unsafe." >&2
    exit 66
  fi
done

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install --yes msmtp restic

for command_name in docker flock jq msmtp restic systemctl systemd-analyze; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "Required command ${command_name} is unavailable." >&2
    exit 69
  fi
done

install -o root -g root -m 0700 -d \
  "${backup_root}" \
  "${cache_root}" \
  "${config_root}/secrets/backups"
install -o root -g root -m 0755 \
  "${source_root}/postgres-backup-restore.sh" \
  /usr/local/sbin/goodgood-staging-postgres
install -o root -g root -m 0755 \
  "${source_root}/postgres-backup-automated.sh" \
  /usr/local/sbin/goodgood-staging-postgres-backup-automated
install -o root -g root -m 0755 \
  "${source_root}/postgres-backup-alert.sh" \
  /usr/local/sbin/goodgood-staging-postgres-backup-alert
install -o root -g root -m 0600 \
  "${source_root}/postgres-backup.env.example" \
  "${config_root}/postgres-backup.env.example"
install -o root -g root -m 0600 \
  "${source_root}/postgres-backup-msmtp.conf.example" \
  "${config_root}/postgres-backup-msmtp.conf.example"
install -o root -g root -m 0644 \
  "${source_root}/systemd/goodgood-postgres-backup.service" \
  "${source_root}/systemd/goodgood-postgres-backup.timer" \
  "${source_root}/systemd/goodgood-postgres-backup-alert@.service" \
  "${systemd_root}/"

systemctl daemon-reload
systemd-analyze verify \
  "${systemd_root}/goodgood-postgres-backup.service" \
  "${systemd_root}/goodgood-postgres-backup.timer"

printf 'backup_automation=installed\n'
printf 'timer_enabled=false\n'
printf 'next=configure-backup-secrets-initialize-then-configure-alert-and-enable\n'
