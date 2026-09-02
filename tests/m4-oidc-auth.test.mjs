import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { loadAuthenticationConfig } from "../server/auth/config.mjs";
import { authenticationRequestError } from "../server/auth/errors.mjs";
import { createAuthenticationNodeApiHandler } from "../server/auth/node-api.mjs";
import { createOidcClient } from "../server/auth/oidc-client.mjs";
import { createAuthenticationOperations } from "../server/auth/operations.mjs";
import {
  createRequestAuthenticator,
  hashAuthenticationSecret,
} from "../server/auth/request-authenticator.mjs";

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      assert.ok(address && typeof address === "object");
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function responseRecorder() {
  return {
    body: "",
    headers: {},
    statusCode: 0,
    end(chunk = "") {
      this.body += chunk;
    },
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
  };
}

test("OIDC configuration requires server credentials and safe cookie/redirect settings", () => {
  const config = loadAuthenticationConfig({
    GOODGOOD_AUTH_CLIENT_ID: "goodgood-client",
    GOODGOOD_AUTH_CLIENT_SECRET: "server-only-secret",
    GOODGOOD_AUTH_COOKIE_NAME: "goodgood_session",
    GOODGOOD_AUTH_ISSUER: "http://127.0.0.1:43210/oidc",
    GOODGOOD_AUTH_MODE: "oidc",
    GOODGOOD_AUTH_REDIRECT_URI: "http://127.0.0.1:3000/api/auth/callback",
  });
  assert.equal(config.mode, "oidc");
  assert.equal(config.scopes, "openid profile email");
  assert.equal(config.secureCookie, false);
  assert.equal(config.loginTtlSeconds, 600);
  assert.equal(config.loginCookieName, "goodgood_session_login");
  assert.equal(config.logoutRedirectUri, "http://127.0.0.1:3000/");

  const productionEnvironment = {
    GOODGOOD_AUTH_CLIENT_ID: "goodgood-client",
    GOODGOOD_AUTH_CLIENT_SECRET: "server-only-secret",
    GOODGOOD_AUTH_ISSUER: "https://goodgood-staging.authing.cn/oidc",
    GOODGOOD_AUTH_MODE: "oidc",
    GOODGOOD_AUTH_REDIRECT_URI:
      "https://staging.goodgood.example/api/auth/callback",
  };
  const productionConfig = loadAuthenticationConfig(productionEnvironment);
  assert.equal(productionConfig.cookieName, "__Host-goodgood_session");
  assert.equal(productionConfig.secureCookie, true);

  assert.throws(
    () =>
      loadAuthenticationConfig({
        ...productionEnvironment,
        GOODGOOD_AUTH_COOKIE_SECURE: "false",
      }),
    /HTTPS OIDC callbacks require GOODGOOD_AUTH_COOKIE_SECURE=true/,
  );
  assert.throws(
    () =>
      loadAuthenticationConfig({
        ...productionEnvironment,
        GOODGOOD_AUTH_COOKIE_NAME: "goodgood_session",
      }),
    /GOODGOOD_AUTH_COOKIE_NAME to start with __Host-/,
  );

  assert.throws(
    () =>
      loadAuthenticationConfig({
        GOODGOOD_AUTH_CLIENT_ID: "client",
        GOODGOOD_AUTH_CLIENT_SECRET: "secret",
        GOODGOOD_AUTH_ISSUER: "http://auth.example.com/oidc",
        GOODGOOD_AUTH_MODE: "oidc",
        GOODGOOD_AUTH_REDIRECT_URI: "https://goodgood.example/api/auth/callback",
      }),
    /must use HTTPS/,
  );
});

test("OIDC configuration can load a server secret from a mounted file without ambiguity", async (context) => {
  const directory = await mkdtemp(path.join(tmpdir(), "goodgood-auth-config-"));
  context.after(() => rm(directory, { force: true, recursive: true }));
  const secretFile = path.join(directory, "client-secret");
  await writeFile(secretFile, "mounted-server-secret\n", { mode: 0o600 });
  const environment = {
    GOODGOOD_AUTH_CLIENT_ID: "goodgood-client",
    GOODGOOD_AUTH_CLIENT_SECRET_FILE: secretFile,
    GOODGOOD_AUTH_COOKIE_NAME: "goodgood_session",
    GOODGOOD_AUTH_ISSUER: "http://127.0.0.1:43210/oidc",
    GOODGOOD_AUTH_MODE: "oidc",
    GOODGOOD_AUTH_REDIRECT_URI: "http://127.0.0.1:3000/api/auth/callback",
  };

  assert.equal(
    loadAuthenticationConfig(environment).clientSecret,
    "mounted-server-secret",
  );
  assert.throws(
    () =>
      loadAuthenticationConfig({
        ...environment,
        GOODGOOD_AUTH_CLIENT_SECRET: "inline-secret",
      }),
    /Configure only one/,
  );

  await writeFile(secretFile, "\n");
  assert.throws(
    () => loadAuthenticationConfig(environment),
    /must not be empty/,
  );
  assert.throws(
    () =>
      loadAuthenticationConfig({
        ...environment,
        GOODGOOD_AUTH_CLIENT_SECRET_FILE: path.join(directory, "missing"),
      }),
    /could not be read/,
  );
});

test("OIDC client discovers endpoints, sends PKCE, and accepts only a signed verified-email ID token", async (context) => {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  publicJwk.alg = "RS256";
  publicJwk.kid = "goodgood-test-key";
  publicJwk.use = "sig";
  let origin;
  let receivedTokenBody;
  let receivedAuthorization;
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", origin ?? "http://127.0.0.1");
    if (url.pathname === "/oidc/.well-known/openid-configuration") {
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          authorization_endpoint: `${origin}/oidc/auth`,
          code_challenge_methods_supported: ["S256"],
          grant_types_supported: ["authorization_code"],
          id_token_signing_alg_values_supported: ["RS256"],
          issuer: `${origin}/oidc`,
          jwks_uri: `${origin}/oidc/jwks`,
          response_types_supported: ["code"],
          scopes_supported: ["openid", "profile", "email"],
          token_endpoint: `${origin}/oidc/token`,
          token_endpoint_auth_methods_supported: ["client_secret_basic"],
        }),
      );
      return;
    }
    if (url.pathname === "/oidc/jwks") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ keys: [publicJwk] }));
      return;
    }
    if (url.pathname === "/oidc/token" && request.method === "POST") {
      receivedAuthorization = request.headers.authorization;
      const chunks = [];
      request.on("data", (chunk) => chunks.push(chunk));
      request.on("end", () => {
        receivedTokenBody = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
        void new SignJWT({
          email: "creator@example.com",
          email_verified: true,
          name: "Creator",
          nonce: "nonce-value",
          sub: "authing-user-1",
        })
          .setProtectedHeader({ alg: "RS256", kid: publicJwk.kid })
          .setIssuer(`${origin}/oidc`)
          .setAudience("goodgood-client")
          .setIssuedAt()
          .setExpirationTime("5m")
          .sign(privateKey)
          .then((idToken) => {
            response.setHeader("content-type", "application/json");
            response.end(JSON.stringify({ id_token: idToken, token_type: "Bearer" }));
          });
      });
      return;
    }
    response.writeHead(404).end();
  });
  origin = await listen(server);
  context.after(() => close(server));

  const config = loadAuthenticationConfig({
    GOODGOOD_AUTH_CLIENT_ID: "goodgood-client",
    GOODGOOD_AUTH_CLIENT_SECRET: "server-only-secret",
    GOODGOOD_AUTH_COOKIE_NAME: "goodgood_session",
    GOODGOOD_AUTH_ISSUER: `${origin}/oidc`,
    GOODGOOD_AUTH_MODE: "oidc",
    GOODGOOD_AUTH_REDIRECT_URI: `${origin}/api/auth/callback`,
  });
  const client = createOidcClient({ config });
  const authorizationUrl = new URL(
    await client.buildAuthorizationUrl({
      codeChallenge: "challenge-value",
      nonce: "nonce-value",
      state: "state-value",
    }),
  );
  assert.equal(authorizationUrl.searchParams.get("response_type"), "code");
  assert.equal(authorizationUrl.searchParams.get("scope"), "openid profile email");
  assert.equal(authorizationUrl.searchParams.get("code_challenge_method"), "S256");
  const logoutUrl = new URL(client.buildLogoutUrl());
  assert.equal(logoutUrl.origin, origin);
  assert.equal(logoutUrl.pathname, "/login/profile/logout");
  assert.equal(logoutUrl.searchParams.get("app_id"), "goodgood-client");
  assert.equal(logoutUrl.searchParams.get("redirect_uri"), `${origin}/`);

  const claims = await client.exchangeCode({
    code: "one-time-code",
    codeVerifier: "code-verifier-value",
    nonce: "nonce-value",
  });
  assert.deepEqual(claims, {
    email: "creator@example.com",
    issuer: `${origin}/oidc`,
    name: "Creator",
    subject: "authing-user-1",
  });
  assert.match(receivedAuthorization, /^Basic /);
  assert.equal(receivedTokenBody.has("client_secret"), false);
  assert.equal(receivedTokenBody.get("code"), "one-time-code");
  assert.equal(receivedTokenBody.get("code_verifier"), "code-verifier-value");

  await assert.rejects(
    client.exchangeCode({
      code: "one-time-code",
      codeVerifier: "code-verifier-value",
      nonce: "different-nonce",
    }),
    (error) => error.code === "AUTH_CALLBACK_INVALID",
  );
});

test("runtime refresh rejects provider capability drift without persisting an unusable login attempt", async () => {
  const issuer = "http://127.0.0.1:43210/oidc";
  const config = loadAuthenticationConfig({
    GOODGOOD_AUTH_CLIENT_ID: "goodgood-client",
    GOODGOOD_AUTH_CLIENT_SECRET: "server-only-secret",
    GOODGOOD_AUTH_COOKIE_NAME: "goodgood_session",
    GOODGOOD_AUTH_ISSUER: issuer,
    GOODGOOD_AUTH_MODE: "oidc",
    GOODGOOD_AUTH_REDIRECT_URI: "http://127.0.0.1:3000/api/auth/callback",
  });
  let currentTime = 0;
  let discoveryRequests = 0;
  let persistedAttempts = 0;
  const supportedDiscovery = {
    authorization_endpoint: `${issuer}/auth`,
    code_challenge_methods_supported: ["S256"],
    grant_types_supported: ["authorization_code"],
    id_token_signing_alg_values_supported: ["RS256"],
    issuer,
    jwks_uri: `${issuer}/jwks`,
    response_types_supported: ["code"],
    scopes_supported: ["openid", "profile", "email"],
    token_endpoint: `${issuer}/token`,
    token_endpoint_auth_methods_supported: ["client_secret_basic"],
  };
  const oidcClient = createOidcClient({
    config,
    fetchImpl: async () => {
      discoveryRequests += 1;
      const document =
        discoveryRequests === 1
          ? supportedDiscovery
          : {
              ...supportedDiscovery,
              code_challenge_methods_supported: ["plain"],
            };
      return new Response(JSON.stringify(document), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    },
    now: () => currentTime,
  });
  const operations = createAuthenticationOperations({
    authenticate: async () => ({ email: "creator@example.com" }),
    config,
    getPool: async () => ({}),
    oidcClient,
    repository: {
      async createLoginAttempt() {
        persistedAttempts += 1;
      },
    },
  });

  const firstLogin = await operations.beginLogin("/");
  assert.match(firstLogin.location, /\/oidc\/auth/);
  assert.equal(discoveryRequests, 1);
  assert.equal(persistedAttempts, 1);

  currentTime += 5 * 60 * 1_000 + 1;
  await assert.rejects(
    operations.beginLogin("/"),
    (error) => error.code === "AUTH_PROVIDER_UNAVAILABLE",
  );
  assert.equal(discoveryRequests, 2);
  assert.equal(persistedAttempts, 1);
});

test("login operations persist one-time attempts and hashed revocable GoodGood sessions", async () => {
  let attempt;
  let session;
  let revokedHash;
  const repository = {
    async createLoginAttempt(_pool, value) {
      attempt = value;
    },
    async consumeLoginAttempt(_pool, stateHash, browserBindingHash) {
      assert.equal(stateHash, attempt.stateHash);
      assert.equal(browserBindingHash, attempt.browserBindingHash);
      const current = attempt;
      attempt = null;
      return current;
    },
    async provisionOwnerIdentity(_pool, claims) {
      assert.equal(claims.email, "creator@example.com");
      return {
        identityId: "identity-1",
        ownerId: "owner-1",
      };
    },
    async createAuthenticationSession(_pool, value) {
      session = value;
    },
    async revokeAuthenticationSession(_pool, tokenHash) {
      revokedHash = tokenHash;
    },
  };
  let authorizationInput;
  const oidcClient = {
    buildLogoutUrl() {
      return "https://login.authing.cn/login/profile/logout?app_id=client&redirect_uri=https%3A%2F%2Fgoodgood.example%2F";
    },
    async buildAuthorizationUrl(value) {
      authorizationInput = value;
      return `https://login.authing.cn/oidc/auth?state=${value.state}`;
    },
    async exchangeCode(value) {
      assert.equal(value.code, "auth-code");
      assert.equal(value.codeVerifier, attempt?.codeVerifier ?? value.codeVerifier);
      return {
        email: "creator@example.com",
        issuer: "https://login.authing.cn/oidc",
        name: "Creator",
        subject: "subject-1",
      };
    },
  };
  const config = Object.freeze({
    clientId: "client",
    clientSecret: "secret",
    cookieName: "__Host-goodgood_session",
    issuer: "https://login.authing.cn/oidc",
    loginCookieName: "__Host-goodgood_session_login",
    loginTtlSeconds: 600,
    logoutRedirectUri: "https://goodgood.example/",
    mode: "oidc",
    redirectUri: "https://goodgood.example/api/auth/callback",
    scopes: "openid profile email",
    secureCookie: true,
    sessionTtlSeconds: 3600,
  });
  const operations = createAuthenticationOperations({
    authenticate: async () => ({ email: "creator@example.com" }),
    config,
    getPool: async () => ({}),
    oidcClient,
    repository,
  });

  await assert.rejects(
    operations.beginLogin("https://evil.example/"),
    (error) => error.code === "AUTH_RETURN_TO_INVALID",
  );
  const login = await operations.beginLogin("/projects?view=recent");
  const state = new URL(login.location).searchParams.get("state");
  const loginBinding = /^__Host-goodgood_session_login=([^;]+)/.exec(login.cookie)?.[1];
  assert.ok(loginBinding);
  assert.equal(state, authorizationInput.state);
  assert.equal(attempt.returnTo, "/projects?view=recent");
  assert.notEqual(attempt.stateHash, state);
  assert.equal(authorizationInput.codeChallenge.length, 43);

  await assert.rejects(
    operations.completeLogin(
      { code: "auth-code", state },
      { headers: new Headers() },
    ),
    (error) => error.code === "AUTH_CALLBACK_INVALID",
  );

  const completed = await operations.completeLogin(
    { code: "auth-code", state },
    { headers: new Headers({ cookie: `__Host-goodgood_session_login=${loginBinding}` }) },
  );
  const rawToken = /^__Host-goodgood_session=([^;]+)/.exec(completed.cookies[0])?.[1];
  assert.ok(rawToken);
  assert.match(completed.cookies[0], /HttpOnly/);
  assert.match(completed.cookies[0], /Secure/);
  assert.match(completed.cookies[1], /Max-Age=0/);
  assert.equal(completed.location, "/projects?view=recent");
  assert.equal(session.tokenHash, hashAuthenticationSecret(rawToken));
  assert.notEqual(session.tokenHash, rawToken);

  await assert.rejects(
    operations.completeLogin(
      { code: "auth-code", state },
      { headers: new Headers({ cookie: `__Host-goodgood_session_login=${loginBinding}` }) },
    ),
    (error) => error instanceof TypeError || error.code === "AUTH_CALLBACK_INVALID",
  );
  const signedOut = await operations.signOut({
    headers: new Headers({ cookie: `__Host-goodgood_session=${rawToken}` }),
  });
  assert.equal(revokedHash, session.tokenHash);
  assert.match(signedOut.cookie, /Max-Age=0/);
  assert.equal(
    signedOut.location,
    "https://login.authing.cn/login/profile/logout?app_id=client&redirect_uri=https%3A%2F%2Fgoodgood.example%2F",
  );
});

test("OIDC API authentication accepts only a valid GoodGood session cookie", async () => {
  let receivedHash;
  const config = {
    cookieName: "goodgood_session",
    mode: "oidc",
  };
  const authenticate = createRequestAuthenticator({
    config,
    getPool: async () => ({
      async query(_sql, values) {
        receivedHash = values[0];
        return {
          rows: [
            {
              email: "creator@example.com",
              identity_id: "identity-1",
              issuer: "https://login.authing.cn/oidc",
              locale: "zh-CN",
              owner_id: "owner-1",
              status: "active",
              subject: "subject-1",
            },
          ],
        };
      },
    }),
  });
  const rawToken = "x".repeat(43);
  const owner = await authenticate({
    headers: new Headers({ cookie: `goodgood_session=${rawToken}` }),
  });
  assert.equal(owner.ownerId, "owner-1");
  assert.equal(receivedHash, hashAuthenticationSecret(rawToken));
  await assert.rejects(
    authenticate({ headers: new Headers({ authorization: "Bearer provider-id-token" }) }),
    (error) => error.code === "SESSION_EXPIRED",
  );
});

test("logout endpoint expires the local cookie before handing off to Authing", async () => {
  const hostedLogout =
    "https://login.authing.cn/login/profile/logout?app_id=client&redirect_uri=https%3A%2F%2Fgoodgood.example%2F";
  const hostedHandler = createAuthenticationNodeApiHandler({
    config: { mode: "oidc" },
    operations: {
      async signOut() {
        return {
          cookie: "__Host-goodgood_session=; HttpOnly; Path=/; Secure; Max-Age=0",
          location: hostedLogout,
        };
      },
    },
  });
  const hostedResponse = responseRecorder();
  assert.equal(
    await hostedHandler(
      { method: "POST", url: "/api/auth/logout" },
      hostedResponse,
    ),
    true,
  );
  assert.equal(hostedResponse.statusCode, 200);
  assert.match(hostedResponse.headers["set-cookie"], /Max-Age=0/);
  assert.deepEqual(JSON.parse(hostedResponse.body), { redirectTo: hostedLogout });

  const localHandler = createAuthenticationNodeApiHandler({
    config: { mode: "local" },
    operations: {
      async signOut() {
        return {
          cookie: "goodgood_local_session=; HttpOnly; Path=/; Max-Age=0",
          location: null,
        };
      },
    },
  });
  const localResponse = responseRecorder();
  await localHandler(
    { method: "POST", url: "/api/auth/logout" },
    localResponse,
  );
  assert.equal(localResponse.statusCode, 204);
  assert.match(localResponse.headers["set-cookie"], /Max-Age=0/);
  assert.equal(localResponse.body, "");
});

test("callback failures expire the one-time browser-binding cookie", async () => {
  const handler = createAuthenticationNodeApiHandler({
    config: {
      loginCookieName: "__Host-goodgood_session_login",
      mode: "oidc",
      secureCookie: true,
    },
    operations: {
      async completeLogin() {
        throw authenticationRequestError("AUTH_SIGN_IN_CANCELLED");
      },
    },
  });
  const response = responseRecorder();

  assert.equal(
    await handler(
      {
        method: "GET",
        url: "/api/auth/callback?error=access_denied&state=one-time-state",
      },
      response,
    ),
    true,
  );
  assert.equal(response.statusCode, 303);
  assert.equal(response.headers.location, "/?authError=AUTH_SIGN_IN_CANCELLED");
  assert.match(
    response.headers["set-cookie"],
    /^__Host-goodgood_session_login=;/,
  );
  assert.match(response.headers["set-cookie"], /HttpOnly/);
  assert.match(response.headers["set-cookie"], /SameSite=Lax/);
  assert.match(response.headers["set-cookie"], /Max-Age=0/);
  assert.match(response.headers["set-cookie"], /Secure/);
});

test("M4 OIDC migrations bind one-time attempts and store only hashed revocable sessions", async () => {
  const [migration, bindingMigration, schema, adr] = await Promise.all([
    readFile(new URL("../migrations/0005_m4_oidc_sessions.sql", import.meta.url), "utf8"),
    readFile(new URL("../migrations/0006_m4_oidc_login_binding.sql", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../docs/decisions/0007-authing-google-and-email-otp.md", import.meta.url),
      "utf8",
    ),
  ]);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS auth_login_attempts/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS auth_sessions/);
  assert.match(migration, /token_hash text NOT NULL/);
  assert.match(migration, /revoked_at timestamptz/);
  assert.doesNotMatch(migration, /access_token|refresh_token|id_token/);
  assert.match(bindingMigration, /browser_binding_hash/);
  assert.match(bindingMigration, /consumed_at = COALESCE/);
  assert.match(schema, /export const authLoginAttempts = pgTable/);
  assert.match(schema, /export const authSessions = pgTable/);
  assert.match(adr, /Google sign-in/);
  assert.match(adr, /email verification-code/);
});
