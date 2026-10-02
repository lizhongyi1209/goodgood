import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DEFAULT_TEXT_GENERATION_MODEL, TEXT_GENERATION_PRESETS, TEXT_GENERATION_MAX_PROMPT } from "../shared/contracts/text-generation.mjs";
import { validateTextGeneration } from "../server/text-generation/validation.mjs";
import { textGenerationPresetPrompt } from "../server/text-generation/presets.mjs";
import { textGenerationSnapshot } from "../server/text-generation/repository.mjs";
import { validateCanvasProjectSave } from "../server/canvas-projects/validation.mjs";

const request = (patch = {}) => ({ requestId: randomUUID(), projectId: randomUUID(), modelId: DEFAULT_TEXT_GENERATION_MODEL,
  prompt: "", history: [], media: [], ...patch });

test("preset catalog exposes only labels and IDs while the server adds the exact hidden instruction", () => {
  assert.deepEqual(TEXT_GENERATION_PRESETS, [{ id: "structured_reverse", name: "结构化反推" }]);
  const instruction = "根据图片生成JSON结构化中文提示词，包括主体描述、环境、光影、镜头语言、风格关键词。";
  assert.equal(textGenerationPresetPrompt("structured_reverse"), instruction);
  const input = validateTextGeneration(request({ presetId: "structured_reverse" }));
  assert.equal(input.prompt, instruction);
  assert.equal(input.presetId, "structured_reverse");
  assert.equal(textGenerationSnapshot(input).presetId, "structured_reverse");
  assert.equal(JSON.stringify(TEXT_GENERATION_PRESETS).includes(instruction), false);
});

test("additional input follows the preset, images stay attached and unknown or oversized presets are rejected", () => {
  const media = [{ kind: "image", assetKind: "reference", assetId: randomUUID() }];
  const input = validateTextGeneration(request({ presetId: "structured_reverse", prompt: "  保留衣服细节  ", media }));
  assert.equal(input.prompt, `${textGenerationPresetPrompt("structured_reverse")}\n\n保留衣服细节`);
  assert.deepEqual(input.media, media);
  assert.throws(() => validateTextGeneration(request()), { code: "EMPTY_TEXT_PROMPT" });
  for (const presetId of ["unknown", "toString", null, {}]) {
    assert.throws(() => validateTextGeneration(request({ presetId, prompt: "普通输入" })), { code: "INVALID_TEXT_GENERATION" });
  }
  assert.throws(() => validateTextGeneration(request({ presetId: "structured_reverse", prompt: "a".repeat(TEXT_GENERATION_MAX_PROMPT) })), { code: "TEXT_INPUT_TOO_LONG" });
  assert.equal(validateTextGeneration(request({ prompt: "普通输入" })).prompt, "普通输入");
});

test("project saves preserve the preset and editable draft without writing the hidden instruction", () => {
  const node = { id: "text-preset", type: "textGenerator", position: { x: 0, y: 0 }, markdown: "", text: "",
    textGeneration: { modelId: DEFAULT_TEXT_GENERATION_MODEL, prompt: "附加需求", presetId: "structured_reverse", history: [] } };
  const document = { schemaVersion: 1, nodes: [node], edges: [], generators: {}, convertedReferences: {}, viewport: { x: 0, y: 0, zoom: 1 } };
  const saved = validateCanvasProjectSave({ expectedVersion: null, name: "预设测试", document }).document;
  assert.deepEqual(saved.nodes[0].textGeneration, node.textGeneration);
  assert.equal(JSON.stringify(saved).includes(textGenerationPresetPrompt("structured_reverse")), false);
  const invalid = { ...document, nodes: [{ ...node, textGeneration: { ...node.textGeneration, presetId: "unknown" } }] };
  assert.throws(() => validateCanvasProjectSave({ expectedVersion: null, name: "预设测试", document: invalid }), { code: "INVALID_CANVAS_PROJECT" });
  const legacy = { ...document, nodes: [{ ...node, textGeneration: { modelId: DEFAULT_TEXT_GENERATION_MODEL, prompt: "" } }] };
  assert.equal(validateCanvasProjectSave({ expectedVersion: null, name: "旧项目", document: legacy }).document.nodes[0].textGeneration.presetId, undefined);
});
