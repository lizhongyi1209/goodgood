import path from "node:path";
import { startProdServer } from "vinext/server/prod-server";
import { createAssetNodeApiHandler } from "../assets/node-api.mjs";
import { createAdminNodeApiHandler } from "../admin/node-api.mjs";
import { createBillingNodeApiHandler } from "../billing/node-api.mjs";
import { loadAuthenticationConfig } from "../auth/config.mjs";
import { createAuthenticationNodeApiHandler } from "../auth/node-api.mjs";
import { createAuthenticationOperations } from "../auth/operations.mjs";
import {
  createRequestAuthenticator,
  createSessionAuthenticator,
  hasLocalSessionCookie,
  localSessionCookie,
} from "../auth/request-authenticator.mjs";
import { createGenerationNodeApiHandler } from "../generation/node-api.mjs";
import { createCreationDraftNodeApiHandler } from "../drafts/node-api.mjs";
import { createReferenceNodeApiHandler } from "../references/node-api.mjs";
import { createProjectNodeApiHandler } from "../projects/node-api.mjs";
import { observeHttpRequest } from "../observability/http.mjs";
import {
  closeGenerationResources,
  getGenerationResources,
  prepareObjectStorage,
} from "../generation/resources.mjs";
import { parseRuntimePort } from "./port.mjs";
import { createHostGenerationAdmission } from "./host-resource-admission.mjs";

const host = process.env.HOST ?? "0.0.0.0";
const port = parseRuntimePort(process.env.PORT, 3000, "PORT");
const authenticationConfig = loadAuthenticationConfig();
const runtimeResources = await getGenerationResources();
await prepareObjectStorage(runtimeResources);
const authenticate = createRequestAuthenticator({
  config: authenticationConfig,
  getPool: async () => runtimeResources.pool,
});
const authenticateSession = createSessionAuthenticator({
  config: authenticationConfig,
  getPool: async () => runtimeResources.pool,
});
const handleAuthenticationNodeApi = createAuthenticationNodeApiHandler({
  config: authenticationConfig,
  operations: createAuthenticationOperations({
    authenticate,
    authenticateSession,
    config: authenticationConfig,
    getPool: async () => runtimeResources.pool,
  }),
});
const hostGenerationAdmission = createHostGenerationAdmission();
const handleGenerationNodeApi = createGenerationNodeApiHandler({
  admitGeneration: hostGenerationAdmission.admitGeneration,
  authenticate,
});
const handleAdminNodeApi = createAdminNodeApiHandler({ authenticate });
const handleCreationDraftNodeApi = createCreationDraftNodeApiHandler({ authenticate });
const handleAssetNodeApi = createAssetNodeApiHandler({ authenticate });
const handleBillingNodeApi = createBillingNodeApiHandler({ authenticate });
const handleReferenceNodeApi = createReferenceNodeApiHandler({ authenticate });
const handleProjectNodeApi = createProjectNodeApiHandler({ authenticate });
const defaultSessionCookie = localSessionCookie(authenticationConfig);
const { server } = await startProdServer({
  host,
  outDir: path.resolve(process.cwd(), "dist"),
  port,
});

const vinextRequestListeners = server.listeners("request");
server.removeAllListeners("request");
server.on("request", (request, response) => {
  observeHttpRequest(request, response);
  const url = new URL(request.url ?? "/", "http://localhost");
  if (
    defaultSessionCookie &&
    request.method === "GET" &&
    !url.pathname.startsWith("/api/") &&
    request.headers.accept?.includes("text/html") &&
    !hasLocalSessionCookie(request, authenticationConfig)
  ) {
    response.setHeader("set-cookie", defaultSessionCookie);
  }
  void handleAuthenticationNodeApi(request, response)
    .then((handled) => (handled ? true : handleAdminNodeApi(request, response)))
    .then((handled) =>
      handled ? true : handleCreationDraftNodeApi(request, response),
    )
    .then((handled) =>
      handled ? true : handleReferenceNodeApi(request, response),
    )
    .then((handled) =>
      handled ? true : handleProjectNodeApi(request, response),
    )
    .then((handled) =>
      handled ? true : handleAssetNodeApi(request, response),
    )
    .then((handled) =>
      handled ? true : handleBillingNodeApi(request, response),
    )
    .then((handled) =>
      handled ? true : handleGenerationNodeApi(request, response),
    )
    .then((handled) => {
      if (handled) return;
      for (const listener of vinextRequestListeners) {
        listener.call(server, request, response);
      }
    })
    .catch((error) => {
      console.error(
        JSON.stringify({
          event: "web.node_api_failed",
          message: error instanceof Error ? error.message : String(error),
          requestId: response.getHeader("x-request-id"),
        }),
      );
      if (!response.headersSent) {
        response.writeHead(500, { "content-type": "application/json" });
      }
      response.end(JSON.stringify({ error: "internal_error" }));
    });
});

let stopping = false;

function stop(signal) {
  if (stopping) {
    return;
  }

  stopping = true;
  console.log(
    JSON.stringify({
      event: "web.stopping",
      service: "goodgood-web",
      signal,
    }),
  );

  const forcedExit = setTimeout(() => {
    console.error(
      JSON.stringify({
        event: "web.stop_timeout",
        service: "goodgood-web",
      }),
    );
    process.exit(1);
  }, 10_000);
  forcedExit.unref();

  server.close(async (error) => {
    clearTimeout(forcedExit);
    if (error) {
      console.error(
        JSON.stringify({
          error: error.message,
          event: "web.stop_failed",
          service: "goodgood-web",
        }),
      );
      process.exitCode = 1;
    }
    await closeGenerationResources();
  });
}

process.once("SIGINT", () => stop("SIGINT"));
process.once("SIGTERM", () => stop("SIGTERM"));
