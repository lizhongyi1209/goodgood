import assert from "node:assert/strict";
import test from "node:test";
import { createUsGatewayAdapter, normalizeUsGatewayTask } from "../server/generation/us-gateway-adapter.mjs";
import { sanitizeFailureDiagnostic } from "../server/generation/failure-diagnostics.mjs";
import { readOperationsDetail } from "../server/admin/operations-repository.mjs";

// Synthetic injected responses only. No real provider, database or queue.
const image = { url: "https://assets.example.invalid/private.png?signature=private", mime_type: "image/png" };
const success = (images = [image]) => ({ task_id: "synthetic-350", status: "SUCCESS", data: { images } });
const inline = "c3ludGhldGljLWltYWdlLTM1MA==";

function rejectsTask(payload, reason, details = {}, options = {}) {
  assert.throws(() => normalizeUsGatewayTask(payload, options), error => {
    assert.equal(error.code, "INTERNAL_ERROR");
    assert.equal(error.retryable, true);
    assert.equal(error.diagnostics.reason, reason);
    for (const [key, value] of Object.entries(details)) assert.equal(error.diagnostics[key], value);
    assert.doesNotMatch(JSON.stringify(error.diagnostics), /private\.png|signature|c3ludGhldGlj/);
    return true;
  });
}

test("GG-350 valid URL outputs and empty nonterminal/failed responses retain their behavior", () => {
  const result = normalizeUsGatewayTask(success([{ ...image, b64_json: inline }]));
  assert.equal(result.state, "succeeded");
  assert.equal(result.outputs[0].url, image.url);
  assert.equal(result.outputs[0].mimeType, "image/png");
  for (const status of ["SUBMITTED", "IN_PROGRESS"]) {
    const task = normalizeUsGatewayTask({ task_id: "synthetic-350", status });
    assert.equal(task.outputs.length, 0);
    assert.equal(task.terminal, false);
  }
  const failure = normalizeUsGatewayTask({ task_id: "synthetic-350", status: "FAILURE", error: "policy rejected" });
  assert.equal(failure.failures[0].code, "MODEL_REJECTED");
});

test("GG-350 base64 is identified only when no accepted URL is available", () => {
  for (const output of [
    { url: `data:image/png;base64,${inline}`, mime_type: "image/png" },
    { b64_json: inline }, { base64: inline }, { image_base64: inline },
  ]) rejectsTask(success([output]), "task-image-base64", { outputOrdinal: 1 });
  rejectsTask({ ...success(), data: { b64_json: inline } }, "task-image-base64");
  rejectsTask(success([{ b64_json: "" }]), "task-image-url-missing", { outputOrdinal: 1 });
  rejectsTask(success([{ url: inline }]), "task-image-url-invalid", { outputOrdinal: 1 });
  rejectsTask(success([{ url: "bad link", b64_json: inline }]), "task-image-url-invalid", { outputOrdinal: 1 });
});

test("GG-350 URL and MIME failures identify the affected output without retaining its contents", () => {
  rejectsTask(success([{}]), "task-image-url-missing", { outputOrdinal: 1 });
  rejectsTask(success([{ ...image, url: " " }]), "task-image-url-missing");
  rejectsTask(success([{ ...image, url: "/relative.png" }]), "task-image-url-invalid");
  rejectsTask(success([{ ...image, url: "http://assets.example.invalid/private.png" }]), "task-image-url-unsupported");
  rejectsTask(success([{ ...image, url: "file:///private.png" }]), "task-image-url-unsupported");
  for (const output of [{ url: image.url }, { ...image, mime_type: "text/html" }]) {
    rejectsTask(success([image, output]), "task-image-mime-invalid", { outputOrdinal: 2 }, { expectedOutputCount: 2 });
  }
  const local = normalizeUsGatewayTask(success([{ ...image, url: "http://127.0.0.1:1234/image.png" }]), { allowInsecureLoopback: true });
  assert.equal(local.state, "succeeded");
});

test("GG-350 task fields, output count and state conflicts have separate reasons", () => {
  rejectsTask({ ...success(), task_id: null }, "task-id-invalid");
  rejectsTask({ ...success(), status: "unexpected private status" }, "task-status-invalid");
  rejectsTask(success({}), "task-images-invalid");
  rejectsTask(success([]), "task-image-count-mismatch", { expectedOutputCount: 1, actualOutputCount: 0 });
  rejectsTask(success([image, image]), "task-image-count-mismatch", { expectedOutputCount: 1, actualOutputCount: 2 });
  rejectsTask({ ...success(), status: "IN_PROGRESS" }, "task-state-images-mismatch");
});

test("GG-350 polling preserves the precise reason and HTTP/request context", async () => {
  const gateway = createUsGatewayAdapter({
    apiKey: "synthetic-secret-350", baseUrl: "https://gateway.example.invalid",
    fetchImplementation: async () => new Response(JSON.stringify(success([{ b64_json: inline }])), {
      status: 200, headers: { "content-type": "application/json", "x-request-id": "request-350" },
    }),
  });
  await assert.rejects(gateway.getTask("synthetic-350", 1), error => {
    assert.equal(error.diagnostics.reason, "task-image-base64");
    assert.equal(error.diagnostics.httpStatus, 200);
    assert.equal(error.diagnostics.upstreamRequestId, "request-350");
    assert.equal(error.diagnostics.upstreamTaskId, "synthetic-350");
    assert.equal(error.diagnostics.outputOrdinal, 1);
    assert.equal(error.diagnostics.phase, "task-poll");
    assert.doesNotMatch(JSON.stringify(error.diagnostics), /c3ludGhldGlj|synthetic-secret/);
    assert.equal(JSON.parse(JSON.stringify(error)).diagnostics, undefined);
    return true;
  });
});

test("GG-350 counts and ordinals survive both allowlist boundaries; unsafe values do not", async () => {
  const diagnostic = sanitizeFailureDiagnostic({
    reason: "task-image-count-mismatch", expectedOutputCount: 1, actualOutputCount: 0, outputOrdinal: 2,
    body: success(), base64: inline, url: image.url,
  });
  assert.equal(diagnostic.actualOutputCount, 0);
  assert.deepEqual(sanitizeFailureDiagnostic(diagnostic), diagnostic);
  assert.doesNotMatch(JSON.stringify(diagnostic), /c3ludGhldGlj|signature|body/);
  const invalid = sanitizeFailureDiagnostic({ reason: "task-image-count-mismatch", expectedOutputCount: -1, actualOutputCount: "0", outputOrdinal: 0 });
  assert.equal(invalid.expectedOutputCount, undefined);
  assert.equal(invalid.actualOutputCount, undefined);
  assert.equal(invalid.outputOrdinal, undefined);
  const result = await readOperationsDetail({ async query(sql) {
    if (sql.includes("generation_job_events")) return { rows: [{ id: "350", created_at: "2026-10-03T10:54:15Z", event_type: "provider_failed", diagnostic }] };
    if (sql.includes("WHERE j.id=")) return { rows: [{ id: "00000000-0000-4000-8000-000000000350", state: "failed", created_at: "2026-10-03T10:54:15Z" }] };
    return { rows: [] };
  } }, { kind: "tasks", id: "00000000-0000-4000-8000-000000000350" });
  assert.deepEqual(result.diagnostics[0].diagnostic, diagnostic);
  assert.equal(sanitizeFailureDiagnostic({ reason: "invalid-task-response" }).reason, "invalid-task-response");
});
