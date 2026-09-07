import { readFileSync } from "node:fs";

const EXPECTED_SECRET_FILES = Object.freeze({
  authingAccessKeyId:
    "/run/secrets/goodgood_account_deletion_authing_access_key_id",
  authingAccessKeySecret:
    "/run/secrets/goodgood_account_deletion_authing_access_key_secret",
  objectStorageAccessKeyId:
    "/run/secrets/goodgood_object_storage_access_key_id",
  objectStorageSecretAccessKey:
    "/run/secrets/goodgood_object_storage_secret_access_key",
});

function required(environment, name) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function rejectInlineSecret(environment, name) {
  if (environment[name]?.trim()) {
    throw new Error(`${name} is forbidden for the production deletion runtime.`);
  }
}

function safeSecret(value, fileVariable) {
  const secret = value.trim();
  if (
    secret.length < 1 ||
    secret.length > 500 ||
    /[\u0000-\u001f\u007f]/.test(secret)
  ) {
    throw new Error(`${fileVariable} contains an invalid secret.`);
  }
  return secret;
}

function secretFromExactFile(
  environment,
  fileVariable,
  expectedPath,
  readFile,
) {
  const path = required(environment, fileVariable);
  if (path !== expectedPath) {
    throw new Error(`${fileVariable} must use the reviewed container secret path.`);
  }
  let contents;
  try {
    contents = readFile(path, "utf8");
  } catch {
    throw new Error(`${fileVariable} could not be read.`);
  }
  return safeSecret(String(contents), fileVariable);
}

function productionDatabaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_URL must be a valid production PostgreSQL URL.");
  }
  if (
    url.protocol !== "postgresql:" ||
    !url.username ||
    !url.password ||
    url.hostname !== "postgres" ||
    (url.port && url.port !== "5432") ||
    url.pathname !== "/goodgood" ||
    url.search ||
    url.hash
  ) {
    throw new Error("DATABASE_URL must target the production state database.");
  }
  return value;
}

function productionIssuer(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("GOODGOOD_AUTH_ISSUER must be a valid HTTPS URL.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/oidc" ||
    url.search ||
    url.hash ||
    url.toString() !== value
  ) {
    throw new Error("GOODGOOD_AUTH_ISSUER must be the exact production OIDC issuer.");
  }
  return value;
}

function productionR2Endpoint(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("OBJECT_STORAGE_ENDPOINT must be a valid HTTPS R2 origin.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    !/^[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/.test(url.hostname)
  ) {
    throw new Error("OBJECT_STORAGE_ENDPOINT must be the production R2 origin.");
  }
  return url.origin;
}

function requireExact(environment, name, expected) {
  if (required(environment, name) !== expected) {
    throw new Error(`${name} must be ${expected}.`);
  }
  return expected;
}

export function loadAccountDeletionRuntimeConfig(
  environment = process.env,
  { readFile = readFileSync } = {},
) {
  if (environment.NODE_ENV !== "production") {
    throw new Error("The account deletion runtime is production-only.");
  }
  if (typeof readFile !== "function") {
    throw new Error("readFile must be a function.");
  }

  rejectInlineSecret(
    environment,
    "GOODGOOD_ACCOUNT_DELETION_AUTHING_ACCESS_KEY_ID",
  );
  rejectInlineSecret(
    environment,
    "GOODGOOD_ACCOUNT_DELETION_AUTHING_ACCESS_KEY_SECRET",
  );
  rejectInlineSecret(environment, "OBJECT_STORAGE_ACCESS_KEY_ID");
  rejectInlineSecret(environment, "OBJECT_STORAGE_SECRET_ACCESS_KEY");

  const accessKeyId = secretFromExactFile(
    environment,
    "GOODGOOD_ACCOUNT_DELETION_AUTHING_ACCESS_KEY_ID_FILE",
    EXPECTED_SECRET_FILES.authingAccessKeyId,
    readFile,
  );
  const accessKeySecret = secretFromExactFile(
    environment,
    "GOODGOOD_ACCOUNT_DELETION_AUTHING_ACCESS_KEY_SECRET_FILE",
    EXPECTED_SECRET_FILES.authingAccessKeySecret,
    readFile,
  );
  const objectStorageAccessKeyId = secretFromExactFile(
    environment,
    "OBJECT_STORAGE_ACCESS_KEY_ID_FILE",
    EXPECTED_SECRET_FILES.objectStorageAccessKeyId,
    readFile,
  );
  const objectStorageSecretAccessKey = secretFromExactFile(
    environment,
    "OBJECT_STORAGE_SECRET_ACCESS_KEY_FILE",
    EXPECTED_SECRET_FILES.objectStorageSecretAccessKey,
    readFile,
  );

  return Object.freeze({
    databaseUrl: productionDatabaseUrl(required(environment, "DATABASE_URL")),
    identity: Object.freeze({
      accessKeyId,
      accessKeySecret,
      expectedIssuer: productionIssuer(
        required(environment, "GOODGOOD_AUTH_ISSUER"),
      ),
    }),
    objectStorage: Object.freeze({
      accessKeyId: objectStorageAccessKeyId,
      bucket: requireExact(environment, "OBJECT_STORAGE_BUCKET", "goodgood"),
      endpoint: productionR2Endpoint(
        required(environment, "OBJECT_STORAGE_ENDPOINT"),
      ),
      forcePathStyle: requireExact(
        environment,
        "OBJECT_STORAGE_FORCE_PATH_STYLE",
        "true",
      ) === "true",
      provisioningMode: requireExact(
        environment,
        "OBJECT_STORAGE_PROVISIONING_MODE",
        "verify",
      ),
      region: requireExact(environment, "OBJECT_STORAGE_REGION", "auto"),
      secretAccessKey: objectStorageSecretAccessKey,
    }),
  });
}

export const ACCOUNT_DELETION_RUNTIME_SECRET_FILES = EXPECTED_SECRET_FILES;
