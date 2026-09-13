import assert from "node:assert/strict";
import test from "node:test";
import { loadAuthenticationConfig } from "../server/auth/config.mjs";
import { AuthenticationError, sessionExpiredError } from "../server/auth/errors.mjs";
import { createAuthenticationNodeApiHandler } from "../server/auth/node-api.mjs";
import { createAuthenticationOperations } from "../server/auth/operations.mjs";
import { createLocalIdentityAdapter } from "../server/auth/request-authenticator.mjs";

const ownerToken = "gg057-local-owner-token";
const memberToken = "gg057-local-member-token";
const config = loadAuthenticationConfig({
  GOODGOOD_AUTH_MODE: "local",
  GOODGOOD_ALLOW_LOCAL_AUTH: "true",
  GOODGOOD_LOCAL_AUTH_TOKENS: `${ownerToken}=owner,${memberToken}=member`,
  GOODGOOD_LOCAL_AUTH_DEFAULT_TOKEN: ownerToken,
});

function operationsFor(settings = config, authenticateSession) {
  const adapter = createLocalIdentityAdapter(settings);
  return createAuthenticationOperations({
    config: settings,
    authenticate: async () => { throw new Error("Login must not admit creative access."); },
    authenticateSession: authenticateSession ?? (async (request) => adapter.authenticate(request)),
    getPool: async () => { throw new Error("Local login must not persist OIDC attempts or sessions."); },
  });
}

async function login(settings, operations, returnTo, cookie) {
  const response = {
    body: "", headers: {}, status: 0,
    writeHead(status, headers) { this.status = status; this.headers = headers; },
    end(body = "") { this.body += body; },
  };
  const request = { method: "GET", url: `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`, headers: cookie ? { cookie } : {} };
  assert.equal(await createAuthenticationNodeApiHandler({ config: settings, operations })(request, response), true);
  assert.equal(response.headers["cache-control"], "no-store");
  return response;
}

test("GG-057 revisited local login redirects to either admin page with the configured HttpOnly identity", async () => {
  const operations = operationsFor();
  for (const destination of ["/admin/users", "/admin/models", "/create?from=admin#composer"]) {
    const response = await login(config, operations, destination);
    assert.equal(response.status, 302);
    assert.equal(response.headers.location, destination);
    assert.equal(response.headers["set-cookie"], `${config.cookieName}=${ownerToken}; HttpOnly; Path=/; SameSite=Lax`);
    assert.equal(response.body, "");
  }
});

test("GG-057 local login retains a valid existing identity instead of switching a member to the default owner", async () => {
  for (const defaultToken of [ownerToken, null]) {
    const settings = { ...config, defaultToken };
    const response = await login(settings, operationsFor(settings), "/admin/users", `${config.cookieName}=${memberToken}`);
    assert.equal(response.status, 302);
    assert.equal(response.headers.location, "/admin/users");
    assert.equal(response.headers["set-cookie"], undefined);
  }
});

test("GG-057 invalid local credentials recover only when a default is explicitly configured", async () => {
  const response = await login(config, operationsFor(), "/admin/models", `${config.cookieName}=expired-token`);
  assert.equal(response.status, 302);
  assert.match(response.headers["set-cookie"], new RegExp(`=${ownerToken};`));
  const settings = { ...config, defaultToken: null };
  const failure = await login(settings, operationsFor(settings), "/admin/models");
  assert.equal(failure.status, 404);
  assert.equal(JSON.parse(failure.body).error.code, "AUTH_NOT_CONFIGURED");
  assert.equal(failure.headers["set-cookie"], undefined);
});

test("GG-057 unsafe return URLs and session lookup failures never issue a fallback identity", async () => {
  let sessionReads = 0;
  const operations = operationsFor(config, async () => { sessionReads++; throw sessionExpiredError(); });
  for (const destination of ["https://outside.example/admin", "//outside.example", "/\\outside.example", "/admin/users\r\nInjected: value"]) {
    const response = await login(config, operations, destination);
    assert.equal(response.status, 400);
    assert.equal(JSON.parse(response.body).error.code, "AUTH_RETURN_TO_INVALID");
    assert.equal(response.headers["set-cookie"], undefined);
  }
  assert.equal(sessionReads, 0);
  const unavailable = operationsFor(config, async () => { throw new AuthenticationError("AUTH_PROVIDER_UNAVAILABLE", "暂时无法读取登录状态", 503); });
  const response = await login(config, unavailable, "/admin/users");
  assert.equal(response.status, 503);
  assert.equal(response.headers["set-cookie"], undefined);
});
