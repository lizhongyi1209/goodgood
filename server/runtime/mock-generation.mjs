import { createMockProviderServer } from "../generation/mock-provider-server.mjs";
import { parseRuntimePort } from "./port.mjs";

const host = process.env.MOCK_GENERATION_HOST ?? "0.0.0.0";
const port = parseRuntimePort(
  process.env.MOCK_GENERATION_PORT,
  3002,
  "MOCK_GENERATION_PORT",
);
const apiKey = process.env.GENERATION_API_KEY;
if (!apiKey) throw new Error("GENERATION_API_KEY is required.");

const mock = createMockProviderServer({ apiKey, host, port });
await mock.listen();

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
  if (stopping) return;
  stopping = true;
  mock.markNotReady("stopping");
  console.log(
    JSON.stringify({
      event: "mock_generation.stopping",
      service: "goodgood-mock-generation",
      signal,
    }),
  );
  await mock.close();
}

process.once("SIGINT", () => void stop("SIGINT"));
process.once("SIGTERM", () => void stop("SIGTERM"));
