import assert from "node:assert/strict";
import test, { after } from "node:test";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { canvasGeneratorSlots, canvasGeneratorResultSlots, canvasImageSlotCanRetry, recoverCanvasImageSlot } from "../features/canvas/canvas-image-slots.mjs";
import { canvasGeneratorOutputs } from "../features/canvas/canvas-image-prompt-batch.mjs";
import { validateCanvasProjectSave } from "../server/canvas-projects/validation.mjs";

// Source-only regressions: synthetic boundaries, no database or provider requests.
const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root,
  resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false, ws: false } });
after(() => vite.close());
const { pendingCanvasImageSlots, retryCanvasImageSlot, runCanvasGeneratorSlots } = await vite.ssrLoadModule("/features/canvas/canvas-generator-batch.ts");
const { snapshotCanvasProject, remoteCanvasProjectDocument, pendingCanvasProjectContent } = await vite.ssrLoadModule("/features/canvas/canvas-project-snapshot.ts");
const input = (prompt = "画面", count = 4, modelId = "nano-banana-2") => ({
  prompt, count, modelId, aspectRatio: "3:4", resolution: "2K", routingPolicy: "canvas-image-v1", expectedPriceVersion: 2,
  canvasProjectId: randomUUID(), references: [{ id: randomUUID(), name: "参考图", url: "blob:private", status: "ready" }],
});
const failed = (job) => ({ ...job, id: randomUUID(), state: "failed", error: {
  code: "CAPACITY_BUSY", title: "未完成", message: "服务繁忙", retryable: true,
} });
const succeeded = (job, count = 1) => ({ ...job, id: randomUUID(), state: "succeeded", error: null,
  outputs: Array.from({ length: count }, () => ({ id: randomUUID(), previewUrl: "https://private.invalid/output?signature=secret",
    previewPosition: "center", width: 600, height: 800 })),
});

test("prompt groups multiply into ordered independent single-picture slots before any submission", () => {
  const slots = pendingCanvasImageSlots([input("第一组"), input("第二组")]);
  assert.equal(slots.length, 8);
  assert.deepEqual(slots.map((slot) => slot.job.input.prompt), ["第一组", "第一组", "第一组", "第一组", "第二组", "第二组", "第二组", "第二组"]);
  assert.equal(new Set(slots.map((slot) => slot.requestKey)).size, 8);
  assert.ok(slots.every((slot) => slot.job.input.count === 1 && slot.job.input.references[0].url === ""));
});

test("out-of-order concurrent completion keeps four positions, including two centered retry targets", async () => {
  let slots = pendingCanvasImageSlots([input()]);
  const identities = slots.map((slot) => slot.id);
  const complete = [];
  const calls = [];
  const boundary = { service: { submit(snapshot, observe, request) {
    const index = calls.length; calls.push({ snapshot, request });
    return new Promise((resolve) => { complete[index] = (job) => { observe(job); resolve(job); }; });
  } }, retry() { throw new Error("Unexpected retry"); }, resume() { throw new Error("Unexpected resume"); } };
  const run = runCanvasGeneratorSlots({ slots, boundary, observe(job, slot) {
    slots = slots.map((current) => current.id === slot.id ? { ...current, job } : current);
  } });
  assert.equal(calls.length, 4);
  complete[3](succeeded(slots[3].job)); complete[0](succeeded(slots[0].job));
  complete[1](failed(slots[1].job)); complete[2](failed(slots[2].job));
  await run;
  const results = canvasGeneratorResultSlots({ slots });
  assert.deepEqual(results.map((slot) => slot.id), identities);
  assert.deepEqual(results.map((slot) => Boolean(slot.output)), [true, false, false, true]);
  assert.deepEqual(results.map(canvasImageSlotCanRetry), [false, true, true, false]);
  const retry = retryCanvasImageSlot(slots[1], 3);
  assert.equal(retry.id, identities[1]); assert.equal(retry.job.input.count, 1);
  assert.equal(retry.retryOfJobId, slots[1].job.id); assert.notEqual(retry.requestKey, slots[1].requestKey);
  let retried;
  await runCanvasGeneratorSlots({ slots: [retry], boundary: { ...boundary, async retry(job, observe, request) {
    retried = { job, request }; const next = succeeded(job); observe(next); return next;
  } }, observe(job, slot) { slots = slots.map((current) => current.id === slot.id ? { ...retry, job } : current); } });
  assert.equal(retried.job.id, retry.retryOfJobId);
  assert.equal(canvasGeneratorResultSlots({ slots }).length, 4);
  assert.equal(slots[0].id, identities[0]); assert.equal(slots[3].id, identities[3]);
});

test("legacy failed count4 preserves four slots and retries only one picture through new submission", async () => {
  const [pending] = pendingCanvasImageSlots([input()]);
  const legacy = failed({ ...pending.job, input: input("旧提示词", 4) });
  const slots = canvasGeneratorSlots({ job: legacy });
  assert.equal(slots.length, 4);
  const retry = retryCanvasImageSlot(slots[2], 8);
  assert.equal(retry.id, slots[2].id); assert.equal(retry.job.input.count, 1); assert.equal(retry.retryOfJobId, undefined);
  let submitted;
  await runCanvasGeneratorSlots({ slots: [retry], boundary: { service: { async submit(snapshot) {
    submitted = snapshot; return succeeded(retry.job);
  } }, retry() { throw new Error("Must not repeat count4 retry endpoint"); } }, observe() {} });
  assert.equal(submitted.prompt, "旧提示词"); assert.equal(submitted.expectedPriceVersion, 8); assert.equal(submitted.count, 1);
  assert.equal(canvasGeneratorResultSlots({ job: succeeded({ ...pending.job, input: input("旧成功", 4) }, 4) }).length, 4);
});

test("unknown POST restores its slot and explicitly retries the original frozen key; resume never submits it", async () => {
  const [slot] = pendingCanvasImageSlots([input("未知", 1)]);
  const restored = recoverCanvasImageSlot(slot);
  assert.equal(restored.job.error.code, "SUBMISSION_UNKNOWN"); assert.ok(canvasImageSlotCanRetry(restored));
  const retry = retryCanvasImageSlot(restored, 99);
  assert.equal(retry.requestKey, slot.requestKey); assert.equal(retry.job.input, slot.job.input);
  let calls = 0;
  await runCanvasGeneratorSlots({ slots: [restored], resume: true, boundary: { service: { submit() { calls++; } }, resume() { calls++; } }, observe() {} });
  assert.equal(calls, 0);
});

test("native Seedream layers remain one paid request, and share owning output identities", () => {
  const slots = pendingCanvasImageSlots([input("分层", 1, "seedream-5.0-pro")]);
  assert.equal(slots.length, 1);
  const job = succeeded(slots[0].job, 5);
  const completed = [{ ...slots[0], job }];
  assert.equal(canvasGeneratorResultSlots({ slots: completed }).length, 5);
  assert.deepEqual(canvasGeneratorOutputs({ slots: completed }), job.outputs);
  assert.ok(canvasGeneratorResultSlots({ slots: completed }).every((slot) => slot.slotIndex === 0));
});

test("cloud restore retains every unknown/failed position and request identity without runtime jobs or private URLs", () => {
  const slots = pendingCanvasImageSlots([input()]); slots[0] = { ...slots[0], job: succeeded(slots[0].job) };
  slots[2] = { ...slots[2], job: failed(slots[2].job) };
  const local = snapshotCanvasProject({ nodes: [{ id: "generator-1", type: "imageGenerator", position: { x: 0, y: 0 }, data: { slots } }], edges: [],
    draftsByGenerator: { "generator-1": { prompt: "画面", modelKey: "nano-banana-2", ratio: "3:4", resolution: "2K", count: 4 } },
    referencesByGenerator: {}, convertedReferences: {}, viewport: { x: 0, y: 0, zoom: 1 } });
  assert.equal(pendingCanvasProjectContent(local), null);
  const cloud = remoteCanvasProjectDocument(local);
  assert.equal(cloud.nodes[0].imageSlots.length, 4);
  assert.equal(cloud.nodes[0].localJobs, undefined);
  assert.ok(!JSON.stringify(cloud).includes("blob:") && !JSON.stringify(cloud).includes("signature="));
  assert.equal(cloud.nodes[0].imageSlots[1].requestKey, slots[1].requestKey);
  const save = { name: "画布", expectedVersion: null, document: JSON.parse(JSON.stringify(cloud)) };
  assert.equal(validateCanvasProjectSave(save).document.nodes[0].imageSlots.length, 4);
  save.document.nodes[0].imageSlots[1].input.references[0].url = "data:image/png;base64,private";
  assert.throws(() => validateCanvasProjectSave(save));
});
