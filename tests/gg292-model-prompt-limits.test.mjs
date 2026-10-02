import assert from "node:assert/strict";
import test from "node:test";
import { GENERATION_PROMPT_LIMITS, PROMPT_DRAFT_MAX_LENGTH, countPromptCharacters, getGenerationPromptStatus } from "../shared/contracts/generation-prompt-limits.mjs";
import { collectCanvasTextInputs, combineCanvasPrompt, reorderCanvasTextInputs } from "../features/canvas/canvas-text-input.mjs";
import { validateM3GenerationInput } from "../server/generation/api.mjs";
import { validateCanvasProjectSave } from "../server/canvas-projects/validation.mjs";
import { validateDraftMutation } from "../server/drafts/validation.mjs";
import { validateProjectSaveRequest } from "../server/projects/validation.mjs";

const generation = (modelId, prompt) => ({ modelId, prompt, routingPolicy: "canvas-image-v1", references: [], aspectRatio: "1:1", resolution: "1K", count: 1 });
const editor = (id, text) => ({ id, type: "textEditor", position: { x: 0, y: 0 }, data: { text, markdown: text } });
const textEdge = (source, target = "generator") => ({ id: `${source}-${target}`, source, target, sourceHandle: "text", targetHandle: "reference" });
const legacyState = (prompt) => ({ modelId: "nano-banana-2", prompt, references: [], aspectRatio: "1:1", resolution: "1K", count: 1 });
const canvasSave = (text, prompt = "", edges = [textEdge("a")]) => ({
  name: "提示词画布", expectedVersion: null,
  document: {
    schemaVersion: 1,
    nodes: [{ id: "a", type: "textEditor", text, markdown: text, position: { x: 0, y: 0 } },
      { id: "generator", type: "imageGenerator", position: { x: 400, y: 0 } }],
    edges,
    generators: { generator: { draft: { prompt, modelKey: "seedream-5.0-pro", ratio: "1:1", resolution: "1K", count: 1 }, directReferenceIds: [] } },
    viewport: { x: 0, y: 0, zoom: 1 },
  },
});

test("each supported model uses the same frontend/backend boundary without rewriting the prompt", () => {
  for (const [modelId, policy] of Object.entries(GENERATION_PROMPT_LIMITS)) {
    const prompt = "字".repeat(policy.maxLength);
    assert.equal(getGenerationPromptStatus(modelId, prompt).tooLong, false);
    assert.equal(validateM3GenerationInput(generation(modelId, prompt)).prompt, prompt);
    const oversized = `${prompt}字`;
    const status = getGenerationPromptStatus(modelId, oversized);
    assert.equal(status.excess, 1);
    assert.throws(() => validateM3GenerationInput(generation(modelId, oversized)), (error) => error.code === "INVALID_PROMPT" && error.message === status.errorMessage);
    assert.equal(oversized.length, policy.maxLength + 1);
  }
  assert.equal(GENERATION_PROMPT_LIMITS["nano-banana-2"].source, "application");
  assert.equal(GENERATION_PROMPT_LIMITS["gpt-image-2"].source, "provider");
});

test("supplementary characters count identically for preview, generation and cloud storage", () => {
  assert.equal(countPromptCharacters("中文😀\nA"), 5);
  const prompt = "😀".repeat(PROMPT_DRAFT_MAX_LENGTH);
  assert.equal(getGenerationPromptStatus("gpt-image-2", prompt).length, PROMPT_DRAFT_MAX_LENGTH);
  assert.equal(validateM3GenerationInput(generation("gpt-image-2", prompt)).prompt, prompt);
  assert.equal(validateCanvasProjectSave(canvasSave(prompt)).document.nodes[0].text, prompt);
  assert.equal(validateDraftMutation({ expectedVersion: null, state: legacyState(prompt) }).state.prompt, prompt);
  assert.equal(validateProjectSaveRequest({ name: "保存原文", batchIds: ["10000000-0000-4000-8000-000000000001"], state: legacyState(prompt) }).state.prompt, prompt);
});

test("Seedream writing advice stays soft and model switching preserves the draft", () => {
  for (const prompt of ["字".repeat(301), "word ".repeat(601).trim()]) {
    const status = getGenerationPromptStatus("seedream-5.0-pro", prompt);
    assert.ok(status.advice);
    assert.equal(status.tooLong, false);
    assert.equal(validateM3GenerationInput(generation("seedream-5.0-pro", prompt)).prompt, prompt);
  }
  assert.equal(getGenerationPromptStatus("seedream-5.0-pro", "字".repeat(300)).advice, null);
  const original = "原文".repeat(2500);
  assert.equal(validateCanvasProjectSave(canvasSave("", original)).document.generators.generator.draft.prompt, original);
  assert.equal(getGenerationPromptStatus("seedream-5.0-pro", original).excess, 1000);
  assert.equal(getGenerationPromptStatus("nano-banana-2", original).tooLong, false);
  assert.equal(getGenerationPromptStatus("nano-banana-pro", original).advice, null);
  assert.equal(original, "原文".repeat(2500));
});

test("merged limits include separators, while empty input and disconnection add no characters", () => {
  const first = "字".repeat(16_000);
  const second = "字".repeat(16_000);
  const combined = combineCanvasPrompt([{ text: first }, { text: second }], " \n");
  assert.equal(combined, `${first}\n\n${second}`);
  assert.equal(getGenerationPromptStatus("gpt-image-2", combined).excess, 2);
  assert.equal(getGenerationPromptStatus("gpt-image-2", combineCanvasPrompt([{ text: first }], "")).tooLong, false);
  assert.equal(getGenerationPromptStatus("gpt-image-2", combineCanvasPrompt([], " \n")).length, 0);
  assert.throws(() => validateM3GenerationInput(generation("gpt-image-2", " \n")), (error) => error.code === "INVALID_PROMPT");
});

test("reordering changes one generator's text slots and leaves images and other generators intact", () => {
  const image = { id: "image-edge", source: "image", target: "generator", sourceHandle: "reference", targetHandle: "reference" };
  const other = textEdge("a", "other-generator");
  const edges = [textEdge("a"), image, other, textEdge("b")];
  const nodes = [editor("a", "第一段"), editor("b", "第二段"), editor("blank", " ")];
  const submitted = combineCanvasPrompt(collectCanvasTextInputs(nodes, edges, "generator"), "补充");
  const reordered = reorderCanvasTextInputs(edges, "generator", "a-generator", "b-generator");
  assert.equal(reordered[1], image);
  assert.equal(reordered[2], other);
  assert.equal(edges[0].source, "a");
  assert.equal(submitted, "第一段\n\n第二段\n\n补充");
  assert.equal(combineCanvasPrompt(collectCanvasTextInputs(nodes, reordered, "generator"), "补充"), "第二段\n\n第一段\n\n补充");
  assert.equal(combineCanvasPrompt(collectCanvasTextInputs(nodes, reordered, "other-generator"), ""), "第一段");
  assert.equal(reorderCanvasTextInputs(edges, "generator", "a-generator", image.id), edges);
  assert.equal(reorderCanvasTextInputs(edges, "generator", "a-generator", other.id), edges);
  assert.equal(reorderCanvasTextInputs(edges, "generator", "missing", "b-generator"), edges);
  assert.deepEqual(collectCanvasTextInputs(nodes, [textEdge("blank"), textEdge("missing")], "generator"), []);
});

test("cloud graph roundtrip retains input order and rejects storage overflow without truncation", () => {
  const input = canvasSave("first");
  input.document.nodes.push({ id: "b", type: "textEditor", text: "second", markdown: "second", position: { x: 0, y: 200 } });
  input.document.edges.push(textEdge("b"));
  input.document.edges = reorderCanvasTextInputs(input.document.edges, "generator", "a-generator", "b-generator");
  const saved = validateCanvasProjectSave(input).document;
  const restoredNodes = saved.nodes.filter((node) => node.type === "textEditor").map((node) => editor(node.id, node.text));
  assert.equal(combineCanvasPrompt(collectCanvasTextInputs(restoredNodes, saved.edges, "generator"), ""), "second\n\nfirst");
  for (const input of [canvasSave("字".repeat(PROMPT_DRAFT_MAX_LENGTH + 1)), canvasSave("", "字".repeat(PROMPT_DRAFT_MAX_LENGTH + 1))]) {
    assert.throws(() => validateCanvasProjectSave(input), (error) => error.code === "INVALID_CANVAS_PROJECT");
  }
});
