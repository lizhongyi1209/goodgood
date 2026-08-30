import path from "node:path";
import { startProdServer } from "vinext/server/prod-server";
import { parseRuntimePort } from "./port.mjs";

const host = process.env.HOST ?? "0.0.0.0";
const port = parseRuntimePort(process.env.PORT, 3000, "PORT");
const { server } = await startProdServer({
  host,
  outDir: path.resolve(process.cwd(), "dist"),
  port,
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

  server.close((error) => {
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
  });
}

process.once("SIGINT", () => stop("SIGINT"));
process.once("SIGTERM", () => stop("SIGTERM"));
