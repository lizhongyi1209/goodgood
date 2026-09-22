import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("GG095 starts the primary workspace with email OTP and no local account preset", async () => {
  const launcher = await readFile(
    new URL("../scripts/local-checkpoint.mjs", import.meta.url),
    "utf8",
  );

  assert.match(
    launcher,
    /const emailWeb = mode === "workspace" \|\| mode === "login"/,
  );
  assert.match(
    launcher,
    /const envFile = emailWeb \? "\.env\.login-review" : "\.env\.local-review"/,
  );
  assert.match(launcher, /GOODGOOD_AUTH_MODE, "email_otp"/);
  assert.match(launcher, /GOODGOOD_ALLOW_LOCAL_AUTH, "false"/);
  assert.match(
    launcher,
    /GOODGOOD_AUTH_COOKIE_NAME:[\s\S]*?"goodgood_workspace_email_session"/,
  );
  assert.match(
    launcher,
    /GOODGOOD_AUTH_PUBLIC_ORIGIN: "http:\/\/127\.0\.0\.1:" \+ port/,
  );
  assert.match(launcher, /GOODGOOD_LOCAL_AUTH_DEFAULT_TOKEN: ""/);
  assert.match(launcher, /GOODGOOD_LOCAL_AUTH_TOKENS: ""/);
});

test("GG095 workspace start keeps object storage CORS on the served origin", async () => {
  const launcher = await readFile(
    new URL("../scripts/local-checkpoint.mjs", import.meta.url),
    "utf8",
  );

  // Verify mode never rewrites the bucket rule, so a stale origin silently
  // fails every browser upload preflight; the local launcher must manage it.
  assert.match(launcher, /OBJECT_STORAGE_PROVISIONING_MODE: "manage"/);
  assert.match(
    launcher,
    /const webOrigins = \[[\s\S]*?`http:\/\/127\.0\.0\.1:\$\{port\}`[\s\S]*?`http:\/\/localhost:\$\{port\}`[\s\S]*?\]\.join\(","\)/,
  );
  assert.match(launcher, /OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS: webOrigins/);
});

test("every local development role uses the real provider and keeps its token outside the repo", async () => {
  const [launcher, secretHelper] = await Promise.all([
    readFile(new URL("../scripts/local-checkpoint.mjs", import.meta.url), "utf8"),
    readFile(new URL("../scripts/local-provider-secret.mjs", import.meta.url), "utf8"),
  ]);

  // Runnable development roles have no mock opt-out. Deterministic mocks are
  // reserved for separately named automated-test stacks.
  assert.match(launcher, /GENERATION_PROVIDER_KIND: "o1key"/);
  assert.match(launcher, /GENERATION_API_BASE_URL: "https:\/\/cf-api\.o1key\.com"/);
  assert.doesNotMatch(launcher, /GENERATION_PROVIDER_KIND: "mock"/);
  assert.doesNotMatch(launcher, /LOCAL_GENERATION_API_BASE_URL/);
  assert.doesNotMatch(launcher, /LOCAL_GENERATION_PROVIDER_KIND/);
  assert.doesNotMatch(launcher, /"provider"/);
  // The token must never sit inside the repository, whatever .gitignore says.
  assert.match(
    secretHelper,
    /The real provider token file must live outside the repository\./,
  );
  assert.match(
    launcher,
    /const providerFile = await resolveLocalProviderTokenFile\(/,
  );
  assert.match(launcher, /GENERATION_API_KEY_FILE: providerFile/);
  assert.doesNotMatch(launcher, /GENERATION_API_KEY: environment\./);
  // An operator must never have to guess which provider a running stack calls.
  assert.match(launcher, /LOCAL WORKER -> REAL O1KEY PROVIDER/);
});
