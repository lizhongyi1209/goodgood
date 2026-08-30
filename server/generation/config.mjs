export const M3_TEST_USER_ID = "00000000-0000-4000-8000-000000000001";
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

export function loadGenerationConfig(environment = process.env) {
  return Object.freeze({
    databaseUrl: required(environment, "DATABASE_URL"),
    redisUrl: required(environment, "REDIS_URL"),
    objectStorage: Object.freeze({
      accessKeyId: required(environment, "OBJECT_STORAGE_ACCESS_KEY_ID"),
      bucket: required(environment, "OBJECT_STORAGE_BUCKET"),
      endpoint: required(environment, "OBJECT_STORAGE_ENDPOINT"),
      forcePathStyle: environment.OBJECT_STORAGE_FORCE_PATH_STYLE !== "false",
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
      apiKey: required(environment, "GENERATION_API_KEY"),
      baseUrl: required(environment, "GENERATION_API_BASE_URL"),
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
      "GENERATION_API_BASE_URL",
      "GENERATION_API_KEY",
    ];
    return {
      configured: false,
      missing: names.filter((name) => !environment[name]),
    };
  }
}
