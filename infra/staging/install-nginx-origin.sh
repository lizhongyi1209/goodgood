#!/usr/bin/env bash
set -euo pipefail

readonly application_host="goodgood.o1key.com"
readonly config_root="/etc/goodgood/staging"
readonly tls_root="${config_root}/tls"
readonly private_key="${tls_root}/goodgood-origin.key"
readonly certificate="${tls_root}/goodgood-origin.pem"
readonly csr="${tls_root}/goodgood-origin.csr"
readonly nginx_target="/etc/nginx/sites-available/goodgood.conf"
readonly nginx_enabled="/etc/nginx/sites-enabled/goodgood.conf"
readonly allowlist_target="/etc/nginx/snippets/goodgood-cloudflare-origin-only.conf"

usage() {
  cat >&2 <<'EOF'
Usage:
  sudo install-nginx-origin.sh prepare
  sudo install-nginx-origin.sh activate NGINX_CONFIG CLOUDFLARE_ALLOWLIST ORIGIN_CERTIFICATE
EOF
  exit 64
}

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this installer through sudo." >&2
  exit 77
fi
if [[ ! -x /usr/sbin/nginx || ! -x /usr/bin/openssl ]]; then
  echo "Nginx and OpenSSL must already be installed." >&2
  exit 69
fi

install -o root -g root -m 0700 -d "${tls_root}"

case "${1:-}" in
  prepare)
    if [[ "$#" -ne 1 ]]; then
      usage
    fi
    if [[ ! -e "${private_key}" ]]; then
      openssl req \
        -new \
        -newkey ec \
        -pkeyopt ec_paramgen_curve:prime256v1 \
        -nodes \
        -keyout "${private_key}" \
        -out "${csr}" \
        -subj "/CN=${application_host}" \
        -addext "subjectAltName=DNS:${application_host}"
      chmod 0600 "${private_key}"
    elif [[ ! -s "${csr}" ]]; then
      openssl req \
        -new \
        -key "${private_key}" \
        -out "${csr}" \
        -subj "/CN=${application_host}" \
        -addext "subjectAltName=DNS:${application_host}"
    fi
    openssl req -in "${csr}" -noout -verify >/dev/null
    printf 'origin_csr=%s\n' "${csr}"
    ;;
  activate)
    if [[ "$#" -ne 4 ]]; then
      usage
    fi
    readonly nginx_source="$2"
    readonly allowlist_source="$3"
    readonly certificate_source="$4"
    for source_path in \
      "${nginx_source}" \
      "${allowlist_source}" \
      "${certificate_source}" \
      "${private_key}"; do
      if [[ ! -s "${source_path}" ]]; then
        echo "Required non-empty file is missing: ${source_path}" >&2
        exit 66
      fi
    done

    openssl x509 -in "${certificate_source}" -noout -checkhost "${application_host}" >/dev/null
    openssl x509 -in "${certificate_source}" -noout -checkend 2592000 >/dev/null
    certificate_key_digest="$(openssl x509 -in "${certificate_source}" -pubkey -noout | openssl sha256)"
    private_key_digest="$(openssl pkey -in "${private_key}" -pubout | openssl sha256)"
    if [[ "${certificate_key_digest}" != "${private_key_digest}" ]]; then
      echo "The origin certificate does not match the prepared private key." >&2
      exit 78
    fi

    install -o root -g root -m 0644 "${certificate_source}" "${certificate}"
    install -o root -g root -m 0644 "${nginx_source}" "${nginx_target}"
    install -o root -g root -m 0644 "${allowlist_source}" "${allowlist_target}"
    ln -sfn "${nginx_target}" "${nginx_enabled}"
    rm -f /etc/nginx/sites-enabled/default

    nginx -t
    systemctl enable --now nginx
    systemctl reload nginx
    systemctl is-active --quiet nginx
    printf 'nginx_origin=ready\n'
    ;;
  *)
    usage
    ;;
esac
