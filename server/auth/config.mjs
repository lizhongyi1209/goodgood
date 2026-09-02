import { readFileSync } from "node:fs";

const DEFAULT_LOCAL_ISSUER = "goodgood-local";
const DEFAULT_LOCAL_COOKIE_NAME = "goodgood_local_session";
const DEFAULT_OIDC_COOKIE_NAME = "__Host-goodgood_session";
const DEFAULT_LOGIN_TTL_SECONDS = 10 * 60;
const DEFAULT_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

function required(environment, name) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function clientSecret(environment) {
  const inlineSecret = environment.GOODGOOD_AUTH_CLIENT_SECRET?.trim();
  const secretFile = environment.GOODGOOD_AUTH_CLIENT_SECRET_FILE?.trim();
  if (inlineSecret && secretFile) {
    throw new Error(
      "Configure only one of GOODGOOD_AUTH_CLIENT_SECRET or GOODGOOD_AUTH_CLIENT_SECRET_FILE.",
    );
  }
  if (inlineSecret) return inlineSecret;
  if (!secretFile) {
    throw new Error(
      "GOODGOOD_AUTH_CLIENT_SECRET or GOODGOOD_AUTH_CLIENT_SECRET_FILE is required.",
    );
  }

  let value;
  try {
    value = readFileSync(secretFile, "utf8").trim();
  } catch {
    throw new Error("GOODGOOD_AUTH_CLIENT_SECRET_FILE could not be read.");
  }
  if (!value) {
    throw new Error("GOODGOOD_AUTH_CLIENT_SECRET_FILE must not be empty.");
  }
  return value;
}

function positiveInteger(environment, name, fallback, maximum) {
  const raw = environment[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0 || value > maximum) {
    throw new Error(`${name} must be a positive integer no greater than ${maximum}.`);
  }
  return value;
}

function parseBoolean(environment, name, fallback) {
  const raw = environment[name];
  if (raw === undefined || raw === "") return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`${name} must be true or false.`);
}

function parseUrl(value, name, { allowLocalHttp = false } = {}) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute URL.`);
  }
  const localHttp =
    allowLocalHttp &&
    parsed.protocol === "http:" &&
    (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
  if (parsed.protocol !== "https:" && !localHttp) {
    throw new Error(`${name} must use HTTPS (local loopback HTTP is allowed for tests).`);
  }
  if (parsed.username || parsed.password || parsed.hash) {
    throw new Error(`${name} must not contain credentials or a fragment.`);
  }
  return parsed;
}

function parseCookieName(environment, fallback) {
  const cookieName = environment.GOODGOOD_AUTH_COOKIE_NAME ?? fallback;
  if (!/^(?:__Host-)?[A-Za-z0-9_-]+$/.test(cookieName)) {
    throw new Error("GOODGOOD_AUTH_COOKIE_NAME contains invalid characters.");
  }
  return cookieName;
}

function parseTokenBindings(value) {
  const bindings = value.split(",").map((entry) => {
    const separator = entry.indexOf("=");
    if (separator < 16 || separator === entry.length - 1) {
      throw new Error(
        "GOODGOOD_LOCAL_AUTH_TOKENS must contain token=subject pairs with tokens of at least 16 characters.",
      );
    }
    const token = entry.slice(0, separator).trim();
    const subject = entry.slice(separator + 1).trim();
    if (!token || !subject || subject.length > 255) {
      throw new Error("GOODGOOD_LOCAL_AUTH_TOKENS contains an invalid binding.");
    }
    return Object.freeze({ subject, token });
  });

  if (!bindings.length) {
    throw new Error("GOODGOOD_LOCAL_AUTH_TOKENS must contain at least one binding.");
  }
  if (new Set(bindings.map(({ token }) => token)).size !== bindings.length) {
    throw new Error("GOODGOOD_LOCAL_AUTH_TOKENS contains a duplicate token.");
  }
  if (new Set(bindings.map(({ subject }) => subject)).size !== bindings.length) {
    throw new Error("GOODGOOD_LOCAL_AUTH_TOKENS contains a duplicate subject.");
  }
  return Object.freeze(bindings);
}

function loadLocalConfig(environment) {
  const tokenBindings = parseTokenBindings(
    required(environment, "GOODGOOD_LOCAL_AUTH_TOKENS"),
  );
  const defaultToken = environment.GOODGOOD_LOCAL_AUTH_DEFAULT_TOKEN ?? null;
  if (
    defaultToken &&
    !tokenBindings.some((binding) => binding.token === defaultToken)
  ) {
    throw new Error(
      "GOODGOOD_LOCAL_AUTH_DEFAULT_TOKEN must match a configured local token.",
    );
  }

  return Object.freeze({
    cookieName: parseCookieName(environment, DEFAULT_LOCAL_COOKIE_NAME),
    defaultToken,
    issuer: environment.GOODGOOD_AUTH_ISSUER ?? DEFAULT_LOCAL_ISSUER,
    mode: "local",
    tokenBindings,
  });
}

function loadOidcConfig(environment) {
  const issuerUrl = parseUrl(
    required(environment, "GOODGOOD_AUTH_ISSUER"),
    "GOODGOOD_AUTH_ISSUER",
    { allowLocalHttp: true },
  );
  if (issuerUrl.search) {
    throw new Error("GOODGOOD_AUTH_ISSUER must not contain a query string.");
  }
  issuerUrl.pathname = issuerUrl.pathname.replace(/\/$/, "");
  const redirectUrl = parseUrl(
    required(environment, "GOODGOOD_AUTH_REDIRECT_URI"),
    "GOODGOOD_AUTH_REDIRECT_URI",
    { allowLocalHttp: true },
  );
  if (redirectUrl.search) {
    throw new Error("GOODGOOD_AUTH_REDIRECT_URI must not contain a query string.");
  }
  const secureCookie = parseBoolean(
    environment,
    "GOODGOOD_AUTH_COOKIE_SECURE",
    redirectUrl.protocol === "https:",
  );
  const cookieName = parseCookieName(environment, DEFAULT_OIDC_COOKIE_NAME);
  if (redirectUrl.protocol === "https:" && !secureCookie) {
    throw new Error(
      "HTTPS OIDC callbacks require GOODGOOD_AUTH_COOKIE_SECURE=true.",
    );
  }
  if (redirectUrl.protocol === "https:" && !cookieName.startsWith("__Host-")) {
    throw new Error(
      "HTTPS OIDC callbacks require GOODGOOD_AUTH_COOKIE_NAME to start with __Host-.",
    );
  }
  if (cookieName.startsWith("__Host-") && !secureCookie) {
    throw new Error("A __Host- authentication cookie requires GOODGOOD_AUTH_COOKIE_SECURE=true.");
  }

  return Object.freeze({
    clientId: required(environment, "GOODGOOD_AUTH_CLIENT_ID"),
    clientSecret: clientSecret(environment),
    cookieName,
    issuer: issuerUrl.toString().replace(/\/$/, ""),
    loginCookieName: `${cookieName}_login`,
    loginTtlSeconds: positiveInteger(
      environment,
      "GOODGOOD_AUTH_LOGIN_TTL_SECONDS",
      DEFAULT_LOGIN_TTL_SECONDS,
      30 * 60,
    ),
    logoutRedirectUri: new URL("/", redirectUrl).toString(),
    mode: "oidc",
    redirectUri: redirectUrl.toString(),
    scopes: "openid profile email",
    secureCookie,
    sessionTtlSeconds: positiveInteger(
      environment,
      "GOODGOOD_AUTH_SESSION_TTL_SECONDS",
      DEFAULT_SESSION_TTL_SECONDS,
      90 * 24 * 60 * 60,
    ),
  });
}

export function loadAuthenticationConfig(environment = process.env) {
  const mode = required(environment, "GOODGOOD_AUTH_MODE");
  const allowLocalAuth = parseBoolean(
    environment,
    "GOODGOOD_ALLOW_LOCAL_AUTH",
    false,
  );
  if (mode === "local") {
    if (!allowLocalAuth) {
      throw new Error(
        "GOODGOOD_AUTH_MODE=local requires GOODGOOD_ALLOW_LOCAL_AUTH=true.",
      );
    }
    return loadLocalConfig(environment);
  }
  if (mode === "oidc") {
    if (allowLocalAuth) {
      throw new Error(
        "GOODGOOD_ALLOW_LOCAL_AUTH must not be true when GOODGOOD_AUTH_MODE=oidc.",
      );
    }
    return loadOidcConfig(environment);
  }
  throw new Error(`GOODGOOD_AUTH_MODE=${mode} is not supported.`);
}

export function inspectAuthenticationConfiguration(environment = process.env) {
  try {
    loadAuthenticationConfig(environment);
    return { configured: true, missing: [] };
  } catch {
    const mode = environment.GOODGOOD_AUTH_MODE;
    const names =
      mode === "oidc"
        ? [
            "GOODGOOD_AUTH_MODE",
            "GOODGOOD_AUTH_ISSUER",
            "GOODGOOD_AUTH_CLIENT_ID",
            "GOODGOOD_AUTH_REDIRECT_URI",
          ]
        : [
            "GOODGOOD_AUTH_MODE",
            "GOODGOOD_ALLOW_LOCAL_AUTH",
            "GOODGOOD_LOCAL_AUTH_TOKENS",
          ];
    return {
      configured: false,
      missing: [
        ...names.filter((name) => !environment[name]),
        ...(mode === "oidc" &&
        !environment.GOODGOOD_AUTH_CLIENT_SECRET &&
        !environment.GOODGOOD_AUTH_CLIENT_SECRET_FILE
          ? [
              "GOODGOOD_AUTH_CLIENT_SECRET or GOODGOOD_AUTH_CLIENT_SECRET_FILE",
            ]
          : []),
      ],
    };
  }
}
