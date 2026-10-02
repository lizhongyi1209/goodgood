import assert from "node:assert/strict";
import test from "node:test";
import { redactDiagnosticText, sanitizeFailureDiagnostic } from "../server/generation/failure-diagnostics.mjs";
import { NormalizedProviderError, downloadProviderOutput } from "../server/generation/provider.mjs";
import { createUsGatewayAdapter } from "../server/generation/us-gateway-adapter.mjs";
import { failGenerationJob } from "../server/generation/repository.mjs";
import { readOperationsDetail } from "../server/admin/operations-repository.mjs";
import { readSiteOperations } from "../server/admin/operations.mjs";

// Injected responses and in-memory repositories only; no DB/queue/provider.
const id = "00000000-0000-4000-8000-000000000318";
const apiKey = "gg318-example-secret";
const prompt = "private example prompt";
const job = { model_id: "nano-banana-2", aspect_ratio: "1:1", resolution: "1K", requested_count: 1, prompt };
const json = (payload, status = 200, headers = {}) => new Response(JSON.stringify(payload), { status, headers });
const adapter = (fetchImplementation, options = {}) => createUsGatewayAdapter({
  apiKey, baseUrl: "https://gateway.example.invalid", fetchImplementation, ...options,
});

test("GG-318 allowlist strips private content, credentials and signed output paths", () => {
  const result = sanitizeFailureDiagnostic({
    stage: "provider-submission", phase: "submission", method: "POST", httpStatus: 429,
    endpoint: "https://user:password@gateway.example.invalid/private/object.png?token=hidden",
    upstreamMessage: `${prompt} key=${apiKey} Bearer bearer-secret token='hidden' https://storage.example.invalid/object?sig=secret data:image/png;base64,abc`,
    upstreamCode: "rate_limit", upstreamRequestId: "req-318", prompt, headers: { authorization: apiKey },
    body: { images: ["hidden"] }, stack: "private stack", durationMs: 1234,
  }, { secrets: [apiKey, prompt] });
  assert.equal(result.endpoint, "https://gateway.example.invalid/[resource]");
  assert.equal(result.httpStatus, 429);
  assert.equal(result.durationMs, 1234);
  assert.equal(result.upstreamCode, "rate_limit");
  assert.doesNotMatch(JSON.stringify(result), /private example|gg318-example|bearer-secret|hidden|object\.png|private stack|authorization/);
  assert.equal(result.body, undefined);
  assert.equal(sanitizeFailureDiagnostic({ body: "private", httpStatus: -1, durationMs: NaN }), null);
  assert.equal(redactDiagnosticText(JSON.stringify({ prompt, token: apiKey })), "[structured error omitted]");
  assert.ok(redactDiagnosticText("error ".repeat(1000)).length <= 1000);
  assert.deepEqual(sanitizeFailureDiagnostic(result), result);
});

test("GG-318 HTTP failure retains status/request ID while preserving normalized billing behavior", async () => {
  const gateway = adapter(async () => json({ error: { code: "rate_limit", message: `too busy; ${prompt}; ${apiKey}` } }, 429,
    { "x-request-id": "req-429" }));
  await assert.rejects(gateway.submit({ job }), error => {
    assert.equal(error.code, "CAPACITY_BUSY");
    assert.equal(error.retryable, true);
    assert.equal(error.diagnostics.httpStatus, 429);
    assert.equal(error.diagnostics.upstreamRequestId, "req-429");
    assert.equal(error.diagnostics.phase, "submission");
    assert.equal(error.diagnostics.upstreamCode, "rate_limit");
    assert.doesNotMatch(error.diagnostics.upstreamMessage, /private example|gg318-example/);
    assert.equal(JSON.parse(JSON.stringify(error)).diagnostics, undefined);
    return true;
  });
  await assert.rejects(adapter(async () => json({ error: { message: "internal error" } }, 503)).submit({ job }),
    error => error.code === "SUBMISSION_UNKNOWN" && error.diagnostics.httpStatus === 503);
});

test("GG-318 accepted submissions remain unchanged and diagnostics never enter the request", async () => {
  let calls = 0;
  const gateway = adapter(async (url, options) => {
    calls++;
    assert.equal(options.sensitiveValues, undefined);
    assert.equal(options.diagnostics, undefined);
    assert.equal(JSON.parse(options.body).prompt, prompt);
    return json({ task_id: "accepted-318" });
  });
  assert.deepEqual(await gateway.submit({ job }), { taskId: "accepted-318" });
  assert.equal(calls, 1);
});

test("GG-318 malformed response and network failures retain distinct causes", async () => {
  await assert.rejects(adapter(async () => new Response("not-json", { status: 429 })).submit({ job }),
    error => error.code === "CAPACITY_BUSY" && error.diagnostics.reason === "invalid-json" && error.diagnostics.httpStatus === 429);
  await assert.rejects(adapter(async () => { throw Object.assign(new TypeError("private raw message"), { cause: { code: "ECONNRESET" } }); }).submit({ job }),
    error => error.code === "SUBMISSION_UNKNOWN" && error.diagnostics.networkCode === "ECONNRESET" && !JSON.stringify(error.diagnostics).includes("private raw"));
  await assert.rejects(adapter(async () => json({})).submit({ job }),
    error => error.code === "SUBMISSION_UNKNOWN" && error.diagnostics.reason === "missing-task-id" && error.diagnostics.httpStatus === 200);
});

test("GG-318 HTTP 200 task failure keeps terminal confirmation stable across changing headers/timing", async () => {
  let calls = 0, clock = 0;
  const gateway = adapter(async () => json({ task_id: "upstream-318", status: "FAILURE",
    error: { code: "busy", message: "capacity unavailable" } }, 200, { "x-request-id": `poll-${++calls}` }),
  { now: () => clock++, sleep: async () => { clock += 10; } });
  const result = await gateway.waitForTerminal({ taskId: "upstream-318", timeoutMs: 1000, pollIntervalMs: 10 });
  assert.equal(calls, 3);
  assert.equal(result.state, "failed");
  assert.equal(result.failures[0].diagnostics.httpStatus, 200);
  assert.equal(result.failures[0].diagnostics.upstreamRequestId, "poll-3");
  assert.equal(result.failures[0].diagnostics.upstreamTaskId, "upstream-318");
  assert.equal(result.failures[0].diagnostics.reason, "upstream-task-failed");
  assert.equal(JSON.parse(JSON.stringify(result)).failures[0].diagnostics, undefined);
  await assert.rejects(adapter(async () => json({ task_id: "upstream-318", status: "IN_PROGRESS" }),
    { now: () => clock++, sleep: async () => { clock += 10; } }).waitForTerminal({ taskId: "upstream-318", timeoutMs: 20 }),
    error => error.code === "MODEL_TIMEOUT" && error.diagnostics.reason === "poll-timeout");
});

test("GG-318 failed output download hides signed URL and retains HTTP status", async () => {
  await assert.rejects(downloadProviderOutput({ url: "https://storage.example.invalid/private.png?signature=hidden" },
    { fetchImplementation: async () => new Response("private body", { status: 403 }) }), error => {
      assert.equal(error.diagnostics.httpStatus, 403);
      assert.equal(error.diagnostics.phase, "output-download");
      assert.equal(error.diagnostics.endpoint, "https://storage.example.invalid/[resource]");
      assert.doesNotMatch(JSON.stringify(error.diagnostics), /private\.png|signature|private body/);
      return true;
    });
});

test("GG-318 final failure diagnostics share the existing terminal transaction", async () => {
  const statements = [];
  const client = { release() {}, async query(sql, values = []) {
    statements.push({ sql, values });
    if (sql.includes("SELECT state, owner_id")) return { rows: [{ state: "running", owner_id: id, lease_owner: "worker" }] };
    return { rows: [], rowCount: 1 };
  } };
  await failGenerationJob({ connect: async () => client }, { attemptId: id, jobId: id, workerId: "worker",
    error: new NormalizedProviderError({ code: "CAPACITY_BUSY", message: "busy" }),
    diagnostics: { attemptId: id, stage: "provider-submission", httpStatus: 429, body: "discard me" } });
  const event = statements.find(item => item.sql.includes("INSERT INTO generation_job_events"));
  const detail = JSON.parse(event.values.find(value => typeof value === "string" && value.startsWith("{")));
  assert.equal(detail.diagnostic.httpStatus, 429);
  assert.equal(detail.diagnostic.attemptId, id);
  assert.equal(detail.diagnostic.body, undefined);
  assert.equal(statements.at(-1).sql, "COMMIT");
});

test("GG-318 owner detail returns bounded sanitized diagnostics and rejects non-owners before reads", async () => {
  const pool = { async query(sql) {
    if (sql.includes("generation_job_events")) {
      assert.match(sql, /LIMIT 50/);
      return { rows: [{ id: "318", created_at: "2026-10-02T14:00:00Z", event_type: "provider_failed",
        diagnostic: { stage: "provider-submission", httpStatus: 429, upstreamMessage: "Bearer hidden", headers: { token: "secret" } } }] };
    }
    if (sql.includes("WITH ledger")) return { rows: [] };
    return { rows: [{ id, state: "failed", created_at: "2026-10-02T14:00:00Z" }] };
  } };
  const result = await readOperationsDetail(pool, { kind: "tasks", id });
  assert.equal(result.diagnostics[0].id, "318");
  assert.equal(result.diagnostics[0].diagnostic.httpStatus, 429);
  assert.doesNotMatch(JSON.stringify(result.diagnostics), /hidden|secret|headers/);
  for (const ownerContext of [null, { ownerId: id, systemRole: "member" }]) {
    await assert.rejects(readSiteOperations({ action: "detail", input: { kind: "tasks", id }, ownerContext,
      resources: { pool: { query() { assert.fail("No unauthorized read"); } } } }), error => [401,403].includes(error.status));
  }
  const legacy = await readOperationsDetail({ query: async sql => ({ rows: sql.includes("WHERE j.id") ? [{ id, state: "failed" }] : [] }) }, { kind: "tasks", id });
  assert.deepEqual(legacy.diagnostics, []);
});
