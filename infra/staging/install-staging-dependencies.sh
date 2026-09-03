#!/usr/bin/env bash
set -euo pipefail

readonly admin_user="goodgood"
readonly rustfs_uid="10001"
readonly rustfs_gid="10001"
readonly config_root="/etc/goodgood/staging"
readonly secrets_root="${config_root}/secrets/dependencies"
readonly compose_target="${config_root}/compose.dependencies.yaml"
readonly runtime_fragment="${config_root}/dependency-runtime.env"
readonly network_name="goodgood-staging-private"
readonly storage_origin_network_name="goodgood-staging-storage-origin"
readonly postgres_volume="goodgood-staging-postgres-data"
readonly object_storage_volume="goodgood-staging-object-storage-data"
readonly postgres_secret="${secrets_root}/postgres-password"
readonly object_storage_access_key="${secrets_root}/object-storage-access-key"
readonly object_storage_secret_key="${secrets_root}/object-storage-secret-key"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this dependency installer through sudo." >&2
  exit 77
fi

if ! id "${admin_user}" >/dev/null 2>&1; then
  echo "Required non-root administrator ${admin_user} does not exist." >&2
  exit 78
fi

for command_name in curl docker jq openssl; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "Required command ${command_name} is unavailable." >&2
    exit 69
  fi
done

compose_source="${1:-}"
if [[ -n "${compose_source}" ]]; then
  if [[ ! -f "${compose_source}" ]]; then
    echo "The supplied dependency Compose file is not a regular file." >&2
    exit 66
  fi
elif [[ -f "${compose_target}" ]]; then
  compose_source="${compose_target}"
else
  echo "Supply the reviewed dependency Compose file on the first run." >&2
  exit 64
fi

install -o root -g "${admin_user}" -m 0750 -d "${config_root}"
install -o root -g "${admin_user}" -m 0750 -d "${config_root}/secrets"
install -o root -g "${admin_user}" -m 0750 -d "${secrets_root}"
if [[ "${compose_source}" != "${compose_target}" ]]; then
  install -o root -g "${admin_user}" -m 0640 "${compose_source}" "${compose_target}"
fi

existing_secret_count=0
for secret_path in \
  "${postgres_secret}" \
  "${object_storage_access_key}" \
  "${object_storage_secret_key}"; do
  if [[ -e "${secret_path}" ]]; then
    existing_secret_count=$((existing_secret_count + 1))
  fi
done

if [[ "${existing_secret_count}" -ne 0 && "${existing_secret_count}" -ne 3 ]]; then
  echo "Dependency credentials are incomplete; refusing an implicit rotation." >&2
  exit 78
fi

if [[ "${existing_secret_count}" -eq 0 ]]; then
  if docker volume inspect "${postgres_volume}" >/dev/null 2>&1 || \
    docker volume inspect "${object_storage_volume}" >/dev/null 2>&1; then
    echo "Persistent data exists without its credentials; refusing to generate replacements." >&2
    exit 78
  fi

  umask 077
  postgres_password="$(openssl rand -hex 32)"
  storage_access="$(openssl rand -hex 20 | tr '[:lower:]' '[:upper:]')"
  storage_secret="$(openssl rand -hex 32)"
  printf '%s\n' "${postgres_password}" >"${postgres_secret}"
  printf '%s\n' "${storage_access}" >"${object_storage_access_key}"
  printf '%s\n' "${storage_secret}" >"${object_storage_secret_key}"
fi

if [[ ! "$(<"${postgres_secret}")" =~ ^[a-f0-9]{64}$ ]]; then
  echo "The PostgreSQL credential file is malformed." >&2
  exit 78
fi
if [[ ! "$(<"${object_storage_access_key}")" =~ ^[A-Z0-9]{40}$ ]]; then
  echo "The object-storage access-key file is malformed." >&2
  exit 78
fi
if [[ ! "$(<"${object_storage_secret_key}")" =~ ^[a-f0-9]{64}$ ]]; then
  echo "The object-storage secret-key file is malformed." >&2
  exit 78
fi

# The pinned RustFS image runs as uid/gid 10001. Compose file-backed secrets
# retain source ownership, so keep those two files host-root-managed and
# readable only by that exact container identity. PostgreSQL starts as root and
# can read the operator-owned 0600 file before dropping privileges.
chown "${admin_user}:${admin_user}" "${postgres_secret}"
chmod 0600 "${postgres_secret}"
chown "${rustfs_uid}:${rustfs_gid}" \
  "${object_storage_access_key}" \
  "${object_storage_secret_key}"
chmod 0400 \
  "${object_storage_access_key}" \
  "${object_storage_secret_key}"

runtime_temporary="$(mktemp "${config_root}/dependency-runtime.env.XXXXXX")"
trap 'rm -f "${runtime_temporary}"' EXIT
chmod 0600 "${runtime_temporary}"
chown "${admin_user}:${admin_user}" "${runtime_temporary}"
{
  printf 'DATABASE_URL=postgresql://goodgood:%s@postgres:5432/goodgood\n' "$(<"${postgres_secret}")"
  printf 'REDIS_URL=redis://valkey:6379\n'
} >"${runtime_temporary}"
mv -f "${runtime_temporary}" "${runtime_fragment}"
trap - EXIT
chown "${admin_user}:${admin_user}" "${runtime_fragment}"
chmod 0600 "${runtime_fragment}"

docker compose --file "${compose_target}" config --quiet
docker compose --file "${compose_target}" pull --quiet
docker compose --file "${compose_target}" up \
  --detach \
  --wait \
  --wait-timeout 180 \
  --remove-orphans

for service_name in postgres valkey; do
  container_id="$(docker compose --file "${compose_target}" ps --quiet "${service_name}")"
  if [[ -z "${container_id}" ]]; then
    echo "${service_name} is not running." >&2
    exit 70
  fi
  port_bindings="$(docker inspect --format '{{json .HostConfig.PortBindings}}' "${container_id}")"
  if [[ "${port_bindings}" != "null" && "${port_bindings}" != "{}" ]]; then
    echo "${service_name} unexpectedly publishes a host port." >&2
    exit 78
  fi
done

object_storage_id="$(docker compose --file "${compose_target}" ps --quiet object-storage)"
object_storage_bindings="$(docker inspect --format '{{json .HostConfig.PortBindings}}' "${object_storage_id}")"
if ! jq --exit-status '
  (keys == ["9000/tcp"]) and
  ((.["9000/tcp"] | length) == 1) and
  (.["9000/tcp"][0].HostIp == "127.0.0.1") and
  (.["9000/tcp"][0].HostPort | test("^[0-9]+$"))
' <<<"${object_storage_bindings}" >/dev/null; then
  echo "Object storage must publish only its S3 API on host loopback." >&2
  exit 78
fi

if [[ "$(docker network inspect --format '{{.Internal}}' "${network_name}")" != "true" ]]; then
  echo "The staging dependency network is not internally isolated." >&2
  exit 78
fi
if [[ "$(docker network inspect --format '{{.Internal}}' "${storage_origin_network_name}")" != "false" || \
  "$(docker network inspect --format '{{len .Containers}}' "${storage_origin_network_name}")" != "1" ]]; then
  echo "The storage-origin network must contain only object storage." >&2
  exit 78
fi

if ! curl \
  --fail \
  --max-time 5 \
  --silent \
  --show-error \
  http://127.0.0.1:9000/health/ready \
  >/dev/null; then
  echo "The loopback-only object-storage origin is unreachable." >&2
  exit 70
fi

for service_name in postgres valkey object-storage; do
  container_id="$(docker compose --file "${compose_target}" ps --quiet "${service_name}")"
  if [[ "$(docker inspect --format '{{.State.Health.Status}}' "${container_id}")" != "healthy" ]]; then
    echo "${service_name} did not become healthy." >&2
    exit 70
  fi
  inspect_document="$(docker inspect "${container_id}")"
  for secret_path in \
    "${postgres_secret}" \
    "${object_storage_access_key}" \
    "${object_storage_secret_key}"; do
    if grep -Fq -- "$(<"${secret_path}")" <<<"${inspect_document}"; then
      echo "A dependency credential leaked into Docker metadata." >&2
      exit 78
    fi
  done
done

printf 'staging_dependencies=ready\n'
printf 'compose_file=%s\n' "${compose_target}"
printf 'runtime_fragment=%s\n' "${runtime_fragment}"
printf 'private_network=%s\n' "${network_name}"
printf 'storage_origin_network=%s\n' "${storage_origin_network_name}"
printf 'object_storage_binding=127.0.0.1:9000\n'
