import {
  authenticationApiError,
  authenticationErrorRedirect,
} from "./operations.mjs";
import { expiredAuthenticationLoginCookie } from "./request-authenticator.mjs";
import { requestIdFor } from "../observability/http.mjs";

const NO_STORE = { "cache-control": "no-store" };

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

export function createAuthenticationNodeApiHandler({ config, operations }) {
  if (!config) throw new Error("Authentication configuration is required.");
  if (!operations) throw new Error("Authentication operations are required.");

  return async function handleAuthenticationNodeApi(request, response) {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (!url.pathname.startsWith("/api/auth/")) return false;

    if (url.pathname === "/api/auth/login") {
      if (request.method !== "GET") {
        sendJson(response, 405, { error: "method_not_allowed" }, { allow: "GET" });
        return true;
      }
      try {
        const result = await operations.beginLogin(url.searchParams.get("returnTo"));
        redirect(response, 302, result.location, { "set-cookie": result.cookie });
      } catch (error) {
        const failure = authenticationApiError(error, requestIdFor(request));
        sendJson(response, failure.status, failure.body);
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
        sendJson(response, failure.status, failure.body);
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
        sendJson(response, failure.status, failure.body);
      }
      return true;
    }

    sendJson(response, 404, { error: "not_found" });
    return true;
  };
}
