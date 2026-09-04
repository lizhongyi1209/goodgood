import { createHash, randomBytes } from "node:crypto";
import { newRequestId } from "../observability/http.mjs";
import { AuthenticationError, authenticationRequestError } from "./errors.mjs";
import { createOidcClient } from "./oidc-client.mjs";
import {
  consumeLoginAttempt,
  createAuthenticationSession,
  createLoginAttempt,
  provisionOwnerIdentity,
  revokeAuthenticationSession,
} from "./repository.mjs";
import {
  authenticationLoginCookie,
  authenticationLoginCredential,
  authenticationSessionCookie,
  authenticationSessionCredential,
  expiredAuthenticationLoginCookie,
  expiredAuthenticationSessionCookie,
  hashAuthenticationSecret,
} from "./request-authenticator.mjs";

const DEFAULT_REPOSITORY = Object.freeze({
  consumeLoginAttempt,
  createAuthenticationSession,
  createLoginAttempt,
  provisionOwnerIdentity,
  revokeAuthenticationSession,
});

function randomSecret(byteLength = 32) {
  return randomBytes(byteLength).toString("base64url");
}

function sha256Base64Url(value) {
  return createHash("sha256").update(value).digest("base64url");
}

function safeReturnTo(value) {
  if (!value) return "/";
  if (
    typeof value !== "string" ||
    value.length > 1_000 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\r\n\\]/.test(value)
  ) {
    throw authenticationRequestError("AUTH_RETURN_TO_INVALID");
  }
  let parsed;
  try {
    parsed = new URL(value, "https://goodgood.invalid");
  } catch {
    throw authenticationRequestError("AUTH_RETURN_TO_INVALID");
  }
  if (parsed.origin !== "https://goodgood.invalid") {
    throw authenticationRequestError("AUTH_RETURN_TO_INVALID");
  }
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function authenticationApiError(error, requestId = newRequestId()) {
  if (error instanceof AuthenticationError) {
    return {
      body: {
        error: {
          code: error.code,
          message: error.message,
          requestId,
          retryable: error.retryable,
        },
      },
      status: error.status,
    };
  }
  console.error(
    JSON.stringify({
      event: "authentication.api_failed",
      message: error instanceof Error ? error.message : String(error),
      requestId,
    }),
  );
  return {
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: "登录暂时无法完成，请稍后重试。",
        requestId,
        retryable: true,
      },
    },
    status: 500,
  };
}

export function authenticationErrorRedirect(error, requestId = newRequestId()) {
  const failure = authenticationApiError(error, requestId);
  const code = failure.body.error.code;
  return `/?authError=${encodeURIComponent(code)}`;
}

export function createAuthenticationOperations({
  authenticate,
  config,
  getPool,
  oidcClient = config.mode === "oidc" ? createOidcClient({ config }) : null,
  repository = DEFAULT_REPOSITORY,
}) {
  if (typeof authenticate !== "function" || typeof getPool !== "function") {
    throw new Error("Authentication operations require authenticate and getPool.");
  }

  return Object.freeze({
    async beginLogin(returnToValue) {
      if (config.mode !== "oidc" || !oidcClient) {
        throw authenticationRequestError("AUTH_NOT_CONFIGURED", undefined, 404);
      }
      const returnTo = safeReturnTo(returnToValue);
      const state = randomSecret();
      const nonce = randomSecret();
      const codeVerifier = randomSecret(48);
      const browserBinding = randomSecret();
      const location = await oidcClient.buildAuthorizationUrl({
        codeChallenge: sha256Base64Url(codeVerifier),
        nonce,
        state,
      });
      await repository.createLoginAttempt(await getPool(), {
        browserBindingHash: hashAuthenticationSecret(browserBinding),
        codeVerifier,
        expiresAt: new Date(Date.now() + config.loginTtlSeconds * 1_000),
        nonce,
        returnTo,
        stateHash: hashAuthenticationSecret(state),
      });
      return {
        cookie: authenticationLoginCookie(config, browserBinding),
        location,
      };
    },

    async completeLogin(parameters, request) {
      if (config.mode !== "oidc" || !oidcClient) {
        throw authenticationRequestError("AUTH_NOT_CONFIGURED", undefined, 404);
      }
      if (typeof parameters.state !== "string" || !parameters.state) {
        throw authenticationRequestError("AUTH_CALLBACK_INVALID");
      }
      const browserBinding = authenticationLoginCredential(request, config);
      if (!browserBinding || browserBinding.length < 32 || browserBinding.length > 512) {
        throw authenticationRequestError("AUTH_CALLBACK_INVALID");
      }
      const pool = await getPool();
      const attempt = await repository.consumeLoginAttempt(
        pool,
        hashAuthenticationSecret(parameters.state),
        hashAuthenticationSecret(browserBinding),
      );
      if (parameters.error) {
        throw authenticationRequestError(
          "AUTH_SIGN_IN_CANCELLED",
          "登录未完成，请重试。",
        );
      }
      if (typeof parameters.code !== "string" || !parameters.code) {
        throw authenticationRequestError("AUTH_CALLBACK_INVALID");
      }
      const claims = await oidcClient.exchangeCode({
        code: parameters.code,
        codeVerifier: attempt.codeVerifier,
        nonce: attempt.nonce,
      });
      const owner = await repository.provisionOwnerIdentity(pool, claims);
      const token = randomSecret(32);
      await repository.createAuthenticationSession(pool, {
        expiresAt: new Date(Date.now() + config.sessionTtlSeconds * 1_000),
        identityId: owner.identityId,
        ownerId: owner.ownerId,
        tokenHash: hashAuthenticationSecret(token),
      });
      return {
        cookies: [
          authenticationSessionCookie(config, token),
          expiredAuthenticationLoginCookie(config),
        ],
        location: safeReturnTo(attempt.returnTo),
      };
    },

    async readSession(request) {
      const owner = await authenticate(request);
      return {
        authenticated: true,
        user: {
          email: owner.email,
        },
      };
    },

    async signOut(request) {
      const location =
        config.mode === "oidc" && oidcClient
          ? oidcClient.buildLogoutUrl()
          : null;
      if (config.mode === "oidc") {
        const credential = authenticationSessionCredential(request, config);
        if (credential) {
          await repository.revokeAuthenticationSession(
            await getPool(),
            hashAuthenticationSecret(credential),
          );
        }
      }
      return {
        cookie: expiredAuthenticationSessionCookie(config),
        location,
      };
    },
  });
}
