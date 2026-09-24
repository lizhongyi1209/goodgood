import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { resolveLocalProviderTokenFile } from "./local-provider-secret.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  assert.ok(args[index + 1], `${name} needs a value.`);
  return args[index + 1];
};
assert.ok(args.every((value, index) =>
  ["--env-file", "--port"].includes(value) ||
  (index > 0 && ["--env-file", "--port"].includes(args[index - 1]))
), "Expected --env-file and optional --port.");

const port = option("--port", "5173");
assert.match(port, /^\d{4,5}$/, "Port must be numeric.");
const envFile = path.resolve(option("--env-file", path.join(root, ".env.login-review")));
const environment = parseEnv(await readFile(envFile, "utf8"));
const database = new URL(environment.DATABASE_URL);
assert.equal(database.hostname, "127.0.0.1");
assert.equal(database.port, "54449");
assert.equal(database.pathname, "/goodgood");
assert.equal(environment.REDIS_URL, "redis://127.0.0.1:56449/0");
assert.equal(environment.OBJECT_STORAGE_ENDPOINT, "http://127.0.0.1:58049");
assert.equal(environment.OBJECT_STORAGE_PUBLIC_ENDPOINT, "http://127.0.0.1:58049");
assert.equal(environment.OBJECT_STORAGE_BUCKET, "goodgood-gg052-local");
assert.equal(environment.GOODGOOD_AUTH_MODE, "email_otp");
assert.equal(environment.GOODGOOD_ALLOW_LOCAL_AUTH, "false");
assert.equal(environment.GOODGOOD_EMAIL_SMTP_HOST, "127.0.0.1");
assert.equal(environment.GOODGOOD_EMAIL_SMTP_PORT, "58046");

const providerFile = await resolveLocalProviderTokenFile({ repositoryRoot: root });
let checkpoint;
try {
  const response = await fetch("http://127.0.0.1:32131/api/health/version", {
    signal: AbortSignal.timeout(3_000),
  });
  if (response.ok) checkpoint = await response.json();
} catch {
  // The verified local checkpoint must be started before the live UI server.
}
assert.equal(checkpoint?.build?.verified, true,
  "Start the verified local Web checkpoint on 127.0.0.1:32131 first.");
const origin = `http://127.0.0.1:${port}`;
const webOrigins = [
  origin,
  `http://localhost:${port}`,
  "http://127.0.0.1:32131",
  "http://localhost:32131",
].join(",");
const child = spawn(process.execPath, [path.join(root, "node_modules/vite/bin/vite.js"),
  "--host", "127.0.0.1", "--port", port, "--strictPort"], {
  cwd: root,
  env: {
    ...process.env,
    ...environment,
    NODE_ENV: "development",
    HOST: "127.0.0.1",
    PORT: port,
    GOODGOOD_AUTH_COOKIE_NAME: "goodgood_workspace_email_session",
    GOODGOOD_AUTH_PUBLIC_ORIGIN: origin,
    GOODGOOD_LOCAL_AUTH_DEFAULT_TOKEN: "",
    GOODGOOD_LOCAL_AUTH_TOKENS: "",
    GOODGOOD_LOCAL_DEVELOPMENT_RUNTIME: "true",
    GOODGOOD_LOCAL_LIVE_DEV: "true",
    GOODGOOD_LOCAL_SEEDANCE_PREVIEW: "true",
    GOODGOOD_LOCAL_SEEDANCE_API_KEY_FILE: providerFile,
    GENERATION_API_BASE_URL: "https://cf-api.o1key.com",
    GENERATION_API_KEY: "",
    GENERATION_API_KEY_FILE: providerFile,
    GENERATION_PROVIDER_KIND: "o1key",
    GENERATION_PROVIDER_ALLOW_INSECURE_LOOPBACK: "false",
    OBJECT_STORAGE_PROVISIONING_MODE: "manage",
    OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS: webOrigins,
    WORKER_HEALTH_HOST: "127.0.0.1",
    WORKER_HEALTH_PORT: "32142",
  },
  stdio: "inherit",
});
child.on("error", (error) => {
  console.error(`Local live development could not start: ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code) => { process.exitCode = code ?? 1; });
