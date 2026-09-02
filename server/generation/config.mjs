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

function providerApiKey(environment) {
  const direct = environment.GENERATION_API_KEY?.trim();
  const file = environment.GENERATION_API_KEY_FILE?.trim();
  if (direct && file) {
    throw new Error(
      "GENERATION_API_KEY and GENERATION_API_KEY_FILE are mutually exclusive.",
    );
  }
  if (direct) return direct;
  if (!file) throw new Error("GENERATION_API_KEY or GENERATION_API_KEY_FILE is required.");
  let value;
  try {
    value = readFileSync(file, "utf8").trim();
  } catch {
    throw new Error("GENERATION_API_KEY_FILE could not be read.");
  }
  if (!value) throw new Error("GENERATION_API_KEY_FILE is empty.");
  return value;
}

export function loadGenerationConfig(environment = process.env) {
  const kind = providerKind(environment.GENERATION_PROVIDER_KIND);
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
      accessKeyId: required(environment, "OBJECT_STORAGE_ACCESS_KEY_ID"),
      bucket: required(environment, "OBJECT_STORAGE_BUCKET"),
      endpoint: required(environment, "OBJECT_STORAGE_ENDPOINT"),
      forcePathStyle: environment.OBJECT_STORAGE_FORCE_PATH_STYLE !== "false",
      uploadAllowedOrigins: commaSeparated(
        environment.OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS,
        "OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS",
      ),
      publicEndpoint:
        environment.OBJECT_STORAGE_PUBLIC_ENDPOINT ??
        required(environment, "OBJECT_STORAGE_ENDPOINT"),
      region: required(environment, "OBJECT_STORAGE_REGION"),
      secretAccessKey: required(
        environment,
        "OBJECT_STORAGE_SECRET_ACCESS_KEY",
      ),
    }),
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
      "OBJECT_STORAGE_ACCESS_KEY_ID",
      "OBJECT_STORAGE_SECRET_ACCESS_KEY",
      "OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS",
      "GENERATION_API_BASE_URL",
    ];
    if (!environment.GENERATION_API_KEY && !environment.GENERATION_API_KEY_FILE) {
      names.push("GENERATION_API_KEY or GENERATION_API_KEY_FILE");
    }
    return {
      configured: false,
      missing: names.filter(
        (name) => name.includes(" or ") || !environment[name],
      ),
    };
  }
}
