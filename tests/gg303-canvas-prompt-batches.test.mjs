import assert from "node:assert/strict";
import test, { after } from "node:test";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

import { parseCanvasImagePrompts, canvasGeneratorJobs, canvasGeneratorOutputs, canvasImageJobIsActive,
  canvasImageBatchCreditAmount, recoverCanvasImageJob } from "../features/canvas/canvas-image-prompt-batch.mjs";
import { CANVAS_PROMPT_MAX_LENGTH, collectCanvasTextInputs, combineCanvasPrompt } from "../features/canvas/canvas-text-input.mjs";
import { parsePromptBatch } from "../shared/contracts/prompt-batch.mjs";
import { validateCanvasProjectSave } from "../server/canvas-projects/validation.mjs";
import { saveCanvasProjectRecord } from "../server/canvas-projects/repository.mjs";

// Synthetic inputs/stubs only. No fixture database, HTTP or provider calls.
const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root,
  resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false, ws: false } });
after(() => vite.close());
const { createGenerationInputSnapshot } = await vite.ssrLoadModule("/features/creation/generation-snapshot.ts");
const { pendingCanvasImageJob, runCanvasGeneratorBatch } = await vite.ssrLoadModule("/features/canvas/canvas-generator-batch.ts");
const { canvasMarkdownPlainText } = await vite.ssrLoadModule("/features/canvas/canvas-markdown.ts");
const { snapshotCanvasProject, remoteCanvasProjectDocument, pendingCanvasProjectContent } = await vite.ssrLoadModule("/features/canvas/canvas-project-snapshot.ts");
const { canvasCropImageForNode } = await vite.ssrLoadModule("/features/canvas/canvas-image-crop-image.ts");
const { canvasPageHasActiveWork } = await vite.ssrLoadModule("/features/canvas/canvas-project-pages.ts");

const input = (prompt = "画面", count = 4) => createGenerationInputSnapshot({
  prompt, count, modelId: "nano-banana-2", aspectRatio: "3:4", resolution: "2K",
  routingPolicy: "canvas-image-v1", expectedPriceVersion: 2, canvasProjectId: randomUUID(),
  references: [{ id: randomUUID(), name: "参考图", url: "https://private.invalid/reference", status: "ready" }],
});
function job(prompt = "画面", state = "succeeded", count = 4) {
  return { id: randomUUID(), state, input: input(prompt, count), error: state === "failed"
    ? { code: "INTERNAL_ERROR", title: "失败", message: "请重试", retryable: true } : null,
  outputs: state === "succeeded" ? Array.from({ length: count }, () => ({ id: randomUUID(),
    previewUrl: "https://private.invalid/output", previewPosition: "center", width: 600, height: 800 })) : [],
  createdAt: "2026-10-02T00:00:00Z", updatedAt: "2026-10-02T00:00:01Z" };
}
const generator = (jobs) => ({ id: "generator-1", type: "imageGenerator", position: { x: 1, y: 2 },
  style: { width: 180, height: 240 }, data: { sequence: 1, job: jobs[0], jobs, imageSized: true } });
function snapshot(jobs, prompt = "第一段\n---\n第二段") {
  return snapshotCanvasProject({ nodes: [generator(jobs)], edges: [],
    draftsByGenerator: { "generator-1": { prompt, modelKey: "nano-banana-2", ratio: "3:4", resolution: "2K", count: 4 } },
    referencesByGenerator: {}, convertedReferences: {}, viewport: { x: 0, y: 0, zoom: 1 } });
}
const save = (document) => ({ name: "批量画布", expectedVersion: null, document: JSON.parse(JSON.stringify(document)) });

test("standalone English/Chinese separators normalize CRLF and retain ordered duplicate nonempty segments", () => {
  const batch = parseCanvasImagePrompts("\r\n --- \r\n第一段\r\n\t———\t\r\n第二段\r\n　－－－　\r\n第一段\r\n---\r\n\r\n");
  assert.equal(batch.hasSeparator, true);
  assert.deepEqual(batch.prompts, ["第一段", "第二段", "第一段"]);
  assert.equal(batch.prompts.length * 4, 12);
  assert.equal(canvasImageBatchCreditAmount("100", batch.prompts.length), "300");
  assert.equal(canvasImageBatchCreditAmount("9007199254740993", 3), "27021597764222979");
});

test("empty segments submit nothing; inline, longer and mixed rules stay literal; video/gallery stay unchanged", () => {
  assert.deepEqual(parseCanvasImagePrompts("---\n———\n－－－\n ").prompts, []);
  assert.deepEqual(parseCanvasImagePrompts(" \n ").prompts, []);
  for (const text of ["前---后", "前———后", "----", "————", "－－－－", "-—-", "--"]) {
    assert.equal(parseCanvasImagePrompts(text).hasSeparator, false);
    assert.deepEqual(parseCanvasImagePrompts(text).prompts, [text]);
  }
  assert.deepEqual(parsePromptBatch("第一段\n———\n第二段").prompts, ["第一段\n———\n第二段"]);
});

test("native Markdown rules survive connected text composition with generator additions", () => {
  const firstText = canvasMarkdownPlainText("**第一段**\n\n---\n\n第二段");
  assert.equal(firstText, "第一段\n---\n第二段");
  const nodes = [generator([]), { id: "text-1", type: "textEditor", data: { text: firstText } },
    { id: "text-2", type: "textGenerator", data: { text: "———\n第三段" } }];
  const edge = (source) => ({ id: source, source, target: "generator-1", sourceHandle: "text", targetHandle: "reference" });
  const combined = combineCanvasPrompt(collectCanvasTextInputs(nodes, [edge("text-1"), edge("text-2")], "generator-1"), "---\n第四段");
  assert.deepEqual(parseCanvasImagePrompts(combined).prompts, ["第一段", "第二段", "第三段", "第四段"]);
  assert.equal(canvasMarkdownPlainText("`a---b`\n\n普通文本"), "a---b\n普通文本");
});

test("batch source may exceed 4000 with valid segments and has no new segment/output ceiling", () => {
  const source = Array.from({ length: 65 }, (_, index) => `${index}:${"字".repeat(100)}`).join("\n---\n");
  const batch = parseCanvasImagePrompts(source);
  assert.ok(source.length > CANVAS_PROMPT_MAX_LENGTH);
  assert.equal(batch.prompts.length, 65);
  assert.ok(batch.prompts.every((prompt) => prompt.length <= CANVAS_PROMPT_MAX_LENGTH));
  assert.equal(batch.prompts.length * 12, 780);
  assert.equal(validateCanvasProjectSave(save(remoteCanvasProjectDocument(snapshot([], source)))).document.generators["generator-1"].draft.prompt, source);
  assert.equal(parseCanvasImagePrompts(`短\n---\n${"字".repeat(4001)}`).prompts.findIndex((prompt) => prompt.length > CANVAS_PROMPT_MAX_LENGTH), 1);
});

test("all submissions start concurrently with frozen shared settings and ordered partial success", async () => {
  const base = input("模板");
  const snapshots = ["第一段", "第二段", "第三段"].map((prompt) => createGenerationInputSnapshot({ ...base, references: [...base.references], prompt }));
  let jobs = snapshots.map(pendingCanvasImageJob);
  const starts = [];
  const complete = [];
  const boundary = { service: { submit(snapshot, observe) {
    const index = starts.length;
    starts.push(snapshot);
    return new Promise((resolve) => { complete[index] = (next) => { observe(next); resolve(next); }; });
  } }, retry() { throw new Error("No retry expected"); }, resume() { throw new Error("No resume expected"); } };
  const execution = runCanvasGeneratorBatch({ jobs, mode: "submit", boundary,
    observe(next, index) { jobs = jobs.map((previous, slot) => slot === index ? next : previous); } });
  assert.equal(starts.length, 3); // Before any segment completes.
  for (let index = 0; index < starts.length; index++) {
    assert.equal(starts[index].prompt, snapshots[index].prompt);
    assert.equal(starts[index].count, 4);
    assert.deepEqual(starts[index].references, base.references);
    assert.equal(starts[index].modelId, base.modelId);
    assert.equal(starts[index].canvasProjectId, base.canvasProjectId);
    assert.ok(Object.isFrozen(starts[index]) && Object.isFrozen(starts[index].references));
  }
  const third = { ...job("第三段"), input: snapshots[2] };
  complete[2](third);
  assert.deepEqual(canvasGeneratorOutputs({ jobs }), third.outputs);
  assert.ok(jobs.some(canvasImageJobIsActive));
  const first = { ...job("第一段"), input: snapshots[0] };
  const failed = { ...job("第二段", "failed"), input: snapshots[1] };
  complete[0](first);
  complete[1](failed);
  await execution;
  assert.deepEqual(canvasGeneratorOutputs({ jobs }), [...first.outputs, ...third.outputs]);
  assert.equal(jobs[1].state, "failed");
  assert.equal(jobs.some(canvasImageJobIsActive), false);
});

test("retry sends just the failed frozen segment; resume polls only durable active siblings", async () => {
  const jobs = [job("完成"), job("失败", "failed"), job("等待", "queued")];
  const calls = [];
  const observed = [];
  const boundary = { service: { submit(input) { calls.push(["submit", input]); return Promise.resolve(job(input.prompt)); } },
    retry(job, observe) { calls.push(["retry", job.id, job.input]); observe({ ...job, state: "queued" }); return Promise.resolve(job); },
    resume(job) { calls.push(["resume", job.id]); return Promise.resolve(job); } };
  await runCanvasGeneratorBatch({ jobs, mode: "retry", retryIndex: 1, boundary, observe: (job, index) => observed.push([job, index]) });
  assert.deepEqual(calls, [["retry", jobs[1].id, jobs[1].input]]);
  assert.equal(observed[0][1], 1);
  calls.length = 0;
  await runCanvasGeneratorBatch({ jobs: [...jobs, pendingCanvasImageJob(input())], mode: "resume", boundary, observe() {} });
  assert.deepEqual(calls, [["resume", jobs[2].id]]);
  assert.deepEqual(canvasGeneratorJobs({ job: jobs[0] }), [jobs[0]]);
});

test("one unexpected submission rejection cannot stop another segment or mark an uncertain POST accepted", async () => {
  const jobs = [pendingCanvasImageJob(input("未知")), pendingCanvasImageJob(input("成功"))];
  const completed = job("成功");
  const observations = [];
  const boundary = { service: { async submit(input, observe) {
    if (input.prompt === "未知") throw new Error("Interrupted POST");
    observe(completed); return completed;
  } }, retry() {}, resume() {} };
  const results = await runCanvasGeneratorBatch({ jobs, mode: "submit", boundary, observe: (job, index) => observations.push([job, index]) });
  assert.equal(results[0].status, "rejected");
  assert.equal(results[1].status, "fulfilled");
  assert.equal(observations.find(([, index]) => index === 0)[0].error.code, "SUBMISSION_UNKNOWN");
  assert.equal(observations.find(([, index]) => index === 1)[0], completed);
});

test("a polling exception after acceptance retains the durable ID for later resume", async () => {
  const pending = pendingCanvasImageJob(input());
  const accepted = { ...pending, id: randomUUID() };
  const observations = [];
  const boundary = { service: { async submit(_input, observe) { observe(accepted); throw new Error("Polling interrupted"); } }, retry() {}, resume() {} };
  const result = await runCanvasGeneratorBatch({ jobs: [pending], mode: "submit", boundary, observe: (job) => observations.push(job) });
  assert.equal(result[0].status, "rejected");
  assert.deepEqual(observations, [accepted]);
});

test("ordered browser snapshots strip ephemeral URLs; cloud retains all authorized identities and legacy single jobs", () => {
  const jobs = [job("第一段"), job("第二段", "failed"), job("第三段", "queued")];
  const local = snapshot(jobs);
  const savedNode = local.nodes[0];
  assert.deepEqual(savedNode.jobIds, jobs.map((job) => job.id));
  assert.deepEqual(savedNode.localJobs.map((job) => job.id), savedNode.jobIds);
  assert.equal(savedNode.localJobs[0].input.references[0].url, "");
  assert.ok(savedNode.localJobs[0].outputs[0].previewUrl.startsWith("/api/"));
  const remote = remoteCanvasProjectDocument(local);
  assert.equal(remote.nodes[0].localJobs, undefined);
  assert.equal(remote.nodes[0].localJob, undefined);
  const validated = validateCanvasProjectSave(save(remote)).document;
  assert.deepEqual(validated.nodes[0].jobIds, savedNode.jobIds);
  assert.equal(validated.nodes[0].jobId, jobs[0].id);
  const single = remoteCanvasProjectDocument(snapshot([jobs[0]]));
  assert.equal(single.nodes[0].jobIds, undefined);
  assert.equal(validateCanvasProjectSave(save(single)).document.nodes[0].jobId, jobs[0].id);
  for (const mutate of [
    (node) => { node.jobIds = [jobs[0].id, jobs[0].id]; },
    (node) => { node.jobIds = [jobs[1].id, jobs[0].id]; },
    (node) => { node.jobIds = ["pending_123"]; },
    (node) => { node.localJobs = jobs; },
  ]) {
    const invalid = save(remote); mutate(invalid.document.nodes[0]);
    assert.throws(() => validateCanvasProjectSave(invalid), { code: "INVALID_CANVAS_PROJECT" });
  }
});

test("pending/unknown siblings block cloud sync and page deletion even after the first job succeeds", () => {
  const complete = job("完成");
  const pending = pendingCanvasImageJob(input("提交中"));
  assert.equal(pendingCanvasProjectContent(snapshot([complete, pending])), "generation");
  const unknown = recoverCanvasImageJob(pending);
  assert.equal(unknown.error.retryable, false);
  assert.equal(pendingCanvasProjectContent(snapshot([complete, unknown])), "generation");
  const knownFailure = { ...pending, state: "failed", error: { code: "INTERNAL_ERROR", message: "已拒绝", retryable: true } };
  assert.equal(pendingCanvasProjectContent(snapshot([complete, knownFailure])), null);
  assert.deepEqual(remoteCanvasProjectDocument(snapshot([knownFailure, complete])).nodes[0].jobIds, [complete.id]);
  const options = { busyGeneratorIds: new Set(), uploadingNodeIds: new Set(), referenceStatuses: {}, convertingEdgeIds: new Set() };
  assert.equal(canvasPageHasActiveWork({ nodes: [generator([complete, job("等待", "running")])], edges: [] }, options), true);
  assert.equal(canvasPageHasActiveWork({ nodes: [generator([complete, unknown])], edges: [] }, options), true);
  assert.equal(canvasPageHasActiveWork({ nodes: [generator([complete, knownFailure])], edges: [] }, options), false);
});

test("crop resolves an output's actual job after an earlier segment failed", () => {
  const jobs = [job("失败", "failed"), job("完成")];
  const node = generator(jobs);
  const image = canvasCropImageForNode(node, jobs[1].outputs[2].id);
  assert.equal(image.imageId, jobs[1].outputs[2].id);
  assert.equal(image.key, `asset:${image.imageId}`);
  assert.equal(canvasCropImageForNode(node, randomUUID()), null);
});

test("cloud save authorizes every newly attached job, including nonfirst batch members", async () => {
  const ownerId = randomUUID(), workspaceId = randomUUID(), projectId = randomUUID();
  const jobs = [job("第一段"), job("第二段")];
  const authorized = new Set([jobs[0].id]);
  const checked = [];
  const client = { async query(sql, parameters = []) {
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql)) return { rows: [], rowCount: 0 };
    if (sql.includes("FROM users u")) return { rows: [{ workspace_id: workspaceId, kind: "personal", status: "active", name: "Personal" }], rowCount: 1 };
    if (sql.includes("FROM canvas_project_deletions") || sql.includes("FROM canvas_projects")) return { rows: [], rowCount: 0 };
    if (sql.includes("FROM generation_jobs")) {
      checked.push(parameters);
      const rows = parameters[0].filter((id) => authorized.has(id)).map((id) => ({ id }));
      return { rows, rowCount: rows.length };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  }, release() {} };
  await assert.rejects(saveCanvasProjectRecord({ connect: async () => client }, {
    ownerId, projectId, input: validateCanvasProjectSave(save(remoteCanvasProjectDocument(snapshot(jobs)))),
  }), { code: "CANVAS_RESOURCE_UNAVAILABLE" });
  assert.deepEqual(checked, [[jobs.map((job) => job.id), workspaceId, ownerId]]);
});
