import path from "node:path";
import { startProdServer } from "vinext/server/prod-server";
import { parseRuntimePort } from "./port.mjs";
import { handleGenerationNodeApi } from "../generation/node-api.mjs";
import { closeGenerationResources } from "../generation/resources.mjs";

const host = process.env.HOST ?? "0.0.0.0";
const port = parseRuntimePort(process.env.PORT, 3000, "PORT");
const { server } = await startProdServer({
  host,
  outDir: path.resolve(process.cwd(), "dist"),
  port,
});

const vinextRequestListeners = server.listeners("request");
server.removeAllListeners("request");
server.on("request", (request, response) => {
  void handleGenerationNodeApi(request, response)
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
