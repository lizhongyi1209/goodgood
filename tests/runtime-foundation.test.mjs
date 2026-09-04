import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseRuntimePort } from "../server/runtime/port.mjs";
import { createRuntimeHealthServer } from "../server/runtime/runtime-health.mjs";

async function loadBuiltWebWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("runtime-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

function workerContext() {
  return {
    passThroughOnException() {},
    waitUntil() {},
  };
}

test("web exposes separate liveness and readiness responses", async () => {
  const worker = await loadBuiltWebWorker();
  const environment = {
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
  };

  const live = await worker.fetch(
    new Request("http://localhost/api/health/live"),
    environment,
    workerContext(),
  );
  assert.equal(live.status, 200);
  assert.equal(live.headers.get("cache-control"), "no-store");
  assert.deepEqual(await live.json(), {
    service: "goodgood-web",
    status: "ok",
  });

  const ready = await worker.fetch(
    new Request("http://localhost/api/health/ready"),
    environment,
    workerContext(),
  );
  assert.equal(ready.status, 503);
  assert.deepEqual(await ready.json(), {
    checks: { configuration: "missing", runtime: "ok" },
    service: "goodgood-web",
    status: "not_ready",
  });
});

test("worker readiness follows startup and shutdown state", async (context) => {
  const health = createRuntimeHealthServer({
    host: "127.0.0.1",
    port: 0,
    service: "goodgood-worker",
  });
  await health.listen();
  context.after(() => health.close());

  const address = health.address();
  assert.ok(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;

  const live = await fetch(`${origin}/health/live`);
  assert.equal(live.status, 200);
  assert.deepEqual(await live.json(), {
    service: "goodgood-worker",
    status: "ok",
  });

  const starting = await fetch(`${origin}/health/ready`);
  assert.equal(starting.status, 503);
  assert.deepEqual(await starting.json(), {
    checks: { runtime: "starting" },
    service: "goodgood-worker",
    status: "not_ready",
  });

  health.markReady();
  const ready = await fetch(`${origin}/health/ready`);
  assert.equal(ready.status, 200);
  assert.equal((await ready.json()).status, "ready");

  health.markNotReady("stopping");
  const stopping = await fetch(`${origin}/health/ready`);
  assert.equal(stopping.status, 503);
  assert.equal((await stopping.json()).checks.runtime, "stopping");
});

test("worker health server rejects unsupported requests", async (context) => {
  const health = createRuntimeHealthServer({
    host: "127.0.0.1",
    port: 0,
    service: "goodgood-worker",
  });
  await health.listen();
  context.after(() => health.close());

  const address = health.address();
  assert.ok(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;

  const wrongMethod = await fetch(`${origin}/health/live`, { method: "POST" });
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.get("allow"), "GET");

  const missing = await fetch(`${origin}/missing`);
  assert.equal(missing.status, 404);
});

test("runtime ports reject invalid process configuration", () => {
  assert.equal(parseRuntimePort(undefined, 3000, "PORT"), 3000);
  assert.equal(parseRuntimePort("4317", 3000, "PORT"), 4317);
  assert.throws(
    () => parseRuntimePort("0", 3000, "PORT"),
    /PORT must be an integer between 1 and 65535/,
  );
  assert.throws(
    () => parseRuntimePort("not-a-port", 3000, "PORT"),
    /PORT must be an integer between 1 and 65535/,
  );
});

test("container image keeps one non-root runtime for both process commands", async () => {
  const [dockerfile, dockerignore, packageJson] = await Promise.all([
    readFile(new URL("../Dockerfile", import.meta.url), "utf8"),
    readFile(new URL("../.dockerignore", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  const packageData = JSON.parse(packageJson);

  assert.equal(packageData.scripts["start:web"], "node server/runtime/web.mjs");
  assert.equal(
    packageData.scripts["start:worker"],
    "node server/runtime/worker.mjs",
  );
  assert.match(dockerfile, /^ARG NODE_VERSION=24\.20\.0$/m);
  assert.match(dockerfile, /^ARG NODE_IMAGE_DIGEST=sha256:[a-f0-9]{64}$/m);
  assert.equal(
    dockerfile.match(
      /^FROM node:\$\{NODE_VERSION\}-bookworm-slim@\$\{NODE_IMAGE_DIGEST\} AS (?:build|runtime)$/gm,
    )?.length,
    2,
  );
  assert.match(dockerfile, /rm -rf \/usr\/local\/lib\/node_modules\/npm/);
  assert.match(dockerfile, /rm -f \/usr\/local\/bin\/npm \/usr\/local\/bin\/npx/);
  assert.match(dockerfile, /^USER node$/m);
  assert.match(dockerfile, /npm run build:runtime/);
  assert.match(dockerfile, /\/app\/migrations \.\/migrations/);
  assert.match(dockerfile, /\/app\/runtime-bundle \.\/server\/runtime/);
  assert.match(dockerfile, /^HEALTHCHECK /m);
  assert.match(dockerfile, /^CMD \["node", "server\/runtime\/web\.mjs"\]$/m);
  assert.doesNotMatch(dockerfile, /COPY \.env/);
  assert.match(dockerignore, /^\.env\*$/m);
  assert.match(dockerignore, /^\.npmrc$/m);
  assert.match(dockerignore, /^\.sites-runtime$/m);
  assert.match(dockerignore, /^node_modules$/m);
});
