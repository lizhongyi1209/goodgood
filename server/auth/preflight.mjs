import { loadAuthenticationConfig } from "./config.mjs";
import { createOidcClient } from "./oidc-client.mjs";

const OIDC_REQUIRED_ENVIRONMENT_NAMES = Object.freeze([
  "GOODGOOD_AUTH_MODE",
  "GOODGOOD_AUTH_ISSUER",
  "GOODGOOD_AUTH_CLIENT_ID",
  "GOODGOOD_AUTH_REDIRECT_URI",
]);

const MANUAL_CHECKS = Object.freeze([
  Object.freeze({
    evidence: "Authing Login Control screenshot and exported setting notes",
    expected:
      "Email verification code is the only native login and registration method; password, username, phone/SMS, scan-code, and other methods are disabled.",
    id: "authing-login-methods",
  }),
  Object.freeze({
    evidence: "Authing Google connection and Google Cloud redirect screenshots",
    expected:
      "Exactly one Google connection is associated with the staging app, first-use registration is allowed, and Google uses the Authing-provided redirect URI.",
    id: "google-connection",
  }),
  Object.freeze({
    evidence: "Redacted Authing account-association setting and cross-method smoke result",
    expected:
      "Google email matching/association is enabled and the same verified email returns the same OIDC subject through Google and email-code login.",
    id: "cross-method-account-association",
  }),
  Object.freeze({
    evidence: "Test mailbox delivery record with secrets and codes removed",
    expected:
      "The staging sender and template deliver a single-use email code with acceptable expiry and no production branding claim.",
    id: "email-code-delivery",
  }),
  Object.freeze({
    evidence: "Staging smoke checklist with test account identifiers redacted",
    expected:
      "First login, repeat login, cancellation, expired/replayed callback, logout, and cross-method association all match the documented behavior.",
    id: "interactive-smoke-tests",
  }),
]);

function check(id, status, detail) {
  return Object.freeze({ detail, id, status });
}

function isLoopback(url) {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1";
}

function secureOrAllowedLoopback(url, allowLoopback) {
  return (
    url.protocol === "https:" ||
    (allowLoopback && url.protocol === "http:" && isLoopback(url))
  );
}

function hasEvery(values, requiredValues) {
  return requiredValues.every((value) => values.includes(value));
}

function safeConfigurationError(environment) {
  const missing = OIDC_REQUIRED_ENVIRONMENT_NAMES.filter(
    (name) => !environment[name],
  );
  if (
    !environment.GOODGOOD_AUTH_CLIENT_SECRET &&
    !environment.GOODGOOD_AUTH_CLIENT_SECRET_FILE
  ) {
    missing.push(
      "GOODGOOD_AUTH_CLIENT_SECRET or GOODGOOD_AUTH_CLIENT_SECRET_FILE",
    );
  }
  if (missing.length > 0) {
    return `Missing required environment variables: ${missing.join(", ")}.`;
  }
  return "Authentication configuration is invalid or unsafe.";
}

function publicConfiguration(config) {
  return Object.freeze({
    clientCredentialsConfigured: true,
    cookieName: config.cookieName,
    issuer: config.issuer,
    logoutRedirectUri: config.logoutRedirectUri,
    mode: config.mode,
    redirectUri: config.redirectUri,
    scopes: config.scopes.split(/\s+/),
    secureCookie: config.secureCookie,
  });
}

export async function runAuthenticationPreflight({
  allowLoopback = false,
  environment = process.env,
  fetchImpl = fetch,
} = {}) {
  const checks = [];
  let config;
  try {
    config = loadAuthenticationConfig(environment);
  } catch {
    checks.push(check("runtime-configuration", "fail", safeConfigurationError(environment)));
    return Object.freeze({
      checks: Object.freeze(checks),
      configuration: null,
      manualChecks: MANUAL_CHECKS,
      ok: false,
      schemaVersion: 1,
    });
  }

  if (config.mode !== "oidc") {
    checks.push(
      check(
        "runtime-configuration",
        "fail",
        "GOODGOOD_AUTH_MODE must be oidc for staging and production.",
      ),
    );
    return Object.freeze({
      checks: Object.freeze(checks),
      configuration: Object.freeze({ mode: config.mode }),
      manualChecks: MANUAL_CHECKS,
      ok: false,
      schemaVersion: 1,
    });
  }

  checks.push(
    check("runtime-configuration", "pass", "OIDC server credentials are configured."),
  );
  const issuer = new URL(config.issuer);
  const redirect = new URL(config.redirectUri);
  const logoutRedirect = new URL(config.logoutRedirectUri);
  const productionCookiePolicy =
    config.secureCookie && config.cookieName.startsWith("__Host-");
  const localCookiePolicy =
    allowLoopback && isLoopback(redirect) && redirect.protocol === "http:";
  checks.push(
    check(
      "issuer-transport",
      secureOrAllowedLoopback(issuer, allowLoopback) ? "pass" : "fail",
      secureOrAllowedLoopback(issuer, allowLoopback)
        ? "Issuer transport is accepted."
        : "The staging issuer must use HTTPS and must not be a loopback URL.",
    ),
    check(
      "redirect-transport",
      secureOrAllowedLoopback(redirect, allowLoopback) ? "pass" : "fail",
      secureOrAllowedLoopback(redirect, allowLoopback)
        ? "Redirect transport is accepted."
        : "The staging callback must use HTTPS and must not be a loopback URL.",
    ),
    check(
      "redirect-path",
      redirect.pathname === "/api/auth/callback" ? "pass" : "fail",
      redirect.pathname === "/api/auth/callback"
        ? "The callback path is exact."
        : "GOODGOOD_AUTH_REDIRECT_URI must end at /api/auth/callback.",
    ),
    check(
      "logout-redirect",
      secureOrAllowedLoopback(logoutRedirect, allowLoopback) &&
        logoutRedirect.pathname === "/" &&
        logoutRedirect.search === ""
        ? "pass"
        : "fail",
      secureOrAllowedLoopback(logoutRedirect, allowLoopback) &&
        logoutRedirect.pathname === "/" &&
        logoutRedirect.search === ""
        ? "The hosted logout callback returns to the GoodGood origin root."
        : "The hosted logout callback must be the HTTPS GoodGood origin root.",
    ),
    check(
      "cookie-policy",
      productionCookiePolicy || localCookiePolicy ? "pass" : "fail",
      productionCookiePolicy
        ? "The GoodGood session uses a Secure __Host- cookie."
        : localCookiePolicy
          ? "An explicit loopback-only run uses an HTTP-compatible local cookie."
          : "Staging requires a Secure cookie whose name starts with __Host-.",
    ),
  );

  const authingHost =
    issuer.hostname === "authing.cn" || issuer.hostname.endsWith(".authing.cn");
  checks.push(
    check(
      "authing-issuer-host",
      authingHost || (allowLoopback && isLoopback(issuer)) ? "pass" : "warn",
      authingHost
        ? "The issuer uses an Authing-provided application domain."
        : allowLoopback && isLoopback(issuer)
          ? "Loopback issuer accepted for automated verification only."
          : "The issuer is not under authing.cn; confirm it is an approved Authing custom domain.",
    ),
  );

  let provider;
  const oidcClient = createOidcClient({ config, fetchImpl });
  try {
    const logoutUrl = new URL(oidcClient.buildLogoutUrl());
    const logoutContractValid =
      logoutUrl.origin === issuer.origin &&
      logoutUrl.pathname === "/login/profile/logout" &&
      logoutUrl.searchParams.get("app_id") === config.clientId &&
      logoutUrl.searchParams.get("redirect_uri") === config.logoutRedirectUri;
    checks.push(
      check(
        "hosted-logout-contract",
        logoutContractValid ? "pass" : "fail",
        logoutContractValid
          ? "Hosted logout targets the Authing application and exact GoodGood logout callback."
          : "The Authing hosted logout URL does not match the application and callback contract.",
      ),
    );
  } catch {
    checks.push(
      check(
        "hosted-logout-contract",
        "fail",
        "The Authing hosted logout URL could not be constructed safely.",
      ),
    );
  }
  try {
    provider = await oidcClient.inspectProvider();
    checks.push(
      check(
        "oidc-discovery",
        "pass",
        "Discovery loaded and its issuer exactly matches GOODGOOD_AUTH_ISSUER.",
      ),
    );
  } catch {
    checks.push(
      check(
        "oidc-discovery",
        "fail",
        "OIDC discovery is unavailable, malformed, or has a mismatched issuer.",
      ),
    );
  }

  if (provider) {
    const endpointUrls = [
      provider.authorizationEndpoint,
      provider.tokenEndpoint,
      provider.jwksUri,
    ].map((value) => new URL(value));
    checks.push(
      check(
        "provider-endpoint-transport",
        endpointUrls.every((url) => secureOrAllowedLoopback(url, allowLoopback))
          ? "pass"
          : "fail",
        endpointUrls.every((url) => secureOrAllowedLoopback(url, allowLoopback))
          ? "Authorization, token, and JWKS endpoints use accepted transports."
          : "Authorization, token, and JWKS endpoints must use HTTPS outside tests.",
      ),
      check(
        "authorization-code",
        provider.responseTypes.includes("code") &&
          provider.grantTypes.includes("authorization_code")
          ? "pass"
          : "fail",
        provider.responseTypes.includes("code") &&
          provider.grantTypes.includes("authorization_code")
          ? "Authorization Code flow is advertised."
          : "The provider must advertise response type code and authorization_code grant support.",
      ),
      check(
        "pkce-s256",
        provider.codeChallengeMethods.includes("S256") ? "pass" : "fail",
        provider.codeChallengeMethods.includes("S256")
          ? "S256 PKCE is advertised."
          : "The provider must advertise S256 in code_challenge_methods_supported.",
      ),
      check(
        "requested-scopes",
        hasEvery(provider.scopes, config.scopes.split(/\s+/)) ? "pass" : "fail",
        hasEvery(provider.scopes, config.scopes.split(/\s+/))
          ? "All requested OIDC scopes are advertised."
          : "The provider must advertise openid, profile, and email scopes.",
      ),
      check(
        "token-endpoint-authentication",
        provider.tokenEndpointAuthMethods.some((method) =>
          ["client_secret_basic", "client_secret_post"].includes(method),
        )
          ? "pass"
          : "fail",
        provider.tokenEndpointAuthMethods.some((method) =>
          ["client_secret_basic", "client_secret_post"].includes(method),
        )
          ? "A supported server-side client authentication method is advertised."
          : "The token endpoint must support client_secret_basic or client_secret_post.",
      ),
      check(
        "id-token-signing",
        provider.idTokenSigningAlgorithms.includes("RS256") ? "pass" : "fail",
        provider.idTokenSigningAlgorithms.includes("RS256")
          ? "RS256 ID-token signing is advertised."
          : "The Authing application must advertise RS256 ID-token signing.",
      ),
    );

    try {
      const authorizationUrl = new URL(
        await oidcClient.buildAuthorizationUrl({
          codeChallenge: "A".repeat(43),
          nonce: "preflight-nonce",
          state: "preflight-state",
        }),
      );
      const expectedParameters = {
        client_id: config.clientId,
        code_challenge_method: "S256",
        nonce: "preflight-nonce",
        redirect_uri: config.redirectUri,
        response_mode: "query",
        response_type: "code",
        scope: config.scopes,
        state: "preflight-state",
      };
      const authorizationContractValid = Object.entries(expectedParameters).every(
        ([name, value]) => authorizationUrl.searchParams.get(name) === value,
      );
      checks.push(
        check(
          "authorization-request-contract",
          authorizationContractValid ? "pass" : "fail",
          authorizationContractValid
            ? "The generated authorization request includes code, S256, state, nonce, scopes, and the exact callback."
            : "The generated authorization request does not match the GoodGood OIDC contract.",
        ),
      );
    } catch {
      checks.push(
        check(
          "authorization-request-contract",
          "fail",
          "The authorization request could not be constructed from discovery.",
        ),
      );
    }
  }

  return Object.freeze({
    checks: Object.freeze(checks),
    configuration: publicConfiguration(config),
    manualChecks: MANUAL_CHECKS,
    ok: !checks.some(({ status }) => status === "fail"),
    schemaVersion: 1,
  });
}
