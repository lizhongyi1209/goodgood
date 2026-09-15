import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

import { safeReturnTo } from "../server/auth/operations.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false, ws: false },
});

after(async () => {
  await vite.close();
});

test("GG-096 accepts only safe business return paths", async () => {
  const {
    authenticationEntryPath,
    safeAuthenticationReturnTo,
  } = await vite.ssrLoadModule(
    "/features/auth/authentication-navigation.ts",
  );

  assert.equal(
    safeAuthenticationReturnTo("/projects?view=recent#latest"),
    "/projects?view=recent#latest",
  );
  assert.equal(
    authenticationEntryPath("login", "/assets?mode=gallery"),
    "/login?returnTo=%2Fassets%3Fmode%3Dgallery",
  );
  assert.equal(
    authenticationEntryPath("register", "/create"),
    "/register?returnTo=%2Fcreate",
  );

  for (const unsafe of [
    null,
    "",
    "https://outside.example/create",
    "//outside.example/create",
    "/\\outside.example",
    "/%5coutside.example",
    "/login",
    "/login/",
    "/register?returnTo=/create",
    "/%2Fregister",
    "/create\r\nInjected:value",
  ]) {
    assert.equal(safeAuthenticationReturnTo(unsafe), "/create");
  }

  for (const loop of ["/login", "/login/", "/register?next=/create", "/%2Fregister"]) {
    assert.throws(
      () => safeReturnTo(loop),
      (error) => error.code === "AUTH_RETURN_TO_INVALID",
    );
  }
});

test("GG-096 exposes dedicated login and registration pages", async () => {
  const [loginPage, registerPage, entryPage] = await Promise.all([
    readFile(path.join(root, "app/login/page.tsx"), "utf8"),
    readFile(path.join(root, "app/register/page.tsx"), "utf8"),
    readFile(
      path.join(root, "features/auth/authentication-entry-page.tsx"),
      "utf8",
    ),
  ]);

  assert.match(loginPage, /AuthenticationEntryPage mode="login"/);
  assert.match(registerPage, /AuthenticationEntryPage mode="register"/);
  assert.match(entryPage, /readAuthenticationSession\(\)/);
  assert.match(entryPage, /session\?\.access\.status === "pending"/);
  assert.match(entryPage, /authenticationEntryPath\("register", returnTo\)/);
  assert.match(entryPage, /initialEmail=\{accountEmail\}/);
  assert.match(entryPage, /safeAuthenticationReturnTo\(/);
  assert.match(entryPage, /authenticationEntryPath\(nextMode, returnTo\)/);
  assert.match(entryPage, /initialMode=\{mode\}/);
  assert.match(entryPage, /returnTo=\{returnTo\}/);
  assert.doesNotMatch(`${loginPage}${registerPage}${entryPage}`, /logoin/);
});

test("GG-096 keeps login, registration and protected-route behavior explicit", async () => {
  const [gate, creationPage, css] = await Promise.all([
    readFile(
      path.join(root, "features/auth/authentication-gate.tsx"),
      "utf8",
    ),
    readFile(path.join(root, "app/page.tsx"), "utf8"),
    readFile(path.join(root, "app/globals.css"), "utf8"),
  ]);

  assert.match(gate, /\(\["login", "register"\] as const\)\.map/);
  assert.match(gate, /authenticationMode === "register"/);
  assert.match(gate, /\{registrationRequired && \(/);
  assert.match(gate, /setAuthenticationMode\("register"\)/);
  assert.match(gate, /onModeChange\?\.\("register"\)/);
  assert.match(gate, /await onAuthenticated\(verifiedReturnTo\)/);
  assert.match(gate, /safeAuthenticationReturnTo\(returnTo\)/);
  assert.match(gate, /window\.location\.replace\(/);
  assert.match(gate, /authenticationEntryPath\(/);
  assert.match(creationPage, /authenticationEntryPath\(\s*"login"/);
  assert.match(css, /\.authentication-mode-tabs[^}]*grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/s);
  assert.match(css, /\.authentication-mode-tab\[aria-selected="true"\]/);

  const updateEmail = gate.match(
    /const updateEmail = \(value: string\) => \{[\s\S]*?const updateCode/,
  )?.[0];
  assert.ok(updateEmail);
  assert.doesNotMatch(updateEmail, /setResendAvailableAt\(0\)/);
  assert.doesNotMatch(updateEmail, /setAuthenticationMode/);
});
