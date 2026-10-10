import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { access } from "node:fs/promises";
import { setImmediate as flush } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import { build } from "esbuild";
import { createConcurrentJobRunner } from "../server/generation/concurrent-job-runner.mjs";

const removed = {
  error: { code: "FEATURE_REMOVED", message: "平台币功能已移除。" },
};

// Bundle the real entry point with an explicit import allowlist. No test import
// can connect a database, queue, provider or running Web/Worker process.
async function runIsolated(relative, dependencies = {}, globals = {}, format = "esm") {
  const result = await build({
    entryPoints: [fileURLToPath(new URL(`../${relative}`, import.meta.url))],
    bundle: true,
    format,
    platform: "node",
    write: false,
    logLevel: "silent",
    plugins: [{
      name: "isolated-runtime-dependencies",
      setup(builder) {
        builder.onResolve({ filter: /.*/ }, (args) => {
          if (args.kind === "entry-point") return;
          assert.ok(Object.hasOwn(dependencies, args.path), `Unexpected runtime dependency: ${args.path}`);
          return { path: args.path, namespace: "isolated" };
        });
        builder.onLoad({ filter: /.*/, namespace: "isolated" }, (args) => ({
          loader: "js",
          contents: Object.keys(dependencies[args.path]).map((name) => {
            const value = `globalThis.dependencies[${JSON.stringify(args.path)}][${JSON.stringify(name)}]`;
            return name === "default" ? `export default ${value};` : `export const ${name} = ${value};`;
          }).join("\n"),
        }));
      },
    }],
  });
  const sandboxModule = { exports: {} };
  await vm.runInNewContext(`(async () => {\n${result.outputFiles[0].text}\n})()`, {
    dependencies, module: sandboxModule, exports: sandboxModule.exports, Response, URL, ...globals,
  }, { timeout: 1_000 });
  return sandboxModule.exports;
}

test("GG-217 old framework API routes return no-store 410 without reading requests or importing services", async () => {
  for (const [file, method] of [
    ["app/api/jcoin/route.ts", "GET"],
    ["app/api/admin/jcoin/query/route.ts", "POST"],
    ["app/api/admin/jcoin/action/route.ts", "POST"],
  ]) {
    const route = await runIsolated(file, {}, {}, "cjs");
    const request = new Proxy({}, { get() { assert.fail("A retired route must not inspect credentials, body or query"); } });
    const response = await route[method](request);
    assert.equal(response.status, 410);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), removed);
  }
});

test("GG-217 Node Web intercepts retired reads and actions before authentication while billing and generation still work", async () => {
  const server = new EventEmitter();
  const calls = [];
  let resourceInitializations = 0;
  const resources = { pool: { query() { assert.fail("Retired requests must not query a database"); } } };
  const dependencies = {
    "node:path": { default: { resolve: () => "/isolated-dist" } },
    "./local-build-identity.mjs": { handleLocalBuildVersion: () => false },
    "vinext/server/prod-server": { startProdServer: async () => ({ server }) },
    "../auth/config.mjs": { loadAuthenticationConfig: () => ({}) },
    "../auth/operations.mjs": { createAuthenticationOperations: () => ({}) },
    "../auth/email-mailer.mjs": { createEmailOtpMailer: () => null },
    "../auth/email-operations.mjs": { createEmailOtpOperations: () => null },
    "../auth/request-authenticator.mjs": {
      createRequestAuthenticator: () => async () => assert.fail("Retired requests must not authenticate"),
      createSessionAuthenticator: () => async () => assert.fail("Retired requests must not authenticate sessions"),
      hasLocalSessionCookie: () => false,
      localSessionCookie: () => null,
    },
    "../observability/http.mjs": { observeHttpRequest() {} },
    "../announcements/realtime.mjs": { closeAnnouncementStreams: async () => {} },
    "../text-generation/repository.mjs": { recoverExpiredTextGenerations: async () => {} },
    "../generation/resources.mjs": {
      getGenerationResources: async () => { resourceInitializations++; return resources; },
      prepareObjectStorage: async () => {},
      closeGenerationResources: async () => {},
    },
    "./port.mjs": { parseRuntimePort: () => 0 },
    "./host-resource-admission.mjs": { createHostGenerationAdmission: () => ({ admitGeneration() {} }) },
  };
  for (const [file, name, handledPath] of [
    ["../assets/node-api.mjs", "createAssetNodeApiHandler"],
    ["../audio-materials/node-api.mjs", "createAudioMaterialNodeApiHandler"],
    ["../assets/organization-node-api.mjs", "createAssetOrganizationNodeApiHandler"],
    ["../profile/node-api.mjs", "createProfileNodeApiHandler"],
    ["../admin/node-api.mjs", "createAdminNodeApiHandler"],
    ["../billing/node-api.mjs", "createBillingNodeApiHandler", "/api/billing/summary"],
    ["../feedback/http.mjs", "createFeedbackNodeApiHandler"],
    ["../announcements/http.mjs", "createAnnouncementsNodeApiHandler"],
    ["../auth/node-api.mjs", "createAuthenticationNodeApiHandler"],
    ["../generation/node-api.mjs", "createGenerationNodeApiHandler", "/api/generations"],
    ["../text-generation/node-api.mjs", "createTextGenerationNodeApiHandler"],
    ["../video-generation/node-api.mjs", "createVideoGenerationNodeApiHandler"],
    ["../text-assets/node-api.mjs", "createTextAssetNodeApiHandler"],
    ["../image-cleanup/node-api.mjs", "createImageCleanupNodeApiHandler"],
    ["../drafts/node-api.mjs", "createCreationDraftNodeApiHandler"],
    ["../distribution/node-api.mjs", "createDistributionNodeApiHandler"],
    ["../references/node-api.mjs", "createReferenceNodeApiHandler"],
    ["../video-materials/node-api.mjs", "createVideoMaterialNodeApiHandler"],
    ["../projects/node-api.mjs", "createProjectNodeApiHandler"],
    ["../canvas-projects/node-api.mjs", "createCanvasProjectNodeApiHandler"],
    ["../organizations/node-api.mjs", "createOrganizationNodeApiHandler"],
  ]) {
    dependencies[file] = { [name]: () => async (request, response) => {
      calls.push(name);
      if (request.url !== handledPath) return false;
      response.writeHead(200, {});
      response.end(JSON.stringify({ handledBy: name }));
      return true;
    } };
  }
  await runIsolated("server/runtime/web.mjs", dependencies, {
    process: { env: {}, cwd: () => "/isolated", once() {} },
    console: { log() {}, error(entry) { assert.fail(entry); } },
    setInterval: () => ({ unref() {} }),
    clearInterval() {},
  });
  async function request(url, method, headers = {}) {
    return new Promise((resolve) => {
      const response = {
        writeHead(status, responseHeaders) { this.status = status; this.headers = responseHeaders; },
        getHeader() {},
        end(body) { resolve({ status: this.status, headers: this.headers, body: JSON.parse(body) }); },
      };
      server.emit("request", { url, method, headers }, response);
    });
  }
  for (const [url, method] of [
    ["/api/jcoin?cursor=malformed", "GET"],
    ["/api/admin/jcoin/query", "POST"],
    ["/api/admin/jcoin/action", "POST"],
    ["/api/admin/jcoin/action", "DELETE"],
  ]) {
    const response = await request(url, method, { "x-goodgood-admin-action": "1", "idempotency-key": "old-process-action" });
    assert.equal(response.status, 410);
    assert.equal(response.headers["cache-control"], "no-store");
    assert.deepEqual(response.body, removed);
    assert.deepEqual(calls, []);
    assert.equal(resourceInitializations, 1, "Only normal Web startup initializes resources");
  }
  assert.equal((await request("/api/billing/summary", "GET")).body.handledBy, "createBillingNodeApiHandler");
  assert.equal((await request("/api/generations", "POST")).body.handledBy, "createGenerationNodeApiHandler");
});

test("GG-217 Worker retains generation recovery, success/failure acknowledgement and draining without reward timers", async () => {
  const events = [];
  const signals = new Map();
  let releaseQueue;
  let finishJob;
  let finishShutdown;
  const activeJob = new Promise((resolve) => { finishJob = resolve; });
  const shutdown = new Promise((resolve) => { finishShutdown = resolve; });
  const emptyQueue = new Promise((resolve) => { releaseQueue = resolve; });
  const pending = ["successful-job", "failed-job"];
  const resources = {
    pool: { query() { assert.fail("No real SQL or reward query may run"); } },
    redis: {}, config: { workerLeaseMs: 1_000 },
  };
  const dependencies = {
    "./runtime-health.mjs": { createRuntimeHealthServer: () => ({
      listen: async () => events.push("listen"),
      markReady: () => events.push("ready"),
      markNotReady: () => events.push("not-ready"),
      close: async () => { events.push("health-closed"); finishShutdown(); },
    }) },
    "./port.mjs": { parseRuntimePort: () => 0 },
    "../generation/resources.mjs": {
      getGenerationResources: async () => resources,
      connectGenerationQueue: async () => events.push("queue-connected"),
      prepareObjectStorage: async () => events.push("storage-ready"),
      probeGenerationResources: async () => ({ isolated: "ok" }),
      closeGenerationResources: async () => events.push("resources-closed"),
    },
    "../generation/queue.mjs": {
      acknowledgeQueuedJob: async (redis, id) => { assert.equal(redis, resources.redis); events.push(`ack:${id}`); },
      dispatchPendingJobs: async () => events.push("dispatch"),
      reconcileRecoverableJobs: async (pool, lease) => { assert.equal(pool, resources.pool); assert.equal(lease, 1_000); events.push("recover"); },
      takeQueuedJob: async () => pending.length ? pending.shift() : emptyQueue,
    },
    "../generation/worker-service.mjs": {
      createWorkerId: () => "isolated-worker",
      processGenerationJob: async (actual, { jobId }) => {
        assert.equal(actual, resources);
        events.push(`run:${jobId}`);
        if (jobId === "failed-job") throw new Error("isolated failure");
        await activeJob;
        return { outcome: "succeeded" };
      },
    },
    "../generation/concurrent-job-runner.mjs": { createConcurrentJobRunner },
    "../video-generation/worker.mjs": { startVideoGenerationWorker: () => ({ stop: async () => {} }) },
  };
  await runIsolated("server/runtime/worker.mjs", dependencies, {
    process: { env: {}, once: (signal, handler) => signals.set(signal, handler) },
    console: { log() {}, error() {} },
    setInterval() { assert.fail("The Worker must not start automatic reward processing"); },
    setTimeout(callback) { queueMicrotask(callback); },
  });
  await flush();
  assert.ok(events.indexOf("recover") < events.indexOf("ready"));
  assert.ok(events.indexOf("dispatch") < events.indexOf("ready"));
  for (const job of ["successful-job", "failed-job"]) {
    assert.ok(events.includes(`run:${job}`));
  }
  assert.ok(events.includes("ack:failed-job"));
  assert.ok(!events.includes("ack:successful-job"));
  assert.ok(signals.has("SIGINT"));
  signals.get("SIGTERM")();
  releaseQueue(null);
  await flush();
  assert.ok(!events.includes("resources-closed"), "Shutdown must drain the in-flight generation first");
  finishJob();
  await shutdown;
  assert.ok(events.indexOf("not-ready") < events.indexOf("ack:successful-job"));
  assert.ok(events.indexOf("ack:successful-job") < events.indexOf("resources-closed"));
  assert.deepEqual(events.slice(-2), ["resources-closed", "health-closed"]);
});

test("GG-217 callable issuance modules and monetary DTOs are removed", async () => {
  for (const file of [
    "server/jcoin/api.mjs", "server/jcoin/errors.mjs", "server/jcoin/node-api.mjs",
    "server/jcoin/repository.mjs", "server/jcoin/route.ts",
    "shared/contracts/jcoin.mjs", "shared/contracts/jcoin.ts",
  ]) {
    await assert.rejects(access(new URL(`../${file}`, import.meta.url)), { code: "ENOENT" });
  }
});
