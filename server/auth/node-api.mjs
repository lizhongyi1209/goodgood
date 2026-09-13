import {
  authenticationApiError,
  authenticationErrorRedirect,
} from "./operations.mjs";
import { authenticationRequestError } from "./errors.mjs";
import { expiredAuthenticationLoginCookie } from "./request-authenticator.mjs";
import { requestIdFor } from "../observability/http.mjs";

const NO_STORE = { "cache-control": "no-store" };
const EMAIL_BODY_LIMIT = 2 * 1024;

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    ...NO_STORE,
    "content-type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function redirect(response, statusCode, location, headers = {}) {
  response.writeHead(statusCode, { ...NO_STORE, location, ...headers });
  response.end();
}

function failureHeaders(failure) {
  const retryAfter = failure.body?.error?.retryAfterSeconds;
  return retryAfter ? { "retry-after": String(retryAfter) } : {};
}

async function readJson(request) {
  const rawContentType = typeof request.headers?.get === "function"
    ? request.headers.get("content-type")
    : request.headers?.["content-type"];
  const contentType = String(rawContentType ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    throw new TypeError("Authentication requests require application/json.");
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > EMAIL_BODY_LIMIT) {
      throw new TypeError("Authentication request body is too large.");
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new TypeError("Authentication request body is invalid.");
  }
}

export function createAuthenticationNodeApiHandler({
  config,
  emailOperations = null,
  operations,
}) {
  if (!config) throw new Error("Authentication configuration is required.");
  if (!operations) throw new Error("Authentication operations are required.");

  return async function handleAuthenticationNodeApi(request, response) {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (!url.pathname.startsWith("/api/auth/")) return false;

    if (url.pathname === "/api/auth/method") {
      if (request.method !== "GET") {
        sendJson(response, 405, { error: "method_not_allowed" }, { allow: "GET" });
        return true;
      }
      sendJson(response, 200, {
        method: config.mode === "email_otp" ? "email_code" : "hosted",
      });
      return true;
    }

    if (url.pathname === "/api/auth/email/challenge") {
      if (request.method !== "GET") {
        sendJson(response, 405, { error: "method_not_allowed" }, { allow: "GET" });
        return true;
      }
      if (!emailOperations) {
        sendJson(response, 404, { error: "not_found" });
        return true;
      }
      try {
        sendJson(response, 200, await emailOperations.readChallenge(request));
      } catch (error) {
        const failure = authenticationApiError(error, requestIdFor(request));
        sendJson(response, failure.status, failure.body, failureHeaders(failure));
      }
      return true;
    }

    if (
      url.pathname === "/api/auth/email/request" ||
      url.pathname === "/api/auth/email/verify"
    ) {
      if (request.method !== "POST") {
        sendJson(response, 405, { error: "method_not_allowed" }, { allow: "POST" });
        return true;
      }
      if (!emailOperations) {
        sendJson(response, 404, { error: "not_found" });
        return true;
      }
      try {
        const input = await readJson(request);
        if (url.pathname.endsWith("/request")) {
          const result = await emailOperations.requestCode(input, request);
          sendJson(response, 202, result.body, { "set-cookie": result.cookie });
        } else {
          const result = await emailOperations.verifyCode(input, request);
          sendJson(response, 200, result.body, { "set-cookie": result.cookies });
        }
      } catch (error) {
        const normalizedError = error instanceof TypeError
          ? authenticationRequestError(
              "AUTH_REQUEST_INVALID",
              "登录请求内容无效。",
            )
          : error;
        const failure = authenticationApiError(
          normalizedError,
          requestIdFor(request),
        );
        sendJson(response, failure.status, failure.body, failureHeaders(failure));
      }
      return true;
    }

    if (url.pathname === "/api/auth/login") {
      if (request.method !== "GET") {
        sendJson(response, 405, { error: "method_not_allowed" }, { allow: "GET" });
        return true;
      }
      try {
        const result = await operations.beginLogin(url.searchParams.get("returnTo"), request);
        redirect(
          response,
          302,
          result.location,
          result.cookie ? { "set-cookie": result.cookie } : {},
        );
      } catch (error) {
        const failure = authenticationApiError(error, requestIdFor(request));
        sendJson(response, failure.status, failure.body, failureHeaders(failure));
      }
      return true;
    }

    if (url.pathname === "/api/auth/callback") {
      if (request.method !== "GET") {
        sendJson(response, 405, { error: "method_not_allowed" }, { allow: "GET" });
        return true;
      }
      try {
        const result = await operations.completeLogin(
          {
            code: url.searchParams.get("code"),
            error: url.searchParams.get("error"),
            state: url.searchParams.get("state"),
          },
          request,
        );
        redirect(response, 303, result.location, { "set-cookie": result.cookies });
      } catch (error) {
        const headers =
          config?.mode === "oidc"
            ? { "set-cookie": expiredAuthenticationLoginCookie(config) }
            : {};
        redirect(
          response,
          303,
          authenticationErrorRedirect(error, requestIdFor(request)),
          headers,
        );
      }
      return true;
    }

    if (url.pathname === "/api/auth/session") {
      if (request.method !== "GET") {
        sendJson(response, 405, { error: "method_not_allowed" }, { allow: "GET" });
        return true;
      }
      try {
        sendJson(response, 200, await operations.readSession(request));
      } catch (error) {
        const failure = authenticationApiError(error, requestIdFor(request));
        sendJson(response, failure.status, failure.body, failureHeaders(failure));
      }
      return true;
    }

    if (url.pathname === "/api/auth/logout") {
      if (request.method !== "POST") {
        sendJson(response, 405, { error: "method_not_allowed" }, { allow: "POST" });
        return true;
      }
      try {
        const result = await operations.signOut(request);
        if (result.location) {
          sendJson(
            response,
            200,
            { redirectTo: result.location },
            { "set-cookie": result.cookie },
          );
        } else {
          response.writeHead(204, { ...NO_STORE, "set-cookie": result.cookie });
          response.end();
        }
      } catch (error) {
        const failure = authenticationApiError(error, requestIdFor(request));
        sendJson(response, failure.status, failure.body, failureHeaders(failure));
      }
      return true;
    }

    sendJson(response, 404, { error: "not_found" });
    return true;
  };
}
