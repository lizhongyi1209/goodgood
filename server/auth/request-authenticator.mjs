import { createHash, timingSafeEqual } from "node:crypto";
import { loadAuthenticationConfig } from "./config.mjs";
import { sessionExpiredError } from "./errors.mjs";
import {
  resolveOwnerContext,
  resolveSessionOwnerContext,
} from "./repository.mjs";
import { correlateRequest } from "../observability/http.mjs";

function headerValue(headers, name) {
  if (typeof headers?.get === "function") return headers.get(name);
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value ?? null;
}

function cookieValue(headers, name) {
  const cookie = headerValue(headers, "cookie");
  if (!cookie) return null;
  for (const entry of cookie.split(";")) {
    const separator = entry.indexOf("=");
    if (separator === -1 || entry.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(entry.slice(separator + 1).trim());
    } catch {
      throw sessionExpiredError();
    }
  }
  return null;
}

function localRequestCredential(request, config) {
  const authorization = headerValue(request.headers, "authorization");
  if (authorization) {
    const match = /^Bearer\s+([^\s]+)$/i.exec(authorization);
    if (!match) throw sessionExpiredError();
    return match[1];
  }
  return cookieValue(request.headers, config.cookieName);
}

export function authenticationSessionCredential(request, config) {
  return cookieValue(request.headers, config.cookieName);
}

export function authenticationLoginCredential(request, config) {
  return cookieValue(request.headers, config.loginCookieName);
}

export function hashAuthenticationSecret(value) {
  return createHash("sha256").update(value).digest("hex");
}

function digest(value) {
  return createHash("sha256").update(value).digest();
}

export function createLocalIdentityAdapter(config) {
  if (config.mode !== "local") {
    throw new Error("The local identity adapter requires GOODGOOD_AUTH_MODE=local.");
  }
  const bindings = config.tokenBindings.map(({ subject, token }) => ({
    digest: digest(token),
    subject,
  }));

  return Object.freeze({
    authenticate(request) {
      const credential = localRequestCredential(request, config);
      if (!credential) throw sessionExpiredError();
      const candidate = digest(credential);
      const binding = bindings.find((entry) =>
        timingSafeEqual(entry.digest, candidate),
      );
      if (!binding) throw sessionExpiredError();
      return Object.freeze({ issuer: config.issuer, subject: binding.subject });
    },
  });
}

export function createRequestAuthenticator({
  config = loadAuthenticationConfig(),
  getPool,
}) {
  if (config.mode === "local") {
    const identityAdapter = createLocalIdentityAdapter(config);
    return async function authenticateLocalRequest(request) {
      const identity = identityAdapter.authenticate(request);
      const owner = await resolveOwnerContext(await getPool(), identity);
      correlateRequest(request, { ownerId: owner.ownerId });
      return owner;
    };
  }

  return async function authenticateOidcRequest(request) {
    const credential = authenticationSessionCredential(request, config);
    if (!credential || credential.length < 32 || credential.length > 512) {
      throw sessionExpiredError();
    }
    const owner = await resolveSessionOwnerContext(
      await getPool(),
      hashAuthenticationSecret(credential),
    );
    correlateRequest(request, { ownerId: owner.ownerId });
    return owner;
  };
}

export function hasLocalSessionCookie(request, config) {
  return Boolean(cookieValue(request.headers, config.cookieName));
}

export function localSessionCookie(config) {
  if (config.mode !== "local" || !config.defaultToken) return null;
  return `${config.cookieName}=${encodeURIComponent(config.defaultToken)}; HttpOnly; Path=/; SameSite=Lax`;
}

export function authenticationSessionCookie(config, token) {
  const attributes = [
    `${config.cookieName}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${config.sessionTtlSeconds}`,
  ];
  if (config.secureCookie) attributes.push("Secure");
  return attributes.join("; ");
}

export function authenticationLoginCookie(config, token) {
  const attributes = [
    `${config.loginCookieName}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${config.loginTtlSeconds}`,
  ];
  if (config.secureCookie) attributes.push("Secure");
  return attributes.join("; ");
}

export function expiredAuthenticationLoginCookie(config) {
  const attributes = [
    `${config.loginCookieName}=`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (config.secureCookie) attributes.push("Secure");
  return attributes.join("; ");
}

export function expiredAuthenticationSessionCookie(config) {
  const attributes = [
    `${config.cookieName}=`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (config.secureCookie) attributes.push("Secure");
  return attributes.join("; ");
}
