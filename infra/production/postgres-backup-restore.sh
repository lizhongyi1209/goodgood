#!/usr/bin/env bash
set -euo pipefail

readonly source_container="goodgood-production-dependencies-postgres-1"
readonly source_database="goodgood"
readonly source_user="goodgood"
readonly production_network="goodgood-production-state"
readonly release_env_file="/etc/goodgood/production/release.env"
readonly runtime_env_file="/etc/goodgood/production/runtime.env"
readonly backup_root="/var/backups/goodgood-production"
readonly restore_container="goodgood-production-postgres-restore-drill"
readonly restore_database="goodgood_restore_drill"
readonly recovery_runtime="server/runtime/account-deletion-recovery.mjs"

temporary_archive=""
temporary_register=""
temporary_manifest=""
restore_started="false"
backup_in_progress="false"
backup_succeeded="false"

usage() {
  cat >&2 <<'EOF'
Usage:
  postgres-backup-restore.sh backup <archive.dump> <register.json> <manifest.json>
  postgres-backup-restore.sh restore-drill <archive.dump> <register.json> <manifest.json>

All three files must use one production-auto-<UTC timestamp> stem and live
directly under /var/backups/goodgood-production.
EOF
  exit 64
}

fail() {
  printf '%s\n' "$1" >&2
  exit "${2:-78}"
}

cleanup() {
  for temporary_path in \
    "${temporary_archive}" \
    "${temporary_register}" \
    "${temporary_manifest}"; do
    if [[ -n "${temporary_path}" && -e "${temporary_path}" ]]; then
      rm -f -- "${temporary_path}"
    fi
  done
  if [[ "${backup_in_progress}" == "true" && "${backup_succeeded}" != "true" ]]; then
    rm -f -- "${archive_path:-}" "${register_path:-}" "${manifest_path:-}"
  fi
  if [[ "${restore_started}" == "true" ]]; then
    docker rm --force "${restore_container}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

[[ "${EUID}" -eq 0 ]] || fail "Run the PostgreSQL backup tool through sudo." 77
for command_name in awk basename chmod chown cut date dirname docker grep install jq mktemp mv realpath seq sha256sum sleep stat; do
  command -v "${command_name}" >/dev/null 2>&1 || \
    fail "Required command ${command_name} is unavailable." 69
done

action="${1:-}"
archive_argument="${2:-}"
register_argument="${3:-}"
manifest_argument="${4:-}"
if [[ "$#" -ne 4 || ( "${action}" != "backup" && "${action}" != "restore-drill" ) ]]; then
  usage
fi

install -o root -g root -m 0700 -d "${backup_root}"
[[ ! -L "${backup_root}" ]] || fail "The backup root must not be a symbolic link."
backup_root_resolved="$(realpath --canonicalize-existing "${backup_root}")"

resolve_bundle_path() {
  local argument="$1"
  local parent
  parent="$(realpath --canonicalize-missing "$(dirname "${argument}")")"
  [[ "${parent}" == "${backup_root_resolved}" ]] || \
    fail "Recovery-point files must be directly under ${backup_root}."
  printf '%s/%s\n' "${backup_root_resolved}" "$(basename "${argument}")"
}

archive_path="$(resolve_bundle_path "${archive_argument}")"
register_path="$(resolve_bundle_path "${register_argument}")"
manifest_path="$(resolve_bundle_path "${manifest_argument}")"
archive_name="$(basename "${archive_path}")"
register_name="$(basename "${register_path}")"
manifest_name="$(basename "${manifest_path}")"
if [[ ! "${archive_name}" =~ ^(production-auto-[0-9]{8}T[0-9]{6}Z)\.dump$ ]]; then
  fail "The archive must use the production-auto-<UTC timestamp>.dump form."
fi
bundle_stem="${BASH_REMATCH[1]}"
[[ "${register_name}" == "${bundle_stem}.account-deletion-register.json" ]] || \
  fail "The register artifact must use the same recovery-point stem."
[[ "${manifest_name}" == "${bundle_stem}.recovery-manifest.json" ]] || \
  fail "The recovery manifest must use the same recovery-point stem."

validate_root_file() {
  local path="$1"
  local label="$2"
  if [[ ! -f "${path}" || -L "${path}" ]]; then
    fail "${label} must be a regular non-symbolic-link file." 66
  fi
  if [[ "$(stat --format '%u:%g:%a' "${path}")" != "0:0:600" ]]; then
    fail "${label} must be root:root mode 0600."
  fi
  [[ -s "${path}" ]] || fail "${label} must not be empty." 70
}

if [[ "$(docker inspect --format '{{.State.Running}}' "${source_container}" 2>/dev/null || true)" != "true" ]]; then
  fail "The production PostgreSQL source container is not running." 70
fi
source_image="$(docker inspect --format '{{.Image}}' "${source_container}")"
[[ "${source_image}" =~ ^sha256:[a-f0-9]{64}$ ]] || \
  fail "The source PostgreSQL image is not immutable."

discover_application_image() {
  local container_id candidate_image candidate_id
  local selected_image selected_id
  validate_root_file "${release_env_file}" "The production release environment"
  if [[ "$(grep --count '^GOODGOOD_RELEASE_IMAGE=' "${release_env_file}")" -ne 1 ]]; then
    fail "The production release environment must define one application image."
  fi
  selected_image="$(grep '^GOODGOOD_RELEASE_IMAGE=' "${release_env_file}" | cut --delimiter '=' --fields 2-)"
  [[ "${selected_image}" =~ ^ghcr\.io/lizhongyi1209/goodgood@sha256:[a-f0-9]{64}$ ]] || \
    fail "The configured production application image is not an approved digest."
  selected_id="$(docker image inspect --format '{{.Id}}' "${selected_image}")" || \
    fail "The configured production application image must already exist locally." 69
  [[ "${selected_id}" =~ ^sha256:[a-f0-9]{64}$ ]] || \
    fail "The configured production application image is not immutable."
  while IFS= read -r container_id; do
    [[ -n "${container_id}" ]] || continue
    candidate_image="$(docker inspect --format '{{.Config.Image}}' "${container_id}")"
    candidate_id="$(docker inspect --format '{{.Image}}' "${container_id}")"
    [[ "${candidate_image}" =~ ^ghcr\.io/lizhongyi1209/goodgood@sha256:[a-f0-9]{64}$ ]] || \
      fail "A running production application uses an unapproved image reference."
    [[ "${candidate_id}" =~ ^sha256:[a-f0-9]{64}$ ]] || \
      fail "A running production application image is not immutable."
    [[ "${selected_image}" == "${candidate_image}" && "${selected_id}" == "${candidate_id}" ]] || \
      fail "A running production application differs from the configured release image."
  done < <(docker ps \
    --filter "network=${production_network}" \
    --filter "label=org.opencontainers.image.title=GoodGood" \
    --format '{{.ID}}')
  printf '%s\n' "${selected_image}"
}

run_recovery_image() {
  local image="$1"
  shift
  local docker_arguments=()
  while [[ "$#" -gt 0 && "$1" != "--" ]]; do
    docker_arguments+=("$1")
    shift
  done
  [[ "$#" -gt 0 && "$1" == "--" ]] || \
    fail "The recovery image command separator is missing."
  shift
  docker run --rm \
    --pull never \
    --user 0:0 \
    --read-only \
    --security-opt no-new-privileges:true \
    --pids-limit 128 \
    --memory 384m \
    --cpus 0.5 \
    --tmpfs /tmp:rw,nosuid,nodev,size=32m \
    --entrypoint node \
    "${docker_arguments[@]}" \
    "${image}" \
    "${recovery_runtime}" \
    "$@"
}

if [[ "${action}" == "backup" ]]; then
  for output_path in "${archive_path}" "${register_path}" "${manifest_path}"; do
    if [[ -e "${output_path}" || -L "${output_path}" ]]; then
      fail "A requested recovery-point file already exists; refusing to overwrite it."
    fi
  done
  backup_in_progress="true"
  validate_root_file "${runtime_env_file}" "The production runtime environment"
  application_image="$(discover_application_image)"

  temporary_archive="$(mktemp "${backup_root_resolved}/.${archive_name}.partial.XXXXXX")"
  chown root:root "${temporary_archive}"
  chmod 0600 "${temporary_archive}"
  docker exec "${source_container}" pg_dump \
    --username "${source_user}" \
    --dbname "${source_database}" \
    --format custom \
    --compress 9 \
    --no-owner \
    --no-privileges >"${temporary_archive}"
  [[ -s "${temporary_archive}" ]] || fail "PostgreSQL produced an empty archive." 70
  docker run --rm \
    --pull never \
    --network none \
    --read-only \
    --tmpfs /tmp:rw,nosuid,nodev,size=32m \
    --volume "${temporary_archive}:/backup/goodgood.dump:ro" \
    --entrypoint pg_restore \
    "${source_image}" \
    --list /backup/goodgood.dump >/dev/null
  archived_at="$(date --utc +%Y-%m-%dT%H:%M:%S.%3NZ)"

  temporary_register="$(mktemp "${backup_root_resolved}/.${register_name}.partial.XXXXXX")"
  chown root:root "${temporary_register}"
  chmod 0600 "${temporary_register}"
  run_recovery_image "${application_image}" \
    --network "${production_network}" \
    --env-file "${runtime_env_file}" \
    -- \
    export >"${temporary_register}"
  [[ -s "${temporary_register}" ]] || \
    fail "The account-deletion register export is empty." 70

  mv "${temporary_archive}" "${archive_path}"
  temporary_archive=""
  mv "${temporary_register}" "${register_path}"
  temporary_register=""
  chown root:root "${archive_path}" "${register_path}"
  chmod 0600 "${archive_path}" "${register_path}"

  temporary_manifest="$(mktemp "${backup_root_resolved}/.${manifest_name}.partial.XXXXXX")"
  chown root:root "${temporary_manifest}"
  chmod 0600 "${temporary_manifest}"
  run_recovery_image "${application_image}" \
    --network none \
    --volume "${archive_path}:/recovery/${archive_name}:ro" \
    --volume "${register_path}:/recovery/${register_name}:ro" \
    -- \
    create-manifest \
    --application-image "${application_image}" \
    --archive-file "/recovery/${archive_name}" \
    --archived-at "${archived_at}" \
    --register-file "/recovery/${register_name}" >"${temporary_manifest}"
  [[ -s "${temporary_manifest}" ]] || fail "The recovery manifest is empty." 70
  mv "${temporary_manifest}" "${manifest_path}"
  temporary_manifest=""
  chown root:root "${manifest_path}"
  chmod 0600 "${manifest_path}"

  run_recovery_image "${application_image}" \
    --network none \
    --volume "${archive_path}:/recovery/${archive_name}:ro" \
    --volume "${register_path}:/recovery/${register_name}:ro" \
    --volume "${manifest_path}:/recovery/${manifest_name}:ro" \
    -- \
    verify-bundle \
    --archive-file "/recovery/${archive_name}" \
    --register-file "/recovery/${register_name}" \
    --manifest-file "/recovery/${manifest_name}" >/dev/null

  backup_succeeded="true"
  printf 'backup=created\n'
  printf 'archive=%s\n' "${archive_path}"
  printf 'archive_bytes=%s\n' "$(stat --format '%s' "${archive_path}")"
  printf 'archive_sha256=%s\n' "$(sha256sum "${archive_path}" | awk '{print $1}')"
  printf 'register_sha256=%s\n' "$(jq --exit-status --raw-output '.sha256' "${register_path}")"
  printf 'recovery_manifest=%s\n' "${manifest_path}"
  exit 0
fi

validate_root_file "${archive_path}" "The backup archive"
validate_root_file "${register_path}" "The account-deletion register artifact"
validate_root_file "${manifest_path}" "The recovery manifest"
application_image="$(jq --exit-status --raw-output '.applicationImage // empty' "${manifest_path}")" || \
  fail "The recovery manifest has no application image." 66
[[ "${application_image}" =~ ^ghcr\.io/lizhongyi1209/goodgood@sha256:[a-f0-9]{64}$ ]] || \
  fail "The recovery manifest application image is malformed." 66
docker image inspect "${application_image}" >/dev/null 2>&1 || \
  fail "The exact recovery application image must already exist locally." 69
if docker inspect "${restore_container}" >/dev/null 2>&1; then
  fail "The fixed restore-drill container name is already in use."
fi

application_schema="$(docker exec "${source_container}" psql \
  --username "${source_user}" \
  --dbname "${source_database}" \
  --tuples-only \
  --no-align \
  --command "SELECT CASE
    WHEN to_regclass('public.auth_sessions') IS NOT NULL
     AND to_regclass('public.generation_jobs') IS NOT NULL
    THEN 'present' ELSE 'absent' END")"
if [[ "${application_schema}" == "present" ]]; then
  quiescence="$(docker exec "${source_container}" psql \
    --username "${source_user}" \
    --dbname "${source_database}" \
    --tuples-only \
    --no-align \
    --command "SELECT (SELECT count(*) FROM auth_sessions WHERE revoked_at IS NULL AND expires_at > now()) || '|' || (SELECT count(*) FROM generation_jobs WHERE state IN ('queued', 'running', 'refining'))")"
else
  quiescence="0|0"
fi
[[ "${quiescence}" == "0|0" ]] || \
  fail "The restore drill requires zero active sessions and generation jobs."

source_tables="$(docker exec "${source_container}" psql \
  --username "${source_user}" \
  --dbname "${source_database}" \
  --tuples-only \
  --no-align \
  --command "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")"

docker run --detach --rm \
  --pull never \
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
    --username postgres --dbname postgres >/dev/null 2>&1; then
    ready="true"
    break
  fi
  sleep 1
done
[[ "${ready}" == "true" ]] || fail "The restore target did not become ready." 70

docker exec "${restore_container}" createdb --username postgres "${restore_database}"
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
[[ "${restored_tables}" == "${source_tables}" ]] || \
  fail "The restored public table set differs from production." 70

replay_result="$(run_recovery_image "${application_image}" \
  --network "container:${restore_container}" \
  --env "DATABASE_URL=postgresql://postgres@127.0.0.1:5432/${restore_database}?sslmode=disable" \
  --volume "${archive_path}:/recovery/${archive_name}:ro" \
  --volume "${register_path}:/recovery/${register_name}:ro" \
  --volume "${manifest_path}:/recovery/${manifest_name}:ro" \
  -- \
  replay \
  --archive-file "/recovery/${archive_name}" \
  --register-file "/recovery/${register_name}" \
  --manifest-file "/recovery/${manifest_name}")"
jq --exit-status '.ready == true' <<<"${replay_result}" >/dev/null || \
  fail "The account-deletion register replay did not make recovery ready." 70

table_count=0
row_count=0
while IFS= read -r table_name; do
  [[ -n "${table_name}" ]] || continue
  [[ "${table_name}" =~ ^[a-z][a-z0-9_]*$ ]] || \
    fail "The source contains an unexpected table identifier." 70
  source_count="$(docker exec "${source_container}" psql \
    --username "${source_user}" --dbname "${source_database}" \
    --tuples-only --no-align --command "SELECT count(*) FROM ${table_name}")"
  restored_count="$(docker exec "${restore_container}" psql \
    --username postgres --dbname "${restore_database}" \
    --tuples-only --no-align --command "SELECT count(*) FROM ${table_name}")"
  [[ "${restored_count}" == "${source_count}" ]] || \
    fail "The restored row count differs for ${table_name}." 70
  table_count=$((table_count + 1))
  row_count=$((row_count + restored_count))
done <<<"${source_tables}"

if [[ "${application_schema}" == "present" ]]; then
  migration_count="$(docker exec "${restore_container}" psql \
    --username postgres --dbname "${restore_database}" \
    --tuples-only --no-align \
    --command "SELECT count(*) FROM goodgood_schema_migrations")"
else
  migration_count="0"
fi

printf 'restore_drill=passed\n'
printf 'archive_sha256=%s\n' "$(sha256sum "${archive_path}" | awk '{print $1}')"
printf 'register_sha256=%s\n' "$(jq --exit-status --raw-output '.artifactSha256' <<<"${replay_result}")"
printf 'register_records=%s\n' "$(jq --exit-status --raw-output '.recordCount' <<<"${replay_result}")"
printf 'public_tables=%s\n' "${table_count}"
printf 'public_rows=%s\n' "${row_count}"
printf 'migrations=%s\n' "${migration_count}"
printf 'network=none\n'
printf 'storage=tmpfs\n'
printf 'recovery_ready=true\n'
