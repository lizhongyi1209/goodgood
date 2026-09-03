import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { loadAuthenticationConfig } from "../server/auth/config.mjs";
import { loadGenerationConfig } from "../server/generation/config.mjs";

export const STAGING_AUTH_SECRET_PATH =
  "/run/secrets/goodgood_auth_client_secret";
export const STAGING_GENERATION_SECRET_PATH =
  "/run/secrets/goodgood_generation_api_key";
export const STAGING_OBJECT_STORAGE_ACCESS_KEY_PATH =
  "/run/secrets/goodgood_object_storage_access_key_id";
export const STAGING_OBJECT_STORAGE_SECRET_KEY_PATH =
  "/run/secrets/goodgood_object_storage_secret_access_key";
export const STAGING_APPLICATION_ORIGIN = "https://goodgood.o1key.com";
export const STAGING_R2_ENDPOINT =
  "https://3b918f80852289d9879e7f73bccc2e22.r2.cloudflarestorage.com";

const RELEASE_VARIABLES = Object.freeze([
  "GOODGOOD_RELEASE_IMAGE",
  "GOODGOOD_RELEASE_REVISION",
  "GOODGOOD_RELEASE_MIGRATION",
  "GOODGOOD_RUNTIME_CONFIG_VERSION",
  "GOODGOOD_RUNTIME_ENV_FILE",
  "GOODGOOD_AUTH_CLIENT_SECRET_SOURCE_FILE",
  "GOODGOOD_GENERATION_API_KEY_SOURCE_FILE",
  "GOODGOOD_OBJECT_STORAGE_ACCESS_KEY_ID_SOURCE_FILE",
  "GOODGOOD_OBJECT_STORAGE_SECRET_ACCESS_KEY_SOURCE_FILE",
  "GOODGOOD_STAGING_WEB_PORT",
  "GOODGOOD_STAGING_WORKER_HEALTH_PORT",
]);

function check(id, status, detail) {
  return Object.freeze({ detail, id, status });
}

function required(environment, name) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function parseUrl(value, name, protocols) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute URL.`);
  }
  if (!protocols.includes(url.protocol)) {
    throw new Error(`${name} must use ${protocols.join(" or ")}.`);
  }
  if (url.hash) throw new Error(`${name} must not contain a fragment.`);
  return url;
}

function isLoopback(hostname) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized === "0.0.0.0" ||
    /^127(?:\.\d{1,3}){3}$/.test(normalized)
  );
}

function validateSecretFile(sourcePath, name) {
  if (!path.isAbsolute(sourcePath)) {
    throw new Error(`${name} must be an absolute host path.`);
  }
  let contents;
  let stats;
  try {
    contents = readFileSync(sourcePath, "utf8").trim();
    stats = statSync(sourcePath);
  } catch {
    throw new Error(`${name} must reference a readable secret file.`);
  }
  if (!stats.isFile() || !contents) {
    throw new Error(`${name} must reference a non-empty regular file.`);
  }
  if (process.platform !== "win32" && (stats.mode & 0o077) !== 0) {
    throw new Error(`${name} must not grant group or other permissions.`);
  }
}

function validateRelease(release, runtimeFilePath) {
  const image = required(release, "GOODGOOD_RELEASE_IMAGE");
  if (
    !/^ghcr\.io\/lizhongyi1209\/goodgood@sha256:[a-f0-9]{64}$/.test(image)
  ) {
    throw new Error(
      "GOODGOOD_RELEASE_IMAGE must be the GoodGood GHCR image pinned by sha256 digest.",
    );
  }

  const revision = required(release, "GOODGOOD_RELEASE_REVISION");
  if (!/^[a-f0-9]{40}$/.test(revision)) {
    throw new Error("GOODGOOD_RELEASE_REVISION must be a full lowercase Git SHA.");
  }

  const migration = required(release, "GOODGOOD_RELEASE_MIGRATION");
  if (!/^\d{4}_[a-z0-9_]+\.sql$/.test(migration)) {
    throw new Error("GOODGOOD_RELEASE_MIGRATION must be a versioned SQL filename.");
  }

  const runtimeConfigVersion = required(
    release,
    "GOODGOOD_RUNTIME_CONFIG_VERSION",
  );
  if (!/^[a-f0-9]{64}$/.test(runtimeConfigVersion)) {
    throw new Error(
      "GOODGOOD_RUNTIME_CONFIG_VERSION must be the CI-recorded sha256 checksum.",
    );
  }

  const configuredRuntimeFile = required(
    release,
    "GOODGOOD_RUNTIME_ENV_FILE",
  );
  if (!path.isAbsolute(configuredRuntimeFile)) {
    throw new Error("GOODGOOD_RUNTIME_ENV_FILE must be an absolute host path.");
  }
  if (
    runtimeFilePath &&
    path.resolve(configuredRuntimeFile) !== path.resolve(runtimeFilePath)
  ) {
    throw new Error(
      "GOODGOOD_RUNTIME_ENV_FILE must identify the runtime file supplied to preflight.",
    );
  }

  validateSecretFile(
    required(release, "GOODGOOD_AUTH_CLIENT_SECRET_SOURCE_FILE"),
    "GOODGOOD_AUTH_CLIENT_SECRET_SOURCE_FILE",
  );
  validateSecretFile(
    required(release, "GOODGOOD_GENERATION_API_KEY_SOURCE_FILE"),
    "GOODGOOD_GENERATION_API_KEY_SOURCE_FILE",
  );
  validateSecretFile(
    required(release, "GOODGOOD_OBJECT_STORAGE_ACCESS_KEY_ID_SOURCE_FILE"),
    "GOODGOOD_OBJECT_STORAGE_ACCESS_KEY_ID_SOURCE_FILE",
  );
  validateSecretFile(
    required(release, "GOODGOOD_OBJECT_STORAGE_SECRET_ACCESS_KEY_SOURCE_FILE"),
    "GOODGOOD_OBJECT_STORAGE_SECRET_ACCESS_KEY_SOURCE_FILE",
  );

  return Object.freeze({ image, migration, revision, runtimeConfigVersion });
}

function validateRuntime(release, runtime) {
  if (runtime.NODE_ENV !== "production") {
    throw new Error("NODE_ENV must be production.");
  }
  if (runtime.GOODGOOD_REVISION) {
    throw new Error(
      "GOODGOOD_REVISION must come from the immutable image and must not be overridden.",
    );
  }
  for (const name of RELEASE_VARIABLES) {
    if (runtime[name]) {
      throw new Error(`${name} belongs in the release file, not the runtime file.`);
    }
  }

  if (runtime.GOODGOOD_AUTH_MODE !== "oidc") {
    throw new Error("GOODGOOD_AUTH_MODE must be oidc in staging.");
  }
  if (
    runtime.GOODGOOD_ALLOW_LOCAL_AUTH &&
    runtime.GOODGOOD_ALLOW_LOCAL_AUTH !== "false"
  ) {
    throw new Error("GOODGOOD_ALLOW_LOCAL_AUTH must be absent or false.");
  }
  if (runtime.GOODGOOD_LOCAL_AUTH_TOKENS || runtime.GOODGOOD_LOCAL_AUTH_DEFAULT_TOKEN) {
    throw new Error("Local authentication credentials are forbidden in staging.");
  }
  if (runtime.GOODGOOD_AUTH_CLIENT_SECRET) {
    throw new Error(
      "GOODGOOD_AUTH_CLIENT_SECRET is forbidden; mount the documented secret file.",
    );
  }
  if (runtime.GOODGOOD_AUTH_CLIENT_SECRET_FILE !== STAGING_AUTH_SECRET_PATH) {
    throw new Error(
      `GOODGOOD_AUTH_CLIENT_SECRET_FILE must be ${STAGING_AUTH_SECRET_PATH}.`,
    );
  }

  if (
    runtime.GOODGOOD_FAKE_PAYMENT_ENABLED &&
    runtime.GOODGOOD_FAKE_PAYMENT_ENABLED !== "false"
  ) {
    throw new Error("GOODGOOD_FAKE_PAYMENT_ENABLED must be absent or false.");
  }
  if (runtime.GOODGOOD_FAKE_PAYMENT_WEBHOOK_SECRET) {
    throw new Error("The fake payment webhook secret is forbidden in staging.");
  }

  if (runtime.GENERATION_PROVIDER_KIND !== "o1key") {
    throw new Error("GENERATION_PROVIDER_KIND must be o1key in staging.");
  }
  if (
    runtime.GENERATION_PROVIDER_ALLOW_INSECURE_LOOPBACK &&
    runtime.GENERATION_PROVIDER_ALLOW_INSECURE_LOOPBACK !== "false"
  ) {
    throw new Error(
      "GENERATION_PROVIDER_ALLOW_INSECURE_LOOPBACK must be absent or false.",
    );
  }
  if (runtime.GENERATION_API_KEY) {
    throw new Error(
      "GENERATION_API_KEY is forbidden; mount the documented secret file.",
    );
  }
  if (runtime.GENERATION_API_KEY_FILE !== STAGING_GENERATION_SECRET_PATH) {
    throw new Error(
      `GENERATION_API_KEY_FILE must be ${STAGING_GENERATION_SECRET_PATH}.`,
    );
  }

  if (runtime.OBJECT_STORAGE_PROVIDER_KIND !== "r2") {
    throw new Error("OBJECT_STORAGE_PROVIDER_KIND must be r2 in staging.");
  }
  if (
    runtime.OBJECT_STORAGE_ACCESS_KEY_ID ||
    runtime.OBJECT_STORAGE_SECRET_ACCESS_KEY
  ) {
    throw new Error(
      "Inline object-storage credentials are forbidden; mount the documented secret files.",
    );
  }
  if (
    runtime.OBJECT_STORAGE_ACCESS_KEY_ID_FILE !==
    STAGING_OBJECT_STORAGE_ACCESS_KEY_PATH
  ) {
    throw new Error(
      `OBJECT_STORAGE_ACCESS_KEY_ID_FILE must be ${STAGING_OBJECT_STORAGE_ACCESS_KEY_PATH}.`,
    );
  }
  if (
    runtime.OBJECT_STORAGE_SECRET_ACCESS_KEY_FILE !==
    STAGING_OBJECT_STORAGE_SECRET_KEY_PATH
  ) {
    throw new Error(
      `OBJECT_STORAGE_SECRET_ACCESS_KEY_FILE must be ${STAGING_OBJECT_STORAGE_SECRET_KEY_PATH}.`,
    );
  }

  const authEnvironment = {
    ...runtime,
    GOODGOOD_AUTH_CLIENT_SECRET_FILE:
      release.GOODGOOD_AUTH_CLIENT_SECRET_SOURCE_FILE,
  };
  const generationEnvironment = {
    ...runtime,
    GENERATION_API_KEY_FILE:
      release.GOODGOOD_GENERATION_API_KEY_SOURCE_FILE,
    OBJECT_STORAGE_ACCESS_KEY_ID_FILE:
      release.GOODGOOD_OBJECT_STORAGE_ACCESS_KEY_ID_SOURCE_FILE,
    OBJECT_STORAGE_SECRET_ACCESS_KEY_FILE:
      release.GOODGOOD_OBJECT_STORAGE_SECRET_ACCESS_KEY_SOURCE_FILE,
  };
  const auth = loadAuthenticationConfig(authEnvironment);
  loadGenerationConfig(generationEnvironment);
  if (
    auth.redirectUri !== `${STAGING_APPLICATION_ORIGIN}/api/auth/callback`
  ) {
    throw new Error(
      `GOODGOOD_AUTH_REDIRECT_URI must use ${STAGING_APPLICATION_ORIGIN}.`,
    );
  }

  const database = parseUrl(
    required(runtime, "DATABASE_URL"),
    "DATABASE_URL",
    ["postgres:", "postgresql:"],
  );
  const redis = parseUrl(required(runtime, "REDIS_URL"), "REDIS_URL", [
    "redis:",
    "rediss:",
  ]);
  if (isLoopback(database.hostname) || isLoopback(redis.hostname)) {
    throw new Error("Staging database and queue URLs must not use host loopback.");
  }

  const storageEndpoint = parseUrl(
    required(runtime, "OBJECT_STORAGE_ENDPOINT"),
    "OBJECT_STORAGE_ENDPOINT",
    ["http:", "https:"],
  );
  const publicStorageEndpoint = parseUrl(
    required(runtime, "OBJECT_STORAGE_PUBLIC_ENDPOINT"),
    "OBJECT_STORAGE_PUBLIC_ENDPOINT",
    ["https:"],
  );
  if (
    storageEndpoint.username ||
    storageEndpoint.password ||
    publicStorageEndpoint.username ||
    publicStorageEndpoint.password
  ) {
    throw new Error(
      "Object-storage endpoints must not embed credentials in their URLs.",
    );
  }
  if (
    isLoopback(storageEndpoint.hostname) ||
    isLoopback(publicStorageEndpoint.hostname)
  ) {
    throw new Error("Staging object-storage endpoints must not use host loopback.");
  }
  if (
    storageEndpoint.origin !== STAGING_R2_ENDPOINT ||
    publicStorageEndpoint.origin !== STAGING_R2_ENDPOINT ||
    storageEndpoint.pathname !== "/" ||
    publicStorageEndpoint.pathname !== "/" ||
    storageEndpoint.search ||
    publicStorageEndpoint.search
  ) {
    throw new Error(
      "Private R2 operations and presigned browser URLs must use the accepted R2 S3 API endpoint, never a public custom domain.",
    );
  }
  if (required(runtime, "OBJECT_STORAGE_BUCKET") !== "goodgood") {
    throw new Error("OBJECT_STORAGE_BUCKET must be goodgood in staging.");
  }
  if (required(runtime, "OBJECT_STORAGE_REGION") !== "auto") {
    throw new Error("OBJECT_STORAGE_REGION must be auto for Cloudflare R2.");
  }
  if (runtime.OBJECT_STORAGE_PROVISIONING_MODE !== "verify") {
    throw new Error(
      "OBJECT_STORAGE_PROVISIONING_MODE must be verify for least-privilege Cloudflare R2 access.",
    );
  }
  if (runtime.OBJECT_STORAGE_FORCE_PATH_STYLE !== "true") {
    throw new Error("OBJECT_STORAGE_FORCE_PATH_STYLE must be true for Cloudflare R2.");
  }

  const origins = required(
    runtime,
    "OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS",
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (
    origins.length === 0 ||
    origins.length !== 1 ||
    origins.includes("*") ||
    origins.some((origin) => {
      const url = parseUrl(origin, "OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS", [
        "https:",
      ]);
      return (
        isLoopback(url.hostname) ||
        Boolean(url.username) ||
        Boolean(url.password) ||
        url.pathname !== "/" ||
        Boolean(url.search)
      );
    })
  ) {
    throw new Error(
      "OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS must contain exact non-loopback HTTPS origins and never *.",
    );
  }
  if (origins[0] !== STAGING_APPLICATION_ORIGIN) {
    throw new Error(
      `OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS must be exactly ${STAGING_APPLICATION_ORIGIN}.`,
    );
  }

  const provider = parseUrl(
    required(runtime, "GENERATION_API_BASE_URL"),
    "GENERATION_API_BASE_URL",
    ["https:"],
  );
  if (
    provider.origin !== "https://cf-api.o1key.com" ||
    provider.username ||
    provider.password ||
    !["", "/"].includes(provider.pathname) ||
    provider.search
  ) {
    throw new Error(
      "GENERATION_API_BASE_URL must be the accepted https://cf-api.o1key.com endpoint.",
    );
  }

  const serialized = JSON.stringify(runtime);
  if (
    serialized.includes("goodgood-local-only") ||
    serialized.includes("REPLACE_ME") ||
    serialized.includes(".example.invalid") ||
    /:\/\/replace[.-]/i.test(serialized)
  ) {
    throw new Error("Local or template placeholder values are forbidden in staging.");
  }

  return Object.freeze({
    authIssuer: auth.issuer,
    authRedirectUri: auth.redirectUri,
    generationProvider: "o1key",
    objectStorageProvider: "r2",
    publicObjectStorageOrigin: publicStorageEndpoint.origin,
  });
}

export function parseEnvironmentFile(contents, sourceName = "environment file") {
  const environment = {};
  for (const [index, rawLine] of contents.replace(/^\uFEFF/, "").split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) {
      throw new Error(`${sourceName}:${index + 1} is not a KEY=value entry.`);
    }
    const [, name, rawValue] = match;
    if (Object.hasOwn(environment, name)) {
      throw new Error(`${sourceName}:${index + 1} duplicates ${name}.`);
    }
    let value = rawValue.trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    environment[name] = value;
  }
  return Object.freeze(environment);
}

export function readEnvironmentFile(filePath) {
  return parseEnvironmentFile(readFileSync(filePath, "utf8"), filePath);
}

export function runtimeEnvironmentForHost(release, runtime) {
  return Object.freeze({
    ...runtime,
    GOODGOOD_AUTH_CLIENT_SECRET_FILE:
      release.GOODGOOD_AUTH_CLIENT_SECRET_SOURCE_FILE,
    GENERATION_API_KEY_FILE:
      release.GOODGOOD_GENERATION_API_KEY_SOURCE_FILE,
    OBJECT_STORAGE_ACCESS_KEY_ID_FILE:
      release.GOODGOOD_OBJECT_STORAGE_ACCESS_KEY_ID_SOURCE_FILE,
    OBJECT_STORAGE_SECRET_ACCESS_KEY_FILE:
      release.GOODGOOD_OBJECT_STORAGE_SECRET_ACCESS_KEY_SOURCE_FILE,
  });
}

export function runStagingPreflight({
  releaseEnvironment,
  runtimeEnvironment,
  runtimeFilePath,
}) {
  const checks = [];
  let release;
  try {
    release = validateRelease(releaseEnvironment, runtimeFilePath);
    checks.push(
      check(
        "release-identity",
        "pass",
        "Image digest and CI release metadata have valid immutable forms.",
      ),
    );
  } catch (error) {
    checks.push(
      check(
        "release-identity",
        "fail",
        error instanceof Error ? error.message : "Release identity is invalid.",
      ),
    );
  }

  let runtime;
  if (release) {
    try {
      runtime = validateRuntime(releaseEnvironment, runtimeEnvironment);
      checks.push(
        check(
          "runtime-configuration",
          "pass",
          "Production auth, storage, queue, provider, and payment boundaries are configured safely.",
        ),
      );
    } catch (error) {
      checks.push(
        check(
          "runtime-configuration",
          "fail",
          error instanceof Error
            ? error.message
            : "Runtime configuration is invalid or unsafe.",
        ),
      );
    }
  } else {
    checks.push(
      check(
        "runtime-configuration",
        "blocked",
        "Runtime checks require a valid release identity and mounted-secret mapping.",
      ),
    );
  }

  const ok = checks.every((item) => item.status === "pass");
  return Object.freeze({
    checks: Object.freeze(checks),
    configuration:
      ok && release && runtime
        ? Object.freeze({ ...release, ...runtime })
        : null,
    ok,
    schemaVersion: 1,
  });
}
