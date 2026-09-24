import { lstatSync, readFileSync } from "node:fs";
import path from "node:path";
import { loadAuthenticationConfig } from "../server/auth/config.mjs";
import { runAuthenticationPreflight } from "../server/auth/preflight.mjs";
import { loadGenerationConfig } from "../server/generation/config.mjs";
import {
  isSafeProductionEvidenceReference,
} from "./production-readiness-contract.mjs";
import {
  EMAIL_OTP_SECRET_PATH,
  EMAIL_SMTP_PASSWORD_PATH,
  STAGING_AUTH_SECRET_PATH,
  STAGING_GENERATION_SECRET_PATH,
  STAGING_OBJECT_STORAGE_ACCESS_KEY_PATH,
  STAGING_OBJECT_STORAGE_SECRET_KEY_PATH,
  runtimeEnvironmentForHost,
} from "./staging-contract.mjs";

export const PRODUCTION_PREFLIGHT_SCHEMA_VERSION = 1;

const RELEASE_VARIABLES = Object.freeze([
  "GOODGOOD_RELEASE_IMAGE",
  "GOODGOOD_RELEASE_REVISION",
  "GOODGOOD_RELEASE_MIGRATION",
  "GOODGOOD_RUNTIME_CONFIG_VERSION",
  "GOODGOOD_RUNTIME_ENV_FILE",
  "GOODGOOD_PRODUCTION_ORIGIN",
  "GOODGOOD_AUTH_CLIENT_SECRET_SOURCE_FILE",
  "GOODGOOD_EMAIL_OTP_SECRET_SOURCE_FILE",
  "GOODGOOD_EMAIL_SMTP_PASSWORD_SOURCE_FILE",
  "GOODGOOD_GENERATION_API_KEY_SOURCE_FILE",
  "GOODGOOD_OBJECT_STORAGE_ACCESS_KEY_ID_SOURCE_FILE",
  "GOODGOOD_OBJECT_STORAGE_SECRET_ACCESS_KEY_SOURCE_FILE",
  "GOODGOOD_OSS_ACCESS_KEY_ID_SOURCE_FILE",
  "GOODGOOD_OSS_SECRET_ACCESS_KEY_SOURCE_FILE",
  "GOODGOOD_ASSET_READ_SECRET_SOURCE_FILE",
  "GOODGOOD_PRODUCTION_SECRET_GID",
]);

const SOURCE_SECRET_NAMES = Object.freeze([
  "GOODGOOD_AUTH_CLIENT_SECRET_SOURCE_FILE",
  "GOODGOOD_EMAIL_OTP_SECRET_SOURCE_FILE",
  "GOODGOOD_EMAIL_SMTP_PASSWORD_SOURCE_FILE",
  "GOODGOOD_GENERATION_API_KEY_SOURCE_FILE",
  "GOODGOOD_OBJECT_STORAGE_ACCESS_KEY_ID_SOURCE_FILE",
  "GOODGOOD_OBJECT_STORAGE_SECRET_ACCESS_KEY_SOURCE_FILE",
  "GOODGOOD_OSS_ACCESS_KEY_ID_SOURCE_FILE",
  "GOODGOOD_OSS_SECRET_ACCESS_KEY_SOURCE_FILE",
  "GOODGOOD_ASSET_READ_SECRET_SOURCE_FILE",
]);

const SECRET_SOURCE_FILENAMES = Object.freeze({
  GOODGOOD_AUTH_CLIENT_SECRET_SOURCE_FILE: "auth-client-secret",
  GOODGOOD_EMAIL_OTP_SECRET_SOURCE_FILE: "email-otp-secret",
  GOODGOOD_EMAIL_SMTP_PASSWORD_SOURCE_FILE: "email-smtp-password",
  GOODGOOD_GENERATION_API_KEY_SOURCE_FILE: "o1key-api-key",
  GOODGOOD_OBJECT_STORAGE_ACCESS_KEY_ID_SOURCE_FILE: "r2-access-key-id",
  GOODGOOD_OBJECT_STORAGE_SECRET_ACCESS_KEY_SOURCE_FILE: "r2-secret-access-key",
  GOODGOOD_OSS_ACCESS_KEY_ID_SOURCE_FILE: "oss-access-key-id",
  GOODGOOD_OSS_SECRET_ACCESS_KEY_SOURCE_FILE: "oss-secret-access-key",
  GOODGOOD_ASSET_READ_SECRET_SOURCE_FILE: "asset-read-secret",
});

function check(id, status, detail) {
  return Object.freeze({ detail, id, status });
}

function required(environment, name) {
  const value = environment?.[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function parseUrl(value, name, protocols, { allowCredentials = false } = {}) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute URL.`);
  }
  if (!protocols.includes(url.protocol)) {
    throw new Error(`${name} must use ${protocols.join(" or ")}.`);
  }
  if ((!allowCredentials && (url.username || url.password)) || url.hash) {
    throw new Error(`${name} must not contain credentials or a fragment.`);
  }
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

function productionOrigin(value) {
  const url = parseUrl(value, "GOODGOOD_PRODUCTION_ORIGIN", ["https:"]);
  if (
    isLoopback(url.hostname) ||
    url.port ||
    !["", "/"].includes(url.pathname) ||
    url.search
  ) {
    throw new Error(
      "GOODGOOD_PRODUCTION_ORIGIN must be one exact non-loopback HTTPS origin without a port, path, or query.",
    );
  }
  return url.origin;
}

function positiveGroupId(environment) {
  const rawValue = required(environment, "GOODGOOD_PRODUCTION_SECRET_GID");
  if (!/^[1-9]\d*$/.test(rawValue)) {
    throw new Error("GOODGOOD_PRODUCTION_SECRET_GID must be a positive numeric GID.");
  }
  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value > 2_147_483_647) {
    throw new Error("GOODGOOD_PRODUCTION_SECRET_GID must be a valid Linux GID.");
  }
  return value;
}

function validateRelease(releaseEnvironment, runtimeFilePath, productionRoot) {
  if (!path.isAbsolute(productionRoot)) {
    throw new Error("The production configuration root must be absolute.");
  }
  const image = required(releaseEnvironment, "GOODGOOD_RELEASE_IMAGE");
  if (
    !/^ghcr\.io\/lizhongyi1209\/goodgood@sha256:[a-f0-9]{64}$/.test(image)
  ) {
    throw new Error(
      "GOODGOOD_RELEASE_IMAGE must pin the GoodGood GHCR image by sha256 digest.",
    );
  }
  const revision = required(releaseEnvironment, "GOODGOOD_RELEASE_REVISION");
  if (!/^[a-f0-9]{40}$/.test(revision)) {
    throw new Error("GOODGOOD_RELEASE_REVISION must be a full lowercase Git SHA.");
  }
  const migration = required(releaseEnvironment, "GOODGOOD_RELEASE_MIGRATION");
  if (!/^\d{4}_[a-z0-9_]+\.sql$/.test(migration)) {
    throw new Error("GOODGOOD_RELEASE_MIGRATION must be a versioned SQL filename.");
  }
  const runtimeConfigVersion = required(
    releaseEnvironment,
    "GOODGOOD_RUNTIME_CONFIG_VERSION",
  );
  if (!/^[a-f0-9]{64}$/.test(runtimeConfigVersion)) {
    throw new Error(
      "GOODGOOD_RUNTIME_CONFIG_VERSION must be the CI-recorded sha256 checksum.",
    );
  }
  const configuredRuntimeFile = required(
    releaseEnvironment,
    "GOODGOOD_RUNTIME_ENV_FILE",
  );
  const expectedRuntimeFile = path.resolve(productionRoot, "runtime.env");
  if (
    !path.isAbsolute(configuredRuntimeFile) ||
    path.resolve(configuredRuntimeFile) !== path.resolve(runtimeFilePath) ||
    path.resolve(configuredRuntimeFile) !== expectedRuntimeFile
  ) {
    throw new Error(
      "GOODGOOD_RUNTIME_ENV_FILE must be the production root runtime.env supplied to preflight.",
    );
  }

  const secretSourcePaths = SOURCE_SECRET_NAMES.map((name) =>
    required(releaseEnvironment, name),
  );
  if (secretSourcePaths.some((filePath) => !path.isAbsolute(filePath))) {
    throw new Error("Every production secret source must use an absolute host path.");
  }
  for (const name of SOURCE_SECRET_NAMES) {
    const expected = path.resolve(
      productionRoot,
      "secrets",
      SECRET_SOURCE_FILENAMES[name],
    );
    if (path.resolve(releaseEnvironment[name]) !== expected) {
      throw new Error(
        `${name} must use its fixed file under the production secrets directory.`,
      );
    }
  }
  if (
    new Set(secretSourcePaths.map((filePath) => path.resolve(filePath))).size !==
    SOURCE_SECRET_NAMES.length
  ) {
    throw new Error("Every production credential must use a distinct source file.");
  }

  return Object.freeze({
    image,
    migration,
    origin: productionOrigin(
      required(releaseEnvironment, "GOODGOOD_PRODUCTION_ORIGIN"),
    ),
    revision,
    runtimeConfigVersion,
    secretGroupId: positiveGroupId(releaseEnvironment),
    secretSourcePaths: Object.freeze(secretSourcePaths),
  });
}

function validateRepositoryEvidence(release, repositoryEvidence) {
  if (!repositoryEvidence || repositoryEvidence.clean !== true) {
    throw new Error("The production preflight repository must be clean.");
  }
  if (
    repositoryEvidence.imageName !== "ghcr.io/lizhongyi1209/goodgood" ||
    !release.image.startsWith(`${repositoryEvidence.imageName}@sha256:`) ||
    repositoryEvidence.revision !== release.revision ||
    repositoryEvidence.migrationVersion !== release.migration ||
    repositoryEvidence.runtimeConfigVersion !== release.runtimeConfigVersion
  ) {
    throw new Error(
      "Release identity must match the clean checked-out source and derived runtime contract.",
    );
  }
}

function validateImageLabels(release, imageLabels) {
  if (
    !imageLabels ||
    imageLabels["org.opencontainers.image.revision"] !== release.revision ||
    imageLabels["com.goodgood.migration.version"] !== release.migration ||
    imageLabels["com.goodgood.runtime-config.version"] !==
      release.runtimeConfigVersion
  ) {
    throw new Error(
      "Candidate image labels must match the release revision, migration, and runtime contract.",
    );
  }
}

function validateHostFile(
  filePath,
  name,
  { expectedGid, expectedMode, lstatImpl, maximumBytes },
) {
  if (!path.isAbsolute(filePath)) {
    throw new Error(`${name} must use an absolute host path.`);
  }
  let stats;
  try {
    stats = lstatImpl(filePath);
  } catch {
    throw new Error(`${name} must reference a readable regular file.`);
  }
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new Error(`${name} must reference a regular file, not a symlink.`);
  }
  if ((stats.mode & 0o777) !== expectedMode || stats.uid !== 0 || stats.gid !== expectedGid) {
    throw new Error(
      `${name} must use the documented root ownership, group, and mode.`,
    );
  }
  if (!Number.isSafeInteger(stats.size) || stats.size <= 0 || stats.size > maximumBytes) {
    throw new Error(`${name} has an invalid or excessive file size.`);
  }
  let contents;
  try {
    contents = readFileSync(filePath, "utf8").trim();
  } catch {
    throw new Error(`${name} must be readable by the preflight process.`);
  }
  if (!contents) throw new Error(`${name} must not be empty.`);
}

function validateHostFiles({
  lstatImpl,
  release,
  releaseEnvironment = {},
  releaseFilePath,
  productionRoot,
  runtimeFilePath,
}) {
  if (path.resolve(releaseFilePath) !== path.resolve(productionRoot, "release.env")) {
    throw new Error("The release file must be production root release.env.");
  }
  validateHostFile(releaseFilePath, "release file", {
    expectedGid: 0,
    expectedMode: 0o600,
    lstatImpl,
    maximumBytes: 64 * 1024,
  });
  validateHostFile(runtimeFilePath, "runtime environment file", {
    expectedGid: 0,
    expectedMode: 0o600,
    lstatImpl,
    maximumBytes: 64 * 1024,
  });
  for (const name of SOURCE_SECRET_NAMES) {
    validateHostFile(releaseEnvironment[name], name, {
      expectedGid: release.secretGroupId,
      expectedMode: 0o640,
      lstatImpl,
      maximumBytes: 4 * 1024,
    });
  }
}

function validateRuntime(release, releaseEnvironment, runtime) {
  if (runtime.NODE_ENV !== "production") {
    throw new Error("NODE_ENV must be production.");
  }
  if (Object.hasOwn(runtime, "GOODGOOD_REVISION")) {
    throw new Error("GOODGOOD_REVISION must come only from the immutable image.");
  }
  for (const name of RELEASE_VARIABLES) {
    if (Object.hasOwn(runtime, name)) {
      throw new Error(`${name} belongs in the release file, not runtime.env.`);
    }
  }
  if (!["email_otp", "oidc"].includes(runtime.GOODGOOD_AUTH_MODE)) {
    throw new Error("GOODGOOD_AUTH_MODE must be email_otp or oidc in production.");
  }
  if (
    (runtime.GOODGOOD_ALLOW_LOCAL_AUTH &&
      runtime.GOODGOOD_ALLOW_LOCAL_AUTH !== "false") ||
    runtime.GOODGOOD_LOCAL_AUTH_TOKENS ||
    runtime.GOODGOOD_LOCAL_AUTH_DEFAULT_TOKEN
  ) {
    throw new Error("Local authentication is forbidden in production.");
  }
  if (
    runtime.GOODGOOD_AUTH_CLIENT_SECRET ||
    runtime.GOODGOOD_EMAIL_OTP_SECRET ||
    runtime.GOODGOOD_EMAIL_SMTP_PASSWORD ||
    runtime.GENERATION_API_KEY ||
    runtime.OBJECT_STORAGE_ACCESS_KEY_ID ||
    runtime.OBJECT_STORAGE_SECRET_ACCESS_KEY ||
    runtime.LEGACY_R2_ACCESS_KEY_ID ||
    runtime.LEGACY_R2_SECRET_ACCESS_KEY ||
    runtime.OBJECT_STORAGE_ASSET_READ_SECRET
  ) {
    throw new Error("Application and object-storage credentials must be file-backed.");
  }
  if (runtime.GOODGOOD_AUTH_MODE === "oidc") {
    if (runtime.GOODGOOD_AUTH_CLIENT_SECRET_FILE !== STAGING_AUTH_SECRET_PATH) {
      throw new Error("GOODGOOD_AUTH_CLIENT_SECRET_FILE must use the fixed container secret path.");
    }
    if (
      runtime.GOODGOOD_EMAIL_OTP_SECRET_FILE ||
      runtime.GOODGOOD_EMAIL_SMTP_PASSWORD_FILE
    ) {
      throw new Error("Email authentication secret paths must be absent in OIDC mode.");
    }
  } else {
    if (runtime.GOODGOOD_AUTH_CLIENT_SECRET_FILE) {
      throw new Error("The Authing client secret path must be absent in email mode.");
    }
    if (
      runtime.GOODGOOD_EMAIL_OTP_SECRET_FILE !== EMAIL_OTP_SECRET_PATH ||
      runtime.GOODGOOD_EMAIL_SMTP_PASSWORD_FILE !== EMAIL_SMTP_PASSWORD_PATH
    ) {
      throw new Error("Email authentication secrets must use the fixed container paths.");
    }
  }
  if (runtime.GENERATION_API_KEY_FILE !== STAGING_GENERATION_SECRET_PATH) {
    throw new Error("GENERATION_API_KEY_FILE must use the fixed container secret path.");
  }
  if (
    runtime.OBJECT_STORAGE_ACCESS_KEY_ID_FILE !== "/run/secrets/goodgood_oss_access_key_id" ||
    runtime.OBJECT_STORAGE_SECRET_ACCESS_KEY_FILE !== "/run/secrets/goodgood_oss_secret_access_key" ||
    runtime.OBJECT_STORAGE_ASSET_READ_SECRET_FILE !== "/run/secrets/goodgood_asset_read_secret" ||
    runtime.LEGACY_R2_ACCESS_KEY_ID_FILE !== STAGING_OBJECT_STORAGE_ACCESS_KEY_PATH ||
    runtime.LEGACY_R2_SECRET_ACCESS_KEY_FILE !== STAGING_OBJECT_STORAGE_SECRET_KEY_PATH
  ) {
    throw new Error("Object-storage credentials must use the fixed container secret paths.");
  }
  if (
    (runtime.GOODGOOD_FAKE_PAYMENT_ENABLED &&
      runtime.GOODGOOD_FAKE_PAYMENT_ENABLED !== "false") ||
    runtime.GOODGOOD_FAKE_PAYMENT_WEBHOOK_SECRET
  ) {
    throw new Error("The fake payment sandbox and its secret are forbidden in production.");
  }
  if (
    runtime.GENERATION_PROVIDER_KIND !== "o1key" ||
    runtime.GENERATION_API_BASE_URL !== "https://cf-api.o1key.com" ||
    (runtime.GENERATION_PROVIDER_ALLOW_INSECURE_LOOPBACK &&
      runtime.GENERATION_PROVIDER_ALLOW_INSECURE_LOOPBACK !== "false")
  ) {
    throw new Error("Production generation must use the accepted HTTPS O1Key route.");
  }
  if (
    runtime.OBJECT_STORAGE_PROVIDER_KIND !== "oss" ||
    runtime.OBJECT_STORAGE_REGION !== "cn-guangzhou" ||
    runtime.OBJECT_STORAGE_PROVISIONING_MODE !== "verify" ||
    runtime.OBJECT_STORAGE_FORCE_PATH_STYLE !== "false"
  ) {
    throw new Error("Production object storage must use private Guangzhou OSS verification mode.");
  }

  const database = parseUrl(
    required(runtime, "DATABASE_URL"),
    "DATABASE_URL",
    ["postgres:", "postgresql:"],
    { allowCredentials: true },
  );
  const redis = parseUrl(
    required(runtime, "REDIS_URL"),
    "REDIS_URL",
    ["redis:", "rediss:"],
    { allowCredentials: true },
  );
  if (isLoopback(database.hostname) || isLoopback(redis.hostname)) {
    throw new Error("Production database and queue URLs must not use host loopback.");
  }

  const storageEndpoint = parseUrl(
    required(runtime, "OBJECT_STORAGE_ENDPOINT"),
    "OBJECT_STORAGE_ENDPOINT",
    ["https:"],
  );
  const publicStorageEndpoint = parseUrl(
    required(runtime, "OBJECT_STORAGE_PUBLIC_ENDPOINT"),
    "OBJECT_STORAGE_PUBLIC_ENDPOINT",
    ["https:"],
  );
  if (
    storageEndpoint.origin !== "https://s3.oss-cn-guangzhou.aliyuncs.com" ||
    storageEndpoint.port ||
    publicStorageEndpoint.port ||
    publicStorageEndpoint.origin !== "https://upload-goodgood.o1key.cn" ||
    !["", "/"].includes(storageEndpoint.pathname) ||
    !["", "/"].includes(publicStorageEndpoint.pathname) ||
    storageEndpoint.search ||
    publicStorageEndpoint.search
  ) {
    throw new Error("OSS operations and signed browser uploads must use the accepted HTTPS endpoints.");
  }
  if (required(runtime, "OBJECT_STORAGE_BUCKET") !== "o1key-goodgood" ||
      required(runtime, "OBJECT_STORAGE_ASSET_READ_ORIGIN") !== "https://oss-goodgood.o1key.cn" ||
      required(runtime, "LEGACY_R2_BUCKET") !== "goodgood") {
    throw new Error("OSS read origin and current/legacy buckets must match the accepted cutover.");
  }
  const legacyEndpoint = parseUrl(required(runtime, "LEGACY_R2_ENDPOINT"),
    "LEGACY_R2_ENDPOINT", ["https:"]);
  if (!legacyEndpoint.hostname.endsWith(".r2.cloudflarestorage.com") ||
      legacyEndpoint.port || legacyEndpoint.pathname !== "/" ||
      legacyEndpoint.search) {
    throw new Error("Historical R2 reads must use the private R2 S3 API endpoint.");
  }

  const uploadOrigins = required(
    runtime,
    "OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS",
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (uploadOrigins.length !== 1 || uploadOrigins[0] !== release.origin) {
    throw new Error(
      "OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS must be exactly GOODGOOD_PRODUCTION_ORIGIN.",
    );
  }

  const hostRuntime = {
    ...runtimeEnvironmentForHost(releaseEnvironment, runtime),
    OBJECT_STORAGE_ACCESS_KEY_ID_FILE: releaseEnvironment.GOODGOOD_OSS_ACCESS_KEY_ID_SOURCE_FILE,
    OBJECT_STORAGE_SECRET_ACCESS_KEY_FILE: releaseEnvironment.GOODGOOD_OSS_SECRET_ACCESS_KEY_SOURCE_FILE,
    OBJECT_STORAGE_ASSET_READ_SECRET_FILE: releaseEnvironment.GOODGOOD_ASSET_READ_SECRET_SOURCE_FILE,
    LEGACY_R2_ACCESS_KEY_ID_FILE: releaseEnvironment.GOODGOOD_OBJECT_STORAGE_ACCESS_KEY_ID_SOURCE_FILE,
    LEGACY_R2_SECRET_ACCESS_KEY_FILE: releaseEnvironment.GOODGOOD_OBJECT_STORAGE_SECRET_ACCESS_KEY_SOURCE_FILE,
  };
  const auth = loadAuthenticationConfig(hostRuntime);
  loadGenerationConfig(hostRuntime);
  if (auth.mode === "oidc") {
    const authIssuer = parseUrl(auth.issuer, "GOODGOOD_AUTH_ISSUER", ["https:"]);
    if (
      isLoopback(authIssuer.hostname) ||
      !(
        authIssuer.hostname === "authing.cn" ||
        authIssuer.hostname.endsWith(".authing.cn")
      ) ||
      auth.redirectUri !== `${release.origin}/api/auth/callback`
    ) {
      throw new Error(
        "OIDC mode must use the accepted Authing issuer and exact production callback.",
      );
    }
  } else if (
    auth.publicOrigin !== release.origin ||
    !auth.sendingEnabled ||
    !auth.mail?.secure ||
    !auth.mail?.username ||
    !auth.mail?.password ||
    isLoopback(auth.mail.host)
  ) {
    throw new Error(
      "Email mode must use the exact production origin and authenticated implicit-TLS SMTP.",
    );
  }

  const serialized = JSON.stringify({ releaseEnvironment, runtime });
  if (
    /REPLACE(?:_|-)|\.example\.invalid|goodgood-local-only|:\/\/replace[.-]/i.test(
      serialized,
    )
  ) {
    throw new Error("Template, local, or placeholder values are forbidden in production.");
  }

  return Object.freeze({ hostRuntime });
}

function publicRelease(release) {
  return Object.freeze({
    image: release.image,
    migration: release.migration,
    revision: release.revision,
    runtimeConfigVersion: release.runtimeConfigVersion,
  });
}

export async function runProductionPreflight({
  checkedAt = () => new Date(),
  evidenceReference,
  fetchImpl = fetch,
  imageLabels,
  lstatImpl = lstatSync,
  platform = process.platform,
  productionRoot = "/etc/goodgood/production",
  releaseEnvironment = {},
  releaseFilePath,
  repositoryEvidence,
  runtimeEnvironment = {},
  runtimeFilePath,
  smtpTransportFactory,
}) {
  const checks = [];
  const linuxHost = platform === "linux";
  checks.push(
    check(
      "production-host",
      linuxHost ? "pass" : "fail",
      linuxHost
        ? "Production preflight is running on Linux."
        : "Production preflight must run on the Linux release host.",
    ),
  );

  let release;
  try {
    release = validateRelease(
      releaseEnvironment,
      runtimeFilePath,
      productionRoot,
    );
    checks.push(
      check(
        "release-identity",
        "pass",
        "The release uses an immutable digest and complete production metadata.",
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

  if (release) {
    try {
      validateRepositoryEvidence(release, repositoryEvidence);
      checks.push(
        check(
          "source-identity",
          "pass",
          "The clean checkout and derived contract match the release candidate.",
        ),
      );
    } catch (error) {
      checks.push(
        check(
          "source-identity",
          "fail",
          error instanceof Error ? error.message : "Source identity is invalid.",
        ),
      );
    }
    try {
      validateImageLabels(release, imageLabels);
      checks.push(
        check(
          "image-labels",
          "pass",
          "Candidate image labels match the exact release candidate.",
        ),
      );
    } catch (error) {
      checks.push(
        check(
          "image-labels",
          "fail",
          error instanceof Error ? error.message : "Image labels are invalid.",
        ),
      );
    }
  } else {
    checks.push(
      check("source-identity", "blocked", "Source checks require valid release metadata."),
      check("image-labels", "blocked", "Image checks require valid release metadata."),
    );
  }

  let hostFilesValid = false;
  if (linuxHost && release) {
    try {
      validateHostFiles({
        lstatImpl,
        release,
        releaseEnvironment,
        releaseFilePath,
        productionRoot,
        runtimeFilePath,
      });
      hostFilesValid = true;
      checks.push(
        check(
          "host-file-security",
          "pass",
          "Runtime and distinct credential files have accepted ownership and modes.",
        ),
      );
    } catch (error) {
      checks.push(
        check(
          "host-file-security",
          "fail",
          error instanceof Error ? error.message : "Host files are unsafe.",
        ),
      );
    }
  } else {
    checks.push(
      check(
        "host-file-security",
        "blocked",
        "Host-file checks require Linux and valid release metadata.",
      ),
    );
  }

  let runtime;
  if (release && hostFilesValid) {
    try {
      runtime = validateRuntime(release, releaseEnvironment, runtimeEnvironment);
      checks.push(
        check(
          "runtime-configuration",
          "pass",
          "Production auth, provider, storage, queue, and payment boundaries are safe.",
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
        "Runtime checks require valid Linux host files and release metadata.",
      ),
    );
  }

  if (runtime) {
    const authentication = await runAuthenticationPreflight({
      environment: runtime.hostRuntime,
      fetchImpl,
      smtpTransportFactory,
    });
    for (const item of authentication.checks) {
      checks.push(
        check(
          `authentication:${item.id}`,
          item.status === "warn" ? "fail" : item.status,
          item.detail,
        ),
      );
    }
  } else {
    checks.push(
      check(
        "authentication:network",
        "blocked",
        "Authentication network checks require a valid production runtime configuration.",
      ),
    );
  }

  if (!isSafeProductionEvidenceReference(evidenceReference)) {
    checks.push(
      check(
        "evidence-reference",
        "fail",
        "A short non-secret production evidence reference is required.",
      ),
    );
  } else {
    checks.push(
      check(
        "evidence-reference",
        "pass",
        "The evidence reference is safe to include in the report.",
      ),
    );
  }

  const ok = checks.every(({ status }) => status === "pass");
  let evidence = null;
  if (ok && release) {
    const timestamp = checkedAt();
    if (!(timestamp instanceof Date) || !Number.isFinite(timestamp.getTime())) {
      throw new Error("checkedAt must return a valid Date.");
    }
    evidence = Object.freeze({
      checkedAt: timestamp.toISOString(),
      id: "production-preflight",
      reference: evidenceReference,
      releaseRevision: release.revision,
      status: "pass",
    });
  }

  return Object.freeze({
    checks: Object.freeze(checks),
    evidence,
    ok,
    release: release ? publicRelease(release) : null,
    schemaVersion: PRODUCTION_PREFLIGHT_SCHEMA_VERSION,
  });
}
