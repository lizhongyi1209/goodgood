#!/usr/bin/env bash
set -euo pipefail

readonly release_env_file="/etc/goodgood/production/release.env"
readonly runtime_env_file="/etc/goodgood/production/runtime.env"
readonly compose_file="/opt/goodgood-production/compose.production.account-deletion.yaml"
readonly lock_file="/run/lock/goodgood-production-account-deletion.lock"
readonly expected_authing_key_id_file="/etc/goodgood/production/secrets/account-deletion/authing-access-key-id"
readonly expected_authing_key_secret_file="/etc/goodgood/production/secrets/account-deletion/authing-access-key-secret"
readonly expected_r2_key_id_file="/etc/goodgood/production/secrets/r2-access-key-id"
readonly expected_r2_key_secret_file="/etc/goodgood/production/secrets/r2-secret-access-key"

fail() {
  printf '{"alertCode":"%s","event":"account_deletion.host_alert"}\n' "$1" >&2
  exit "${2:-78}"
}

[[ "$#" -eq 0 ]] || fail "ACCOUNT_DELETION_ARGUMENTS_FORBIDDEN" 64
[[ "${EUID}" -eq 0 ]] || fail "ACCOUNT_DELETION_ROOT_REQUIRED" 77

for command_name in cut docker flock grep stat; do
  command -v "${command_name}" >/dev/null 2>&1 || \
    fail "ACCOUNT_DELETION_HOST_DEPENDENCY_MISSING" 69
done

validate_root_file() {
  local path="$1"
  local expected_metadata="$2"
  if [[ ! -f "${path}" || -L "${path}" ]]; then
    fail "ACCOUNT_DELETION_HOST_FILE_INVALID"
  fi
  [[ "$(stat --format '%u:%g:%a' "${path}")" == "${expected_metadata}" ]] || \
    fail "ACCOUNT_DELETION_HOST_FILE_PERMISSIONS_INVALID"
  [[ -s "${path}" ]] || fail "ACCOUNT_DELETION_HOST_FILE_EMPTY"
}

validate_root_file "${release_env_file}" "0:0:600"
validate_root_file "${runtime_env_file}" "0:0:600"
validate_root_file "${compose_file}" "0:0:644"

allowed_release='^(#.*|[[:space:]]*|(GOODGOOD_RELEASE_IMAGE|GOODGOOD_RELEASE_REVISION|GOODGOOD_RELEASE_MIGRATION|GOODGOOD_RUNTIME_CONFIG_VERSION|GOODGOOD_RUNTIME_ENV_FILE|GOODGOOD_R2_INVENTORY_ENV_FILE|GOODGOOD_PRODUCTION_ORIGIN|GOODGOOD_AUTH_CLIENT_SECRET_SOURCE_FILE|GOODGOOD_GENERATION_API_KEY_SOURCE_FILE|GOODGOOD_OBJECT_STORAGE_ACCESS_KEY_ID_SOURCE_FILE|GOODGOOD_OBJECT_STORAGE_SECRET_ACCESS_KEY_SOURCE_FILE|GOODGOOD_PRODUCTION_SECRET_GID)=[A-Za-z0-9_./:@-]+)$'
if grep --invert-match --extended-regexp "${allowed_release}" "${release_env_file}" >/dev/null; then
  fail "ACCOUNT_DELETION_RELEASE_ENV_INVALID"
fi
for release_name in \
  GOODGOOD_RELEASE_IMAGE \
  GOODGOOD_RELEASE_REVISION \
  GOODGOOD_RELEASE_MIGRATION \
  GOODGOOD_RUNTIME_CONFIG_VERSION \
  GOODGOOD_RUNTIME_ENV_FILE \
  GOODGOOD_PRODUCTION_SECRET_GID; do
  [[ "$(grep --count "^${release_name}=" "${release_env_file}")" -eq 1 ]] || \
    fail "ACCOUNT_DELETION_RELEASE_ENV_INVALID"
done

release_image="$(grep '^GOODGOOD_RELEASE_IMAGE=' "${release_env_file}" | cut --delimiter '=' --fields 2-)"
configured_runtime_file="$(grep '^GOODGOOD_RUNTIME_ENV_FILE=' "${release_env_file}" | cut --delimiter '=' --fields 2-)"
secret_gid="$(grep '^GOODGOOD_PRODUCTION_SECRET_GID=' "${release_env_file}" | cut --delimiter '=' --fields 2-)"
[[ "${release_image}" =~ ^ghcr\.io/lizhongyi1209/goodgood@sha256:[a-f0-9]{64}$ ]] || \
  fail "ACCOUNT_DELETION_RELEASE_IMAGE_INVALID"
[[ "${configured_runtime_file}" == "${runtime_env_file}" ]] || \
  fail "ACCOUNT_DELETION_RUNTIME_ENV_PATH_INVALID"
[[ "${secret_gid}" =~ ^[1-9][0-9]*$ ]] || \
  fail "ACCOUNT_DELETION_SECRET_GROUP_INVALID"

for secret_file in \
  "${expected_authing_key_id_file}" \
  "${expected_authing_key_secret_file}" \
  "${expected_r2_key_id_file}" \
  "${expected_r2_key_secret_file}"; do
  validate_root_file "${secret_file}" "0:${secret_gid}:640"
done

docker image inspect "${release_image}" >/dev/null 2>&1 || \
  fail "ACCOUNT_DELETION_RELEASE_IMAGE_NOT_LOCAL" 69

exec 9>"${lock_file}"
flock --nonblock 9 || fail "ACCOUNT_DELETION_CYCLE_OVERLAP" 75

docker compose \
  --project-name goodgood-production-account-deletion \
  --env-file "${release_env_file}" \
  --file "${compose_file}" \
  run \
  --rm \
  --no-deps \
  --no-TTY \
  --pull never \
  account-deletion-cycle
