import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runAuthenticationPreflight } from "../server/auth/preflight.mjs";
import {
  parseArguments,
  runtimeEnvironment,
} from "../scripts/run-authing-local.mjs";

const SECRET = "staging-secret-that-must-not-appear";

function oidcEnvironment(overrides = {}) {
  return {
    GOODGOOD_AUTH_CLIENT_ID: "goodgood-staging-client",
    GOODGOOD_AUTH_CLIENT_SECRET: SECRET,
    GOODGOOD_AUTH_COOKIE_NAME: "__Host-goodgood_session",
    GOODGOOD_AUTH_COOKIE_SECURE: "true",
    GOODGOOD_AUTH_ISSUER: "https://goodgood-staging.authing.cn/oidc",
    GOODGOOD_AUTH_MODE: "oidc",
    GOODGOOD_AUTH_REDIRECT_URI:
      "https://staging.goodgood.example/api/auth/callback",
    ...overrides,
  };
}

function emailEnvironment(overrides = {}) {
  return {
    GOODGOOD_AUTH_COOKIE_NAME: "__Host-goodgood_session",
    GOODGOOD_AUTH_COOKIE_SECURE: "true",
    GOODGOOD_AUTH_MODE: "email_otp",
    GOODGOOD_AUTH_PUBLIC_ORIGIN: "https://staging.goodgood.example",
    GOODGOOD_EMAIL_FROM: "GoodGood <no-reply@mail.goodgood.example>",
    GOODGOOD_EMAIL_OTP_SECRET: SECRET,
    GOODGOOD_EMAIL_SMTP_HOST: "smtp.goodgood.example",
    GOODGOOD_EMAIL_SMTP_PASSWORD: "smtp-secret-that-must-not-appear",
    GOODGOOD_EMAIL_SMTP_PORT: "465",
    GOODGOOD_EMAIL_SMTP_SECURE: "true",
    GOODGOOD_EMAIL_SMTP_USERNAME: "smtp-user",
    ...overrides,
  };
}

function discovery(overrides = {}) {
  const issuer = "https://goodgood-staging.authing.cn/oidc";
  return {
    authorization_endpoint: `${issuer}/auth`,
    code_challenge_methods_supported: ["S256"],
    grant_types_supported: ["authorization_code"],
    id_token_signing_alg_values_supported: ["RS256"],
    issuer,
    jwks_uri: `${issuer}/jwks`,
    response_types_supported: ["code"],
    scopes_supported: ["openid", "profile", "email"],
    token_endpoint: `${issuer}/token`,
    token_endpoint_auth_methods_supported: ["client_secret_post"],
    ...overrides,
  };
}

function discoveryFetch(document) {
  return async () =>
    new Response(JSON.stringify(document), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
}

test("authentication preflight validates a production-shaped Authing OIDC configuration without exposing secrets", async () => {
  const report = await runAuthenticationPreflight({
    environment: oidcEnvironment(),
    fetchImpl: discoveryFetch(discovery()),
  });

  assert.equal(report.ok, true);
  assert.equal(report.configuration.clientCredentialsConfigured, true);
  assert.equal(report.configuration.cookieName, "__Host-goodgood_session");
  assert.equal(
    report.configuration.logoutRedirectUri,
    "https://staging.goodgood.example/",
  );
  assert.equal(report.checks.every(({ status }) => status === "pass"), true);
  assert.equal(
    report.checks.some(({ id }) => id === "hosted-logout-contract"),
    true,
  );
  assert.deepEqual(
    report.manualChecks.map(({ id }) => id),
    [
      "authing-login-methods",
      "google-connection",
      "cross-method-account-association",
      "email-code-delivery",
      "interactive-smoke-tests",
    ],
  );
  assert.doesNotMatch(JSON.stringify(report), new RegExp(SECRET));
  assert.equal("clientId" in report.configuration, false);
  assert.equal("clientSecret" in report.configuration, false);
});

test("authentication preflight verifies email SMTP without sending or exposing secrets", async () => {
  let closed = false;
  let transportOptions = null;
  let verified = false;
  const report = await runAuthenticationPreflight({
    environment: emailEnvironment(),
    smtpTransportFactory(options) {
      transportOptions = options;
      return {
        close() {
          closed = true;
        },
        async verify() {
          verified = true;
        },
      };
    },
  });

  assert.equal(report.ok, true);
  assert.equal(verified, true);
  assert.equal(closed, true);
  assert.equal(transportOptions.secure, true);
  assert.equal(transportOptions.auth.user, "smtp-user");
  assert.deepEqual(report.configuration, {
    cookieName: "__Host-goodgood_session",
    mode: "email_otp",
    publicOrigin: "https://staging.goodgood.example",
    registrationEnabled: true,
    secureCookie: true,
    sendingEnabled: true,
    smtpAuthenticationConfigured: true,
    smtpSecure: true,
  });
  assert.deepEqual(
    report.manualChecks.map(({ id }) => id),
    [
      "email-domain-authentication",
      "email-provider-readiness",
      "email-code-delivery",
      "interactive-email-smoke-tests",
      "email-alert-delivery",
    ],
  );
  assert.doesNotMatch(JSON.stringify(report), /smtp-secret|smtp-user|SECRET/);
});

test("authentication preflight fails closed on SMTP authentication errors", async () => {
  const report = await runAuthenticationPreflight({
    environment: emailEnvironment(),
    smtpTransportFactory() {
      return {
        close() {},
        async verify() {
          throw new Error("provider detail must stay private");
        },
      };
    },
  });

  assert.equal(report.ok, false);
  assert.equal(
    report.checks.find(({ id }) => id === "smtp-authentication").status,
    "fail",
  );
  assert.doesNotMatch(JSON.stringify(report), /provider detail|smtp-secret/);
});

test("authentication preflight fails closed when discovery cannot prove the required OIDC capabilities", async () => {
  const report = await runAuthenticationPreflight({
    environment: oidcEnvironment({
      GOODGOOD_AUTH_REDIRECT_URI: "https://staging.goodgood.example/wrong-callback",
    }),
    fetchImpl: discoveryFetch(
      discovery({
        code_challenge_methods_supported: ["plain"],
        id_token_signing_alg_values_supported: ["HS256"],
        response_types_supported: ["id_token"],
        scopes_supported: ["openid", "profile"],
        token_endpoint_auth_methods_supported: ["private_key_jwt"],
      }),
    ),
  });

  assert.equal(report.ok, false);
  const failed = report.checks
    .filter(({ status }) => status === "fail")
    .map(({ id }) => id);
  assert.deepEqual(failed, [
    "redirect-path",
    "authorization-code",
    "pkce-s256",
    "requested-scopes",
    "token-endpoint-authentication",
    "id-token-signing",
    "authorization-request-contract",
  ]);
});

test("authentication preflight stops before discovery for an unsafe HTTPS cookie policy", async () => {
  let discoveryRequested = false;
  const report = await runAuthenticationPreflight({
    environment: oidcEnvironment({
      GOODGOOD_AUTH_COOKIE_NAME: "goodgood_session",
    }),
    fetchImpl: async () => {
      discoveryRequested = true;
      throw new Error("Discovery must not run for an unsafe configuration.");
    },
  });

  assert.equal(report.ok, false);
  assert.equal(report.configuration, null);
  assert.equal(report.checks[0].id, "runtime-configuration");
  assert.match(report.checks[0].detail, /invalid or unsafe/);
  assert.equal(discoveryRequested, false);
  assert.doesNotMatch(JSON.stringify(report), new RegExp(SECRET));
});

test("authentication preflight rejects local mode and reports missing names without echoing values", async () => {
  const localReport = await runAuthenticationPreflight({
    environment: {
      GOODGOOD_ALLOW_LOCAL_AUTH: "true",
      GOODGOOD_AUTH_MODE: "local",
      GOODGOOD_LOCAL_AUTH_TOKENS:
        "goodgood-local-test-token=local-preflight-subject",
    },
  });
  assert.equal(localReport.ok, false);
  assert.equal(localReport.checks[0].id, "runtime-configuration");

  const missingReport = await runAuthenticationPreflight({
    environment: {
      GOODGOOD_AUTH_CLIENT_SECRET: SECRET,
      GOODGOOD_AUTH_MODE: "oidc",
    },
  });
  assert.equal(missingReport.ok, false);
  assert.match(missingReport.checks[0].detail, /GOODGOOD_AUTH_ISSUER/);
  assert.doesNotMatch(JSON.stringify(missingReport), new RegExp(SECRET));
});

test("authentication preflight rejects the local-auth opt-in in OIDC environments", async () => {
  let discoveryRequested = false;
  const report = await runAuthenticationPreflight({
    environment: oidcEnvironment({ GOODGOOD_ALLOW_LOCAL_AUTH: "true" }),
    fetchImpl: async () => {
      discoveryRequested = true;
      throw new Error("Discovery must not run for an unsafe configuration.");
    },
  });

  assert.equal(report.ok, false);
  assert.equal(report.configuration, null);
  assert.equal(report.checks[0].id, "runtime-configuration");
  assert.match(report.checks[0].detail, /invalid or unsafe/);
  assert.equal(discoveryRequested, false);
  assert.doesNotMatch(JSON.stringify(report), new RegExp(SECRET));
});

test("authentication preflight allows only an explicitly requested loopback cookie exception", async () => {
  const report = await runAuthenticationPreflight({
    allowLoopback: true,
    environment: oidcEnvironment({
      GOODGOOD_AUTH_COOKIE_NAME: "goodgood_oidc_session",
      GOODGOOD_AUTH_COOKIE_SECURE: "false",
      GOODGOOD_AUTH_REDIRECT_URI:
        "http://127.0.0.1:3000/api/auth/callback",
    }),
    fetchImpl: discoveryFetch(discovery()),
  });

  assert.equal(report.ok, true);
  assert.match(
    report.checks.find(({ id }) => id === "cookie-policy").detail,
    /loopback-only/,
  );
});

test("the Authing local runner accepts public identifiers but keeps the secret file-only", () => {
  const options = parseArguments([
    "--issuer",
    "https://goodgood-staging.authing.cn/oidc/",
    "--client-id",
    "goodgood-staging-client",
    "--web-port",
    "3100",
  ]);
  assert.deepEqual(options, {
    clientId: "goodgood-staging-client",
    help: false,
    issuer: "https://goodgood-staging.authing.cn/oidc",
    webPort: "3100",
  });
  const environment = runtimeEnvironment({
    ...options,
    secretFile: "C:\\temporary\\client-secret",
  });
  assert.equal(environment.GOODGOOD_AUTH_CLIENT_SECRET, "");
  assert.equal(
    environment.GOODGOOD_AUTH_CLIENT_SECRET_FILE,
    "C:\\temporary\\client-secret",
  );
  assert.equal(
    environment.GOODGOOD_AUTH_REDIRECT_URI,
    "http://127.0.0.1:3100/api/auth/callback",
  );
  assert.throws(
    () => parseArguments(["--client-id", "client"]),
    /--issuer is required/,
  );
  assert.throws(
    () =>
      parseArguments([
        "--issuer",
        "http://not-secure.example/oidc",
        "--client-id",
        "client",
      ]),
    /HTTPS URL/,
  );
});

test("authentication preflight is exposed as the documented npm operator command", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.equal(
    packageJson.scripts["auth:preflight"],
    "node scripts/verify-authentication.mjs",
  );
  assert.equal(
    packageJson.scripts["stack:authing-local"],
    "node scripts/run-authing-local.mjs",
  );
});
