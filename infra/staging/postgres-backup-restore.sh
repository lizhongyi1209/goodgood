#!/usr/bin/env bash
set -euo pipefail

readonly source_container="goodgood-staging-dependencies-postgres-1"
readonly source_database="goodgood"
readonly source_user="goodgood"
readonly backup_root="/var/backups/goodgood"
readonly restore_container="goodgood-postgres-restore-drill"
readonly restore_database="goodgood_restore_drill"

temporary_archive=""
restore_started="false"

usage() {
  cat >&2 <<'EOF'
Usage:
  postgres-backup-restore.sh backup /var/backups/goodgood/staging-<label>.dump
  postgres-backup-restore.sh restore-drill /var/backups/goodgood/staging-<label>.dump
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
  if [[ "${restore_started}" == "true" ]]; then
    docker rm --force "${restore_container}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if [[ "${EUID}" -ne 0 ]]; then
  fail "Run the PostgreSQL backup tool through sudo." 77
fi

for command_name in docker realpath sha256sum stat; do
  if ! command -v "${command_name}" >/dev/null 2>&1; then
    fail "Required command ${command_name} is unavailable." 69
  fi
done

action="${1:-}"
archive_argument="${2:-}"
if [[ "$#" -ne 2 || ( "${action}" != "backup" && "${action}" != "restore-drill" ) ]]; then
  usage
fi

install -o root -g root -m 0700 -d "${backup_root}"
if [[ -L "${backup_root}" ]]; then
  fail "The backup root must not be a symbolic link."
fi

backup_root_resolved="$(realpath --canonicalize-existing "${backup_root}")"
archive_parent="$(realpath --canonicalize-missing "$(dirname "${archive_argument}")")"
archive_name="$(basename "${archive_argument}")"
if [[ "${archive_parent}" != "${backup_root_resolved}" || ! "${archive_name}" =~ ^staging-[A-Za-z0-9._-]+\.dump$ ]]; then
  fail "The archive must be a staging-*.dump file directly under ${backup_root}."
fi
archive_path="${backup_root_resolved}/${archive_name}"

if [[ "$(docker inspect --format '{{.State.Running}}' "${source_container}" 2>/dev/null || true)" != "true" ]]; then
  fail "The staging PostgreSQL source container is not running." 70
fi
source_image="$(docker inspect --format '{{.Image}}' "${source_container}")"
if [[ ! "${source_image}" =~ ^sha256:[a-f0-9]{64}$ ]]; then
  fail "The source PostgreSQL image is not identified by an immutable image ID."
fi

if [[ "${action}" == "backup" ]]; then
  if [[ -e "${archive_path}" || -L "${archive_path}" ]]; then
    fail "The requested backup archive already exists; refusing to overwrite it."
  fi

  temporary_archive="$(mktemp "${backup_root_resolved}/.${archive_name}.partial.XXXXXX")"
  chown root:root "${temporary_archive}"
  chmod 0600 "${temporary_archive}"
  docker exec "${source_container}" pg_dump \
    --username "${source_user}" \
    --dbname "${source_database}" \
    --format custom \
    --compress 9 \
    --no-owner \
    --no-privileges \
    >"${temporary_archive}"
  if [[ ! -s "${temporary_archive}" ]]; then
    fail "PostgreSQL produced an empty backup archive." 70
  fi
  docker run --rm \
    --network none \
    --read-only \
    --tmpfs /tmp:rw,nosuid,nodev,size=32m \
    --volume "${temporary_archive}:/backup/goodgood.dump:ro" \
    --entrypoint pg_restore \
    "${source_image}" \
    --list /backup/goodgood.dump >/dev/null
  mv "${temporary_archive}" "${archive_path}"
  temporary_archive=""
  chown root:root "${archive_path}"
  chmod 0600 "${archive_path}"

  printf 'backup=created\n'
  printf 'archive=%s\n' "${archive_path}"
  printf 'bytes=%s\n' "$(stat --format '%s' "${archive_path}")"
  printf 'sha256=%s\n' "$(sha256sum "${archive_path}" | awk '{print $1}')"
  exit 0
fi

if [[ ! -f "${archive_path}" || -L "${archive_path}" ]]; then
  fail "The requested backup archive is not a regular file." 66
fi
if [[ "$(stat --format '%u:%g:%a' "${archive_path}")" != "0:0:600" ]]; then
  fail "The backup archive must be owned by root:root with mode 0600."
fi
if docker inspect "${restore_container}" >/dev/null 2>&1; then
  fail "The fixed restore-drill container name is already in use; refusing to replace it."
fi

quiescence="$(docker exec "${source_container}" psql \
  --username "${source_user}" \
  --dbname "${source_database}" \
  --tuples-only \
  --no-align \
  --command "SELECT (SELECT count(*) FROM auth_sessions WHERE revoked_at IS NULL AND expires_at > now()) || '|' || (SELECT count(*) FROM generation_jobs WHERE state IN ('queued', 'running', 'refining'))")"
if [[ "${quiescence}" != "0|0" ]]; then
  fail "The restore drill requires zero active sessions and zero active generation jobs."
fi

source_tables="$(docker exec "${source_container}" psql \
  --username "${source_user}" \
  --dbname "${source_database}" \
  --tuples-only \
  --no-align \
  --command "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")"

docker run --detach --rm \
  --name "${restore_container}" \
  --network none \
  --read-only \
  --tmpfs /var/lib/postgresql/data:rw,nosuid,nodev,size=768m \
  --tmpfs /var/run/postgresql:rw,nosuid,nodev,size=16m \
  --tmpfs /tmp:rw,nosuid,nodev,size=64m \
  --env POSTGRES_HOST_AUTH_METHOD=trust \
  --env POSTGRES_DB=postgres \
  --volume "${archive_path}:/backup/goodgood.dump:ro" \
  "${source_image}" >/dev/null
restore_started="true"

ready="false"
for _ in $(seq 1 45); do
  if docker exec "${restore_container}" pg_isready \
    --username postgres \
    --dbname postgres >/dev/null 2>&1; then
    ready="true"
    break
  fi
  sleep 1
done
if [[ "${ready}" != "true" ]]; then
  fail "The isolated PostgreSQL restore target did not become ready." 70
fi

docker exec "${restore_container}" createdb \
  --username postgres \
  "${restore_database}"
docker exec "${restore_container}" pg_restore \
  --username postgres \
  --dbname "${restore_database}" \
  --exit-on-error \
  --single-transaction \
  --no-owner \
  --no-privileges \
  /backup/goodgood.dump

restored_tables="$(docker exec "${restore_container}" psql \
  --username postgres \
  --dbname "${restore_database}" \
  --tuples-only \
  --no-align \
  --command "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")"
if [[ "${restored_tables}" != "${source_tables}" ]]; then
  fail "The restored public table set does not match the source database." 70
fi

table_count=0
row_count=0
while IFS= read -r table_name; do
  if [[ -z "${table_name}" ]]; then
    continue
  fi
  if [[ ! "${table_name}" =~ ^[a-z][a-z0-9_]*$ ]]; then
    fail "The source database contains an unexpected public table identifier." 70
  fi
  source_count="$(docker exec "${source_container}" psql \
    --username "${source_user}" \
    --dbname "${source_database}" \
    --tuples-only \
    --no-align \
    --command "SELECT count(*) FROM ${table_name}")"
  restored_count="$(docker exec "${restore_container}" psql \
    --username postgres \
    --dbname "${restore_database}" \
    --tuples-only \
    --no-align \
    --command "SELECT count(*) FROM ${table_name}")"
  if [[ "${restored_count}" != "${source_count}" ]]; then
    fail "The restored row count differs for ${table_name}." 70
  fi
  table_count=$((table_count + 1))
  row_count=$((row_count + restored_count))
done <<<"${source_tables}"

migration_count="$(docker exec "${restore_container}" psql \
  --username postgres \
  --dbname "${restore_database}" \
  --tuples-only \
  --no-align \
  --command "SELECT count(*) FROM goodgood_schema_migrations")"

printf 'restore_drill=passed\n'
printf 'archive_sha256=%s\n' "$(sha256sum "${archive_path}" | awk '{print $1}')"
printf 'public_tables=%s\n' "${table_count}"
printf 'public_rows=%s\n' "${row_count}"
printf 'migrations=%s\n' "${migration_count}"
printf 'network=none\n'
printf 'storage=tmpfs\n'
