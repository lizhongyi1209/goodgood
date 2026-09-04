import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import test from "node:test";
import { GenerationRequestError, generationApiError } from "../server/generation/api.mjs";
import {
  correlateRequest,
  observeHttpRequest,
  requestIdFor,
} from "../server/observability/http.mjs";

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      assert.ok(address && typeof address === "object");
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("production HTTP observation returns one server-owned support ID and a redacted completion event", async (context) => {
  const logs = [];
  const server = createServer((request, response) => {
    observeHttpRequest(request, response, {
      log: (entry) => logs.push(entry),
    });
    correlateRequest(request, {
      ignored: "must-not-appear",
      jobId: "39d98229-e3f4-4fdf-a79e-687111890cb5",
      ownerId: "f2b76f48-7369-40d7-bbbd-3e8ecb402ccc",
      providerTaskId: "task_safe-123",
    });
    const requestId = requestIdFor(request);
    const failure = generationApiError(
      new GenerationRequestError(
        "GENERATION_NOT_FOUND",
        "未找到该生成任务。",
        404,
      ),
      "39d98229-e3f4-4fdf-a79e-687111890cb5",
      requestId,
    );
    response.writeHead(failure.status, {
      "content-type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify(failure.body));
  });
  const origin = await listen(server);
  context.after(() => close(server));

  const response = await fetch(
    `${origin}/api/generations/39d98229-e3f4-4fdf-a79e-687111890cb5?token=must-not-appear`,
    { headers: { "x-request-id": "req_attacker-controlled" } },
  );
  const payload = await response.json();

  assert.equal(response.status, 404);
  assert.match(response.headers.get("x-request-id"), /^req_[0-9a-f-]{36}$/);
  assert.notEqual(response.headers.get("x-request-id"), "req_attacker-controlled");
  assert.equal(payload.error.requestId, response.headers.get("x-request-id"));
  assert.equal(logs.length, 1);
  assert.deepEqual(
    {
      event: logs[0].event,
      jobId: logs[0].jobId,
      method: logs[0].method,
      ownerId: logs[0].ownerId,
      providerTaskId: logs[0].providerTaskId,
      requestId: logs[0].requestId,
      route: logs[0].route,
      service: logs[0].service,
      statusCode: logs[0].statusCode,
    },
    {
      event: "http.request_completed",
      jobId: "39d98229-e3f4-4fdf-a79e-687111890cb5",
      method: "GET",
      ownerId: "f2b76f48-7369-40d7-bbbd-3e8ecb402ccc",
      providerTaskId: "task_safe-123",
      requestId: payload.error.requestId,
      route: "/api/generations/:jobId",
      service: "goodgood-web",
      statusCode: 404,
    },
  );
  assert.ok(Number.isInteger(logs[0].durationMs));
  assert.ok(logs[0].durationMs >= 0);
  assert.match(logs[0].timestamp, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(logs[0].ignored, undefined);
  assert.doesNotMatch(JSON.stringify(logs[0]), /must-not-appear/);
});

test("unsafe correlation values are omitted from structured HTTP events", async (context) => {
  const logs = [];
  const server = createServer((request, response) => {
    observeHttpRequest(request, response, {
      log: (entry) => logs.push(entry),
    });
    correlateRequest(request, {
      ownerId: "owner@example.com",
      providerTaskId: "task with spaces",
    });
    response.writeHead(204);
    response.end();
  });
  const origin = await listen(server);
  context.after(() => close(server));

  const response = await fetch(`${origin}/health/live`);
  assert.equal(response.status, 204);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].ownerId, undefined);
  assert.equal(logs[0].providerTaskId, undefined);
});

test("worker completion logs retain provider timing and credit correlation without inventing spend", async () => {
  const [runtime, service] = await Promise.all([
    readFile(new URL("../server/runtime/worker.mjs", import.meta.url), "utf8"),
    readFile(
      new URL("../server/generation/worker-service.mjs", import.meta.url),
      "utf8",
    ),
  ]);

  for (const field of [
    "customerCreditAmount",
    "customerCreditUnit",
    "durationMs",
    "ownerId",
    "provider",
    "providerLatencyMs",
    "providerTaskId",
    "routeVersion",
  ]) {
    assert.match(runtime, new RegExp(`${field}: result\\.${field}`));
  }
  assert.match(service, /quoted_credit_amount/);
  assert.match(service, /provider_task_id/);
  assert.doesNotMatch(runtime, /providerCost|upstreamCost/);
});
