import assert from "node:assert/strict";
import { createServer as createHttpServer } from "node:http";
import { createServer as createTcpServer } from "node:net";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  probeHttp,
  probeTcp,
  probeValkey,
} from "../infra/container/compose-probes.mjs";

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      assert.ok(address && typeof address === "object");
      resolve(address.port);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

test("compose contract pins the complete local dependency stack", async () => {
  const [compose, dockerfile, environmentExample, packageJson] =
    await Promise.all([
      readFile(new URL("../compose.yaml", import.meta.url), "utf8"),
      readFile(new URL("../Dockerfile", import.meta.url), "utf8"),
      readFile(new URL("../.env.example", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
    ]);
  const packageData = JSON.parse(packageJson);

  for (const service of [
    "web",
    "worker",
    "mock-generation",
    "migrate",
    "reference-cleanup",
    "postgres",
    "valkey",
    "object-storage",
  ]) {
    assert.match(compose, new RegExp(`^  ${service}:$`, "m"));
  }

  assert.match(compose, /postgres:17\.11-bookworm@sha256:[a-f0-9]{64}/);
  assert.match(compose, /valkey\/valkey:8\.1\.9-alpine3\.24@sha256:[a-f0-9]{64}/);
  assert.match(compose, /rustfs\/rustfs:1\.0\.0-rc\.3@sha256:[a-f0-9]{64}/);
  assert.doesNotMatch(compose, /:latest\b/);
  assert.doesNotMatch(compose, /^\s+- \.\//m);
  assert.match(compose, /^  postgres-data:$/m);
  assert.match(compose, /^  valkey-data:$/m);
  assert.match(compose, /^  object-storage-data:$/m);
  assert.match(compose, /condition: service_completed_successfully/);
  assert.match(compose, /OBJECT_STORAGE_PUBLIC_ENDPOINT:/);
  assert.match(compose, /OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS:/);
  for (const mapping of [
    "GOODGOOD_WEB_PORT:-3000}:3000",
    "GOODGOOD_WORKER_HEALTH_PORT:-3001}:3001",
    "GOODGOOD_MOCK_GENERATION_PORT:-3002}:3002",
    "GOODGOOD_POSTGRES_PORT:-5432}:5432",
    "GOODGOOD_VALKEY_PORT:-6379}:6379",
    "GOODGOOD_OBJECT_STORAGE_PORT:-9000}:9000",
    "GOODGOOD_OBJECT_STORAGE_CONSOLE_PORT:-9001}:9001",
  ]) {
    assert.ok(compose.includes("127.0.0.1:${" + mapping));
  }
  assert.doesNotMatch(compose, /"0\.0\.0\.0:[^\n]+:\d+"/);
  assert.match(compose, /^  goodgood-local:$/m);
  assert.match(compose, /^    driver: bridge$/m);
  assert.doesNotMatch(compose, /internal: true/);

  assert.equal(packageData.scripts["stack:config"], "docker compose config --quiet");
  assert.equal(
    packageData.scripts["stack:up"],
    "docker compose up --build --detach --wait",
  );
  assert.equal(
    packageData.scripts["stack:verify"],
    "node infra/container/verify-compose.mjs",
  );
  assert.equal(packageData.scripts["stack:down"], "docker compose down");
  assert.equal(
    packageData.scripts["references:cleanup"],
    "node server/runtime/reference-cleanup.mjs",
  );
  assert.match(dockerfile, /^EXPOSE 3000 3001 3002$/m);
  assert.match(dockerfile, /node_modules\/sharp \.\/node_modules\/sharp/);
  assert.match(dockerfile, /node_modules\/@img \.\/node_modules\/@img/);
  assert.match(compose, /GOODGOOD_ALLOW_LOCAL_AUTH: "true"/);
  assert.match(compose, /GOODGOOD_FAKE_PAYMENT_ENABLED: "true"/);
  assert.equal(
    (compose.match(/^\s{6}GOODGOOD_FAKE_PAYMENT_WEBHOOK_SECRET:/gm) ?? [])
      .length,
    1,
  );

  for (const name of [
    "GOODGOOD_LOCAL_POSTGRES_PASSWORD",
    "GOODGOOD_LOCAL_OBJECT_STORAGE_ACCESS_KEY",
    "GOODGOOD_LOCAL_OBJECT_STORAGE_SECRET_KEY",
    "GOODGOOD_LOCAL_GENERATION_API_KEY",
    "GOODGOOD_ALLOW_LOCAL_AUTH",
    "GOODGOOD_AUTH_MODE",
    "GOODGOOD_AUTH_ISSUER",
    "GOODGOOD_AUTH_COOKIE_NAME",
    "GOODGOOD_LOCAL_AUTH_TOKENS",
    "GOODGOOD_LOCAL_AUTH_DEFAULT_TOKEN",
    "GOODGOOD_FAKE_PAYMENT_ENABLED",
    "GOODGOOD_FAKE_PAYMENT_WEBHOOK_SECRET",
    "OBJECT_STORAGE_REGION",
    "OBJECT_STORAGE_FORCE_PATH_STYLE",
    "OBJECT_STORAGE_UPLOAD_ALLOWED_ORIGINS",
    "REFERENCE_CLEANUP_BATCH_SIZE",
    "REFERENCE_CLEANUP_GRACE_MINUTES",
    "REFERENCE_CLEANUP_LEASE_SECONDS",
    "REFERENCE_ORPHAN_RETENTION_DAYS",
  ]) {
    assert.ok(environmentExample.includes(`# ${name}=`));
  }
});

test("compose probes accept ready HTTP, PostgreSQL TCP, and Valkey PONG", async (context) => {
  const http = createHttpServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ready" }));
  });
  const tcp = createTcpServer((socket) => socket.end());
  const valkey = createTcpServer((socket) => {
    socket.once("data", () => socket.end("+PONG\r\n"));
  });
  const [httpPort, tcpPort, valkeyPort] = await Promise.all([
    listen(http),
    listen(tcp),
    listen(valkey),
  ]);
  context.after(() => Promise.all([close(http), close(tcp), close(valkey)]));

  assert.equal(
    await probeHttp({
      expectedJsonStatus: "ready",
      name: "http",
      url: `http://127.0.0.1:${httpPort}`,
    }),
    "http",
  );
  assert.equal(await probeTcp({ name: "tcp", port: tcpPort }), "tcp");
  assert.equal(
    await probeValkey({ name: "valkey", port: valkeyPort }),
    "valkey",
  );
});

test("compose probes reject unhealthy and malformed dependencies", async (context) => {
  const unhealthy = createHttpServer((_request, response) => {
    response.writeHead(503, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "not_ready" }));
  });
  const malformedValkey = createTcpServer((socket) => {
    socket.once("data", () => socket.end("-ERR unavailable\r\n"));
  });
  const [httpPort, valkeyPort] = await Promise.all([
    listen(unhealthy),
    listen(malformedValkey),
  ]);
  context.after(() => Promise.all([close(unhealthy), close(malformedValkey)]));

  await assert.rejects(
    probeHttp({ name: "http", url: `http://127.0.0.1:${httpPort}` }),
    /http: .* returned 503/,
  );
  await assert.rejects(
    probeValkey({ name: "valkey", port: valkeyPort }),
    /valkey: -ERR unavailable/,
  );
});
