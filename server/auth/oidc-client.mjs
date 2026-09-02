import { createRemoteJWKSet, jwtVerify } from "jose";
import {
  authenticationProviderError,
  authenticationRequestError,
} from "./errors.mjs";

const DISCOVERY_TIMEOUT_MS = 5_000;
const DISCOVERY_CACHE_TTL_MS = 5 * 60 * 1_000;

function endpoint(value, name) {
  try {
    const parsed = new URL(value);
    const localHttp =
      parsed.protocol === "http:" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
    if (
      (parsed.protocol !== "https:" && !localHttp) ||
      parsed.username ||
      parsed.password ||
      parsed.hash
    ) {
      throw new Error();
    }
    return parsed;
  } catch {
    throw authenticationProviderError(`${name} is invalid.`);
  }
}

function stringList(value, fallback = []) {
  if (!Array.isArray(value)) return Object.freeze([...fallback]);
  return Object.freeze(
    value.filter((entry) => typeof entry === "string" && entry.length > 0),
  );
}

function hasEvery(values, requiredValues) {
  return requiredValues.every((value) => values.includes(value));
}

function requireRuntimeProviderCapabilities(discovery, config) {
  const supportedClientAuthentication = discovery.tokenEndpointAuthMethods.some(
    (method) => ["client_secret_basic", "client_secret_post"].includes(method),
  );
  if (
    !discovery.responseTypes.includes("code") ||
    !discovery.grantTypes.includes("authorization_code") ||
    !discovery.codeChallengeMethods.includes("S256") ||
    !hasEvery(discovery.scopes, config.scopes.split(/\s+/)) ||
    !discovery.idTokenSigningAlgorithms.includes("RS256") ||
    !supportedClientAuthentication
  ) {
    throw authenticationProviderError();
  }
}

async function responseJson(response) {
  if (!response.ok) throw authenticationProviderError();
  try {
    return await response.json();
  } catch {
    throw authenticationProviderError();
  }
}

export function createOidcClient({ config, fetchImpl = fetch, now = Date.now } = {}) {
  if (config?.mode !== "oidc") {
    throw new Error("The OIDC client requires GOODGOOD_AUTH_MODE=oidc.");
  }

  let discoveryPromise;
  let discoveryExpiresAt = 0;
  const jwksByUri = new Map();

  async function discover() {
    if (
      discoveryPromise &&
      (discoveryExpiresAt === 0 || now() < discoveryExpiresAt)
    ) {
      return discoveryPromise;
    }
    discoveryPromise = undefined;
    discoveryExpiresAt = 0;
    discoveryPromise ??= (async () => {
      let document;
      try {
        document = await responseJson(
          await fetchImpl(
            `${config.issuer}/.well-known/openid-configuration`,
            {
              headers: { accept: "application/json" },
              signal: AbortSignal.timeout(DISCOVERY_TIMEOUT_MS),
            },
          ),
        );
      } catch (error) {
        if (error?.code === "AUTH_PROVIDER_UNAVAILABLE") throw error;
        throw authenticationProviderError();
      }
      if (document.issuer !== config.issuer) {
        throw authenticationProviderError();
      }
      const discovery = Object.freeze({
        authorizationEndpoint: endpoint(
          document.authorization_endpoint,
          "authorization_endpoint",
        ),
        codeChallengeMethods: stringList(
          document.code_challenge_methods_supported,
        ),
        grantTypes: stringList(document.grant_types_supported, [
          "authorization_code",
          "implicit",
        ]),
        idTokenSigningAlgorithms: stringList(
          document.id_token_signing_alg_values_supported,
        ),
        jwksUri: endpoint(document.jwks_uri, "jwks_uri"),
        responseTypes: stringList(document.response_types_supported),
        scopes: stringList(document.scopes_supported),
        tokenEndpoint: endpoint(document.token_endpoint, "token_endpoint"),
        tokenEndpointAuthMethods: stringList(
          document.token_endpoint_auth_methods_supported,
          ["client_secret_basic"],
        ),
      });
      discoveryExpiresAt = now() + DISCOVERY_CACHE_TTL_MS;
      return discovery;
    })().catch((error) => {
      discoveryPromise = undefined;
      discoveryExpiresAt = 0;
      throw error;
    });
    return discoveryPromise;
  }

  return Object.freeze({
    buildLogoutUrl() {
      const issuer = new URL(config.issuer);
      const url = new URL("/login/profile/logout", issuer.origin);
      url.search = new URLSearchParams({
        app_id: config.clientId,
        redirect_uri: config.logoutRedirectUri,
      }).toString();
      return url.toString();
    },

    async inspectProvider() {
      const discovery = await discover();
      return Object.freeze({
        authorizationEndpoint: discovery.authorizationEndpoint.toString(),
        codeChallengeMethods: discovery.codeChallengeMethods,
        grantTypes: discovery.grantTypes,
        idTokenSigningAlgorithms: discovery.idTokenSigningAlgorithms,
        issuer: config.issuer,
        jwksUri: discovery.jwksUri.toString(),
        responseTypes: discovery.responseTypes,
        scopes: discovery.scopes,
        tokenEndpoint: discovery.tokenEndpoint.toString(),
        tokenEndpointAuthMethods: discovery.tokenEndpointAuthMethods,
      });
    },

    async buildAuthorizationUrl({ codeChallenge, nonce, state }) {
      const discovery = await discover();
      requireRuntimeProviderCapabilities(discovery, config);
      const url = new URL(discovery.authorizationEndpoint);
      url.search = new URLSearchParams({
        client_id: config.clientId,
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        nonce,
        redirect_uri: config.redirectUri,
        response_mode: "query",
        response_type: "code",
        scope: config.scopes,
        state,
      }).toString();
      return url.toString();
    },

    async exchangeCode({ code, codeVerifier, nonce }) {
      const discovery = await discover();
      requireRuntimeProviderCapabilities(discovery, config);
      const parameters = new URLSearchParams({
        client_id: config.clientId,
        code,
        code_verifier: codeVerifier,
        grant_type: "authorization_code",
        redirect_uri: config.redirectUri,
      });
      const headers = {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      };
      if (discovery.tokenEndpointAuthMethods.includes("client_secret_basic")) {
        const username = encodeURIComponent(config.clientId);
        const password = encodeURIComponent(config.clientSecret);
        headers.authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
      } else if (
        discovery.tokenEndpointAuthMethods.includes("client_secret_post")
      ) {
        parameters.set("client_secret", config.clientSecret);
      } else {
        throw authenticationProviderError();
      }

      let tokenResponse;
      try {
        tokenResponse = await responseJson(
          await fetchImpl(discovery.tokenEndpoint, {
            body: parameters,
            headers,
            method: "POST",
            signal: AbortSignal.timeout(DISCOVERY_TIMEOUT_MS),
          }),
        );
      } catch (error) {
        if (error?.code === "AUTH_PROVIDER_UNAVAILABLE") throw error;
        throw authenticationProviderError();
      }
      if (typeof tokenResponse.id_token !== "string") {
        throw authenticationRequestError("AUTH_CALLBACK_INVALID");
      }

      let remoteJwks = jwksByUri.get(discovery.jwksUri.toString());
      if (!remoteJwks) {
        remoteJwks = createRemoteJWKSet(discovery.jwksUri, {
          timeoutDuration: DISCOVERY_TIMEOUT_MS,
        });
        jwksByUri.set(discovery.jwksUri.toString(), remoteJwks);
      }

      let payload;
      try {
        ({ payload } = await jwtVerify(tokenResponse.id_token, remoteJwks, {
          algorithms: ["RS256"],
          audience: config.clientId,
          clockTolerance: 5,
          issuer: config.issuer,
          maxTokenAge: 10 * 60,
        }));
      } catch {
        throw authenticationRequestError("AUTH_CALLBACK_INVALID");
      }
      if (payload.nonce !== nonce) {
        throw authenticationRequestError("AUTH_CALLBACK_INVALID");
      }
      if (
        typeof payload.sub !== "string" ||
        payload.sub.length < 1 ||
        payload.sub.length > 500 ||
        typeof payload.email !== "string" ||
        payload.email.length < 3 ||
        payload.email.length > 320 ||
        payload.email_verified !== true
      ) {
        throw authenticationRequestError("AUTH_EMAIL_UNVERIFIED");
      }

      return Object.freeze({
        email: payload.email.trim().toLowerCase(),
        issuer: config.issuer,
        name:
          typeof payload.name === "string" && payload.name.trim().length <= 120
            ? payload.name.trim()
            : null,
        subject: payload.sub,
      });
    },
  });
}
