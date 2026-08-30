import { parseRuntimePort } from "./port.mjs";
import { createRuntimeHealthServer } from "./runtime-health.mjs";

const host = process.env.MOCK_GENERATION_HOST ?? "0.0.0.0";
const port = parseRuntimePort(
  process.env.MOCK_GENERATION_PORT,
  3002,
  "MOCK_GENERATION_PORT",
);
const health = createRuntimeHealthServer({
  host,
  port,
  service: "goodgood-mock-generation",
});

await health.listen();
health.markReady();

console.log(
  JSON.stringify({
    event: "mock_generation.ready",
    healthHost: host,
    healthPort: port,
    revision: process.env.GOODGOOD_REVISION ?? "development",
    service: "goodgood-mock-generation",
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
      event: "mock_generation.stopping",
      service: "goodgood-mock-generation",
      signal,
    }),
  );

  const forcedExit = setTimeout(() => {
    console.error(
      JSON.stringify({
        event: "mock_generation.stop_timeout",
        service: "goodgood-mock-generation",
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
