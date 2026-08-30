import { createRuntimeHealthServer } from "./runtime-health.mjs";
import { parseRuntimePort } from "./port.mjs";

const host = process.env.WORKER_HEALTH_HOST ?? "0.0.0.0";
const port = parseRuntimePort(
  process.env.WORKER_HEALTH_PORT,
  3001,
  "WORKER_HEALTH_PORT",
);
const health = createRuntimeHealthServer({
  host,
  port,
  service: "goodgood-worker",
});

await health.listen();
health.markReady();

console.log(
  JSON.stringify({
    event: "worker.ready",
    healthHost: host,
    healthPort: port,
    revision: process.env.GOODGOOD_REVISION ?? "development",
    service: "goodgood-worker",
  }),
);

let stopping = false;

async function stop(signal) {
  if (stopping) {
    return;
  }

  stopping = true;
  health.markNotReady("stopping");
  console.log(
    JSON.stringify({
      event: "worker.stopping",
      service: "goodgood-worker",
      signal,
    }),
  );

  const forcedExit = setTimeout(() => {
    console.error(
      JSON.stringify({
        event: "worker.stop_timeout",
        service: "goodgood-worker",
      }),
    );
    process.exit(1);
  }, 10_000);
  forcedExit.unref();

  await health.close();
  clearTimeout(forcedExit);
}

process.once("SIGINT", () => {
  void stop("SIGINT");
});
process.once("SIGTERM", () => {
  void stop("SIGTERM");
});
