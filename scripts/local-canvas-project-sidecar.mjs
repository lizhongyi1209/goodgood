import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { resolveLocalProviderTokenFile } from "./local-provider-secret.mjs";

// Development-only companion for the live 5173 workspace. The verified 32131
// checkpoint continues to serve every API except canvas project documents.
const root = fileURLToPath(new URL("../", import.meta.url));
assert.equal(process.argv.length, 2, "Run with --env-file=.env.login-review.");
const database = new URL(process.env.DATABASE_URL ?? "");
assert.equal(database.hostname, "127.0.0.1");
assert.equal(database.port, "54449");
assert.equal(database.pathname, "/goodgood");
assert.equal(process.env.REDIS_URL, "redis://127.0.0.1:56449/0");
assert.equal(process.env.OBJECT_STORAGE_ENDPOINT, "http://127.0.0.1:58049");
assert.equal(process.env.OBJECT_STORAGE_PUBLIC_ENDPOINT, "http://127.0.0.1:58049");
assert.equal(process.env.OBJECT_STORAGE_BUCKET, "goodgood-gg052-local");
assert.equal(process.env.GOODGOOD_AUTH_MODE, "email_otp");
assert.equal(process.env.GOODGOOD_ALLOW_LOCAL_AUTH, "false");
assert.equal(process.env.GOODGOOD_EMAIL_SMTP_HOST, "127.0.0.1");
assert.equal(process.env.GOODGOOD_EMAIL_SMTP_PORT, "58046");

const providerFile = await resolveLocalProviderTokenFile({ repositoryRoot: root });
Object.assign(process.env, {
  NODE_ENV: "development",
  HOST: "127.0.0.1",
  PORT: "32132",
  GOODGOOD_REVISION: "development-gg182-unverified",
  GOODGOOD_PROCESS: "web",
  GOODGOOD_AUTH_COOKIE_NAME: "goodgood_workspace_email_session",
  GOODGOOD_AUTH_PUBLIC_ORIGIN: "http://127.0.0.1:32132",
  GOODGOOD_LOCAL_AUTH_DEFAULT_TOKEN: "",
  GOODGOOD_LOCAL_AUTH_TOKENS: "",
  GOODGOOD_LOCAL_DEVELOPMENT_RUNTIME: "true",
  GOODGOOD_CANVAS_PROJECT_ONLY: "true",
  REDIS_URL: "redis://127.0.0.1:56549/0",
  GENERATION_PROVIDER_KIND: "o1key",
  GENERATION_API_BASE_URL: "https://cf-api.o1key.com",
  GENERATION_API_KEY: "",
  GENERATION_API_KEY_FILE: providerFile,
  GENERATION_PROVIDER_ALLOW_INSECURE_LOOPBACK: "false",
  OBJECT_STORAGE_PROVISIONING_MODE: "verify",
});

console.log("Starting unverified development canvas-project API on 127.0.0.1:32132; no Worker is started.");
await import("../server/runtime/web.mjs");
