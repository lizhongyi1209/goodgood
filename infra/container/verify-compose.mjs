import { parseRuntimePort } from "../../server/runtime/port.mjs";
import { probeHttp, probeTcp, probeValkey } from "./compose-probes.mjs";

function environmentPort(name, fallback) {
  return parseRuntimePort(process.env[name], fallback, name);
}

const probes = [
  probeHttp({
    expectedJsonStatus: "ready",
    name: "web",
    url: `http://127.0.0.1:${environmentPort("GOODGOOD_WEB_PORT", 3000)}/api/health/ready`,
  }),
  probeHttp({
    expectedJsonStatus: "ready",
    name: "worker",
    url: `http://127.0.0.1:${environmentPort("GOODGOOD_WORKER_HEALTH_PORT", 3001)}/health/ready`,
  }),
  probeHttp({
    expectedJsonStatus: "ready",
    name: "mock-generation",
    url: `http://127.0.0.1:${environmentPort("GOODGOOD_MOCK_GENERATION_PORT", 3002)}/health/ready`,
  }),
  probeTcp({
    name: "postgres",
    port: environmentPort("GOODGOOD_POSTGRES_PORT", 5432),
  }),
  probeValkey({
    name: "valkey",
    port: environmentPort("GOODGOOD_VALKEY_PORT", 6379),
  }),
  probeHttp({
    name: "object-storage",
    timeoutMs: 5_000,
    url: `http://127.0.0.1:${environmentPort("GOODGOOD_OBJECT_STORAGE_PORT", 9000)}/health/ready`,
  }),
];

try {
  const ready = await Promise.all(probes);
  console.log(`Compose services ready: ${ready.join(", ")}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
