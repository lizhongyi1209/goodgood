import test from "node:test";
import assert from "node:assert/strict";
import { defaultVideoGenerationDraft } from "../shared/contracts/video-generation.mjs";
import { canvasVideoGenerationBatchInputs } from "../features/canvas/canvas-video-generation-batch.mjs";
import { validateVideoDraft, validateVideoGeneration } from "../server/video-generation/validation.mjs";
import { validateCanvasProjectSave } from "../server/canvas-projects/validation.mjs";

const requestId = "00000000-0000-4000-8000-000000000001";
const projectId = "00000000-0000-4000-8000-000000000002";
function input() {
  const { materials, roles, ...draft } = defaultVideoGenerationDraft();
  return { ...draft, requestId, projectId, prompt: "镜头缓慢推进", media: [], quotedCredits: 50 };
}

test("legacy drafts remain single-video compatible; only 1, 2 and 4 may be persisted", () => {
  assert.equal(validateVideoDraft(defaultVideoGenerationDraft()).count ?? 1, 1);
  for (const count of [1, 2, 4]) assert.equal(validateVideoDraft({ ...defaultVideoGenerationDraft(), count }).count, count);
  for (const count of [0, 3, 8, 1.5, "2", null]) assert.throws(() => validateVideoDraft({ ...defaultVideoGenerationDraft(), count }));
});

test("every slot has a distinct frozen input before submission, retaining per-video credit quotes", () => {
  const original = input();
  let sequence = 10;
  for (const count of [1, 2, 4]) {
    const planned = canvasVideoGenerationBatchInputs(original, count, () => `00000000-0000-4000-8000-${String(sequence++).padStart(12, "0")}`);
    assert.equal(planned.length, count);
    assert.equal(new Set(planned.map((item) => item.requestId)).size, count);
    assert.equal(planned[0].requestId, requestId);
    assert.equal(planned.reduce((sum, item) => sum + item.quotedCredits, 0), 50 * count);
    planned.forEach((item) => assert.doesNotThrow(() => validateVideoGeneration(item)));
    planned[0].shots.push({ seconds: 5, text: "修改局部输入" });
    assert.deepEqual(original.shots, []);
    if (planned[1]) assert.deepEqual(planned[1].shots, []);
  }
  assert.throws(() => canvasVideoGenerationBatchInputs(original, 3, () => requestId));
  assert.throws(() => canvasVideoGenerationBatchInputs(original, 2, () => requestId), /重复/);
});

test("retry planning keeps exactly one request and never carries composer count to the provider API", () => {
  let allocated = 0;
  const planned = canvasVideoGenerationBatchInputs({ ...input(), count: 4, submissionError: "未受理" }, 1, () => { allocated += 1; return projectId; });
  assert.equal(planned.length, 1);
  assert.equal(allocated, 0);
  assert.equal(planned[0].count, undefined);
  assert.equal(planned[0].submissionError, undefined);
  assert.throws(() => validateVideoGeneration({ ...input(), count: 4 }));
});

test("pre-acceptance failures retain their exact input for a single retry after canvas restore", () => {
  const draft = { ...defaultVideoGenerationDraft(), count: 4, requestId, lastInput: input(), submissionError: "积分不足，请充值后重试。" };
  const document = { schemaVersion: 1, nodes: [{ id: "video-1", type: "videoGenerator", position: { x: 0, y: 0 }, videoGeneration: draft }],
    edges: [], generators: {}, viewport: { x: 0, y: 0, zoom: 1 } };
  const restored = validateCanvasProjectSave({ expectedVersion: null, name: "合成数量画布", document }).document.nodes[0].videoGeneration;
  assert.equal(restored.count, 4);
  assert.equal(restored.submissionError, draft.submissionError);
  assert.equal(restored.lastInput.requestId, requestId);
  assert.throws(() => validateVideoDraft({ ...draft, requestId: projectId }));
  assert.throws(() => validateVideoDraft({ ...defaultVideoGenerationDraft(), submissionError: "缺少冻结输入" }));
  assert.throws(() => validateVideoDraft({ ...draft, submissionError: "x".repeat(1001) }));
});
