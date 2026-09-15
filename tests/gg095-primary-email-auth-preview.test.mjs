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
