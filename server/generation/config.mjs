import { readFileSync } from "node:fs";

export const GENERATION_READY_QUEUE = "goodgood:generation:ready";
export const GENERATION_PROCESSING_QUEUE = "goodgood:generation:processing";

function required(environment, name) {
  const value = environment[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function positiveInteger(value, fallback, name) {
  const parsed = value === undefined ? fallback : Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

function commaSeparated(value, name) {
  const values = required({ [name]: value }, name)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!values.length) throw new Error(`${name} must contain at least one value.`);
  return values;
}

function providerKind(value) {
  const kind = value ?? "mock";
  if (kind !== "mock" && kind !== "o1key") {
    throw new Error("GENERATION_PROVIDER_KIND must be mock or o1key.");
  }
  return kind;
}

function objectStorageProvisioningMode(value) {
  const mode = value ?? "manage";
  if (mode !== "manage" && mode !== "verify") {
    throw new Error(
      "OBJECT_STORAGE_PROVISIONING_MODE must be manage or verify.",
    );
  }
  return mode;
}

function objectStorageProviderKind(value) {
  const kind = value ?? "r2";
  if (kind !== "r2" && kind !== "oss") {
    throw new Error("OBJECT_STORAGE_PROVIDER_KIND must be r2 or oss.");
  }
  return kind;
}

function httpsOrigin(value, name) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute HTTPS origin.`);
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port ||
      url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`${name} must be an HTTPS origin without path or query.`);
  }
  return url.origin;
}

function secretValue(environment, directName, fileName) {
  const direct = environment[directName]?.trim();
  const file = environment[fileName]?.trim();
  if (direct && file) {
    throw new Error(
      `${directName} and ${fileName} are mutually exclusive.`,
    );
  }
  if (direct) return direct;
  if (!file) throw new Error(`${directName} or ${fileName} is required.`);
  let value;
  try {
    value = readFileSync(file, "utf8").trim();
  } catch {
    throw new Error(`${fileName} could not be read.`);
  }
  if (!value) throw new Error(`${fileName} is empty.`);
  return value;
}

function providerApiKey(environment) {
  return secretValue(
    environment,
    "GENERATION_API_KEY",
    "GENERATION_API_KEY_FILE",
  );
}

export function loadGenerationConfig(environment = process.env) {
  const kind = providerKind(environment.GENERATION_PROVIDER_KIND);
  const storageKind = objectStorageProviderKind(
    environment.OBJECT_STORAGE_PROVIDER_KIND,
  );
  const legacyR2 = storageKind === "oss"
    ? Object.freeze({
        accessKeyId: secretValue(
          environment, "LEGACY_R2_ACCESS_KEY_ID", "LEGACY_R2_ACCESS_KEY_ID_FILE",
        ),
        bucket: required(environment, "LEGACY_R2_BUCKET"),
        endpoint: required(environment, "LEGACY_R2_ENDPOINT"),
        region: "auto",
        secretAccessKey: secretValue(
          environment, "LEGACY_R2_SECRET_ACCESS_KEY", "LEGACY_R2_SECRET_ACCESS_KEY_FILE",
        ),
      })
    : null;
  const ossReadOrigin = storageKind === "oss"
    ? httpsOrigin(
        required(environment, "OBJECT_STORAGE_ASSET_READ_ORIGIN"),
        "OBJECT_STORAGE_ASSET_READ_ORIGIN",
      )
    : null;
  const ossReadSecret = storageKind === "oss"
    ? secretValue(
        environment,
        "OBJECT_STORAGE_ASSET_READ_SECRET",
        "OBJECT_STORAGE_ASSET_READ_SECRET_FILE",
      )
    : null;
  if (storageKind === "oss") {
    if (ossReadSecret.length < 32) {
      throw new Error("OBJECT_STORAGE_ASSET_READ_SECRET must have at least 32 characters.");
    }
    if (environment.OBJECT_STORAGE_FORCE_PATH_STYLE !== "false" ||
        environment.OBJECT_STORAGE_PROVISIONING_MODE !== "verify") {
      throw new Error("OSS requires virtual-hosted addressing and verify-only provisioning.");
    }
    httpsOrigin(required(environment, "OBJECT_STORAGE_PUBLIC_ENDPOINT"),
      "OBJECT_STORAGE_PUBLIC_ENDPOINT");
  }
  const allowInsecureLoopback =
    environment.GENERATION_PROVIDER_ALLOW_INSECURE_LOOPBACK === "true";
  if (allowInsecureLoopback && environment.NODE_ENV === "production") {
    throw new Error(
      "GENERATION_PROVIDER_ALLOW_INSECURE_LOOPBACK is forbidden in production.",
    );
  }
  return Object.freeze({
    databaseUrl: required(environment, "DATABASE_URL"),
    redisUrl: required(environment, "REDIS_URL"),
    objectStorage: Object.freeze({
      accessKeyId: secretValue(
        environment,
        "OBJECT_STORAGE_ACCESS_KEY_ID",
        "OBJECT_STORAGE_ACCESS_KEY_ID_FILE",
      ),
      bucket: required(environment, "OBJECT_STORAGE_BUCKET"),
      providerKind: storageKind,
      endpoint: required(environment, "OBJECT_STORAGE_ENDPOINT"),
      forcePathStyle: environment.OBJECT_STORAGE_FORCE_PATH_STYLE !== "false",
      uploadAllowedOrigins: commaSeparated(
        environment.OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS,
        "OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS",
      ),
      publicEndpoint:
        environment.OBJECT_STORAGE_PUBLIC_ENDPOINT ??
        required(environment, "OBJECT_STORAGE_ENDPOINT"),
      provisioningMode: objectStorageProvisioningMode(
        environment.OBJECT_STORAGE_PROVISIONING_MODE,
      ),
      region: required(environment, "OBJECT_STORAGE_REGION"),
      secretAccessKey: secretValue(
        environment,
        "OBJECT_STORAGE_SECRET_ACCESS_KEY",
        "OBJECT_STORAGE_SECRET_ACCESS_KEY_FILE",
      ),
      assetReadOrigin: ossReadOrigin,
      assetReadSecret: ossReadSecret,
    }),
    legacyR2,
    provider: Object.freeze({
      allowInsecureLoopback,
      apiKey: providerApiKey(environment),
      baseUrl: required(environment, "GENERATION_API_BASE_URL"),
      kind,
      pollIntervalMs: positiveInteger(
        environment.GENERATION_POLL_INTERVAL_MS,
        250,
        "GENERATION_POLL_INTERVAL_MS",
      ),
      timeoutMs: positiveInteger(
        environment.GENERATION_POLL_TIMEOUT_MS,
        4_000,
        "GENERATION_POLL_TIMEOUT_MS",
      ),
      requestTimeoutMs: positiveInteger(
        environment.GENERATION_REQUEST_TIMEOUT_MS,
        15_000,
        "GENERATION_REQUEST_TIMEOUT_MS",
      ),
    }),
    workerLeaseMs: positiveInteger(
      environment.GENERATION_WORKER_LEASE_MS,
      15_000,
      "GENERATION_WORKER_LEASE_MS",
    ),
  });
}

export function inspectGenerationConfiguration(environment = process.env) {
  try {
    loadGenerationConfig(environment);
    return { configured: true, missing: [] };
  } catch {
    const names = [
      "DATABASE_URL",
      "REDIS_URL",
      "OBJECT_STORAGE_ENDPOINT",
      "OBJECT_STORAGE_BUCKET",
      "OBJECT_STORAGE_REGION",
      "OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS",
      "GENERATION_API_BASE_URL",
    ];
    if (
      !environment.OBJECT_STORAGE_ACCESS_KEY_ID &&
      !environment.OBJECT_STORAGE_ACCESS_KEY_ID_FILE
    ) {
      names.push(
        "OBJECT_STORAGE_ACCESS_KEY_ID or OBJECT_STORAGE_ACCESS_KEY_ID_FILE",
      );
    }
    if (
      !environment.OBJECT_STORAGE_SECRET_ACCESS_KEY &&
      !environment.OBJECT_STORAGE_SECRET_ACCESS_KEY_FILE
    ) {
      names.push(
        "OBJECT_STORAGE_SECRET_ACCESS_KEY or OBJECT_STORAGE_SECRET_ACCESS_KEY_FILE",
      );
    }
    if (!environment.GENERATION_API_KEY && !environment.GENERATION_API_KEY_FILE) {
      names.push("GENERATION_API_KEY or GENERATION_API_KEY_FILE");
    }
    if (environment.OBJECT_STORAGE_PROVIDER_KIND === "oss") {
      names.push(
        "OBJECT_STORAGE_PUBLIC_ENDPOINT",
        "OBJECT_STORAGE_ASSET_READ_ORIGIN",
        "LEGACY_R2_ENDPOINT",
        "LEGACY_R2_BUCKET",
      );
      if (!environment.OBJECT_STORAGE_ASSET_READ_SECRET &&
          !environment.OBJECT_STORAGE_ASSET_READ_SECRET_FILE) {
        names.push("OBJECT_STORAGE_ASSET_READ_SECRET or OBJECT_STORAGE_ASSET_READ_SECRET_FILE");
      }
      if (!environment.LEGACY_R2_ACCESS_KEY_ID &&
          !environment.LEGACY_R2_ACCESS_KEY_ID_FILE) {
        names.push("LEGACY_R2_ACCESS_KEY_ID or LEGACY_R2_ACCESS_KEY_ID_FILE");
      }
      if (!environment.LEGACY_R2_SECRET_ACCESS_KEY &&
          !environment.LEGACY_R2_SECRET_ACCESS_KEY_FILE) {
        names.push("LEGACY_R2_SECRET_ACCESS_KEY or LEGACY_R2_SECRET_ACCESS_KEY_FILE");
      }
    }
    return {
      configured: false,
      missing: names.filter(
        (name) => name.includes(" or ") || !environment[name],
      ),
    };
  }
}
