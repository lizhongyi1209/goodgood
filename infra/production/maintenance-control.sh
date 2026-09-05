#!/usr/bin/env bash
set -euo pipefail

readonly marker="/etc/goodgood/production/maintenance.enabled"
readonly asset="/var/www/goodgood-production/maintenance/index.html"
readonly nginx_site="/etc/nginx/sites-enabled/goodgood.conf"
readonly lock_file="/run/lock/goodgood-production-maintenance.lock"

usage() {
  cat >&2 <<'EOF'
Usage:
  maintenance-control.sh status
  maintenance-control.sh plan-enable
  maintenance-control.sh enable --execute

This tool intentionally has no disable action. Opening public traffic requires
the separately reviewed complete production gate and exact traffic approval.
EOF
  exit 64
}

fail() {
  printf '%s\n' "$1" >&2
  exit "${2:-78}"
}

status() {
  if [[ -f "${marker}" ]]; then
    printf 'maintenance=enabled\n'
  else
    printf 'maintenance=disabled\n'
  fi
}

action="${1:-}"
case "${action}" in
  status)
    [[ "$#" -eq 1 ]] || usage
    status
    exit 0
    ;;
  plan-enable)
    [[ "$#" -eq 1 ]] || usage
    ;;
  enable)
    [[ "$#" -eq 2 && "${2}" == "--execute" ]] || usage
    ;;
  *) usage ;;
esac

if [[ "${EUID}" -ne 0 ]]; then
  fail "Run the maintenance control through sudo." 77
fi
for command_name in curl flock install nginx stat systemctl; do
  command -v "${command_name}" >/dev/null 2>&1 || \
    fail "Required command ${command_name} is unavailable." 69
done
if [[ ! -f "${asset}" || -L "${asset}" ]]; then
  fail "The reviewed maintenance asset is not installed as a regular file."
fi
if [[ "$(stat --format '%u:%g:%a' "${asset}")" != "0:0:644" ]]; then
  fail "The maintenance asset must be root:root mode 0644."
fi
if [[ ! -f "${nginx_site}" || -L "${nginx_site}" ]]; then
  fail "The reviewed production Nginx site is not active."
fi
nginx -t

if [[ -L "${marker}" || ( -e "${marker}" && ! -f "${marker}" ) ]]; then
  fail "The maintenance marker path must be absent or a regular file."
fi
if [[ -f "${marker}" && "$(stat --format '%u:%g:%a' "${marker}")" != "0:0:644" ]]; then
  fail "An existing maintenance marker must be root:root mode 0644."
fi

printf 'marker=%s\n' "${marker}"
printf 'asset=%s\n' "${asset}"
printf 'public_response=503-static-maintenance\n'
printf 'normal_login_generation=unavailable\n'
printf 'disable_action=not-available\n'

if [[ "${action}" == "plan-enable" ]]; then
  printf 'executed=false\n'
  exit 0
fi

exec 9>"${lock_file}"
flock --exclusive 9
if [[ ! -e "${marker}" ]]; then
  install -o root -g root -m 0644 /dev/null "${marker}"
fi
if ! nginx -s reload; then
  systemctl stop nginx || fail "Nginx reload failed and ingress could not be stopped." 70
  fail "Nginx reload failed; public ingress was stopped." 70
fi
status

if ! http_status="$(curl --silent --show-error --insecure \
  --output /dev/null \
  --write-out '%{http_code}' \
  --resolve goodgood.o1key.com:443:127.0.0.1 \
  https://goodgood.o1key.com/)"; then
  systemctl stop nginx || fail "Maintenance probe failed and ingress could not be stopped." 70
  fail "Maintenance probe failed; public ingress was stopped." 70
fi
if [[ "${http_status}" != "503" ]]; then
  systemctl stop nginx || fail "Maintenance verification failed and ingress could not be stopped." 70
  fail "Maintenance is enabled but the local production origin did not return HTTP 503." 70
fi
printf 'origin_verification=passed\n'
