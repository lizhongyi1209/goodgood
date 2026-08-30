const role = process.env.GOODGOOD_PROCESS ?? "web";

if (role !== "web" && role !== "worker" && role !== "mock-generation") {
  console.error(`Unsupported GOODGOOD_PROCESS: ${role}`);
  process.exit(1);
}

const rawPort =
  role === "worker"
    ? (process.env.WORKER_HEALTH_PORT ?? "3001")
    : role === "mock-generation"
      ? (process.env.MOCK_GENERATION_PORT ?? "3002")
      : (process.env.PORT ?? "3000");
const path = role === "web" ? "/api/health/ready" : "/health/ready";
const url = `http://127.0.0.1:${rawPort}${path}`;

try {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(2_000),
  });

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  const body = await response.json();
  if (body.status !== "ready") {
    throw new Error(`${url} did not report ready`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
