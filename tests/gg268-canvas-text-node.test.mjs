import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { MarkdownManager } from "@tiptap/markdown";
import { validateCanvasProjectSave } from "../server/canvas-projects/validation.mjs";
import { CANVAS_PROMPT_MAX_LENGTH, canvasTextFontSize, collectCanvasTextInputs, combineCanvasPrompt, isCanvasTextConnection } from "../features/canvas/canvas-text-input.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root,
  resolve: { alias: { "@": root } }, server: { middlewareMode: true, hmr: false, ws: false } });
after(() => vite.close());
const { snapshotCanvasProject, remoteCanvasProjectDocument, pendingCanvasProjectContent } = await vite.ssrLoadModule("/features/canvas/canvas-project-snapshot.ts");
const { createGenerationInputSnapshot } = await vite.ssrLoadModule("/features/creation/generation-snapshot.ts");
const manager = new MarkdownManager({ extensions: [StarterKit] });
const schema = getSchema([StarterKit]);
const textNode = (id = "text-1", text = "画面描述") => ({ id, type: "textEditor", position: { x: 0, y: 0 },
  style: { width: 360, height: 260 }, data: { markdown: `**${text}**`, text } });
const generator = { id: "generator-1", type: "imageGenerator", position: { x: 400, y: 0 }, data: { sequence: 1 } };
const edge = (source = "text-1", id = "edge-1") => ({ id, source, target: generator.id, sourceHandle: "text", targetHandle: "text" });
const snapshot = (nodes = [textNode(), generator], edges = [edge()]) => snapshotCanvasProject({
  nodes, edges, draftsByGenerator: {}, referencesByGenerator: {}, convertedReferences: {}, viewport: { x: 0, y: 0, zoom: 1 },
});
const save = (document = remoteCanvasProjectDocument(snapshot())) => ({ expectedVersion: null, name: "文本画布", document });
const plain = (doc) => { const node = schema.nodeFromJSON(doc); return node.textBetween(0, node.content.size, "\n"); };

test("Markdown creates headings, marks, lists, quote and code nodes, emitting readable prompt text", () => {
  const markdown = "## 标题\n\n**粗体** *斜体* ~~删除线~~\n\n- 条目一\n- 条目二\n\n> 引用\n\n```\n代码\n```";
  const doc = manager.parse(markdown);
  assert.deepEqual(doc.content.map((node) => node.type), ["heading", "paragraph", "bulletList", "blockquote", "codeBlock"]);
  assert.equal(plain(doc), "标题\n粗体 斜体 删除线\n条目一\n条目二\n引用\n代码");
  assert.deepEqual(manager.parse(manager.serialize(doc)), doc);
});
test("empty Markdown roundtrips without fake output", () => {
  assert.equal(plain(manager.parse("")), "");
  assert.equal(manager.serialize(manager.parse("")), "");
});
test("plain text retains punctuation, internal newlines and literal code symbols", () => {
  const doc = manager.parse("1. 第一项\n2. 第二项\n\n`a * b` & 中文");
  assert.equal(plain(doc), "第一项\n第二项\na * b & 中文");
});
test("connected inputs follow persisted edge order before generator additions", () => {
  const nodes = [textNode("a", " 第一段 "), textNode("b", "第二段\n下一行"), generator];
  const inputs = collectCanvasTextInputs(nodes, [edge("b", "b-edge"), edge("a", "a-edge")], generator.id);
  assert.equal(combineCanvasPrompt(inputs, "  额外描述  "), "第二段\n下一行\n\n第一段\n\n额外描述");
  assert.equal(inputs[0].nodeId, "b");
});
test("empty, disconnected, deleted and image inputs never fabricate prompts", () => {
  const nodes = [textNode("blank", " \n"), textNode(), { ...textNode("image"), type: "sourceImage" }, generator];
  const edges = [edge("blank"), edge("deleted", "deleted"), edge("image", "wrong-type"),
    { ...edge(), sourceHandle: "reference", targetHandle: "reference" }];
  assert.deepEqual(collectCanvasTextInputs(nodes, edges, generator.id), []);
  assert.equal(combineCanvasPrompt([], ""), "");
  assert.deepEqual(collectCanvasTextInputs(nodes, [edge()], null), []);
});
test("edits and disconnections update current input; duplicate sources do not repeat it", () => {
  const node = textNode();
  assert.equal(collectCanvasTextInputs([node], [edge(), edge("text-1", "duplicate")], generator.id).length, 1);
  node.data.text = "新的提示词";
  assert.equal(combineCanvasPrompt(collectCanvasTextInputs([node], [edge()], generator.id), ""), "新的提示词");
  assert.equal(combineCanvasPrompt(collectCanvasTextInputs([node], [], generator.id), "补充"), "补充");
});
test("only text output to generator text input is connectable, no duplicate edges", () => {
  const nodes = [textNode(), generator];
  assert.equal(isCanvasTextConnection(edge(), nodes, []), true);
  assert.equal(isCanvasTextConnection(edge(), nodes, [edge()]), false);
  assert.equal(isCanvasTextConnection({ ...edge(), targetHandle: "reference" }, nodes, []), false);
  assert.equal(isCanvasTextConnection({ ...edge(), target: "text-1" }, nodes, []), false);
  assert.equal(isCanvasTextConnection(edge(), [generator], []), false);
});
test("prompt composition preserves text beyond the generation limit for explicit rejection", () => {
  const combined = combineCanvasPrompt([{ text: "字".repeat(4000) }], "附加");
  assert.equal(combined.length, 4004);
  assert.ok(combined.length > CANVAS_PROMPT_MAX_LENGTH);
  assert.equal(combineCanvasPrompt([{ text: "字".repeat(4000) }], "").length, CANVAS_PROMPT_MAX_LENGTH);
});
test("generation snapshot freezes the combined prompt while draft additions stay separate", () => {
  const node = textNode();
  const draft = { prompt: "补充", modelId: "nano-banana-2", aspectRatio: "adaptive", resolution: "2K", count: 1, references: [], projectId: null };
  const combined = combineCanvasPrompt(collectCanvasTextInputs([node], [edge()], generator.id), draft.prompt);
  const input = createGenerationInputSnapshot({ ...draft, prompt: combined });
  node.data.text = "后续编辑";
  assert.equal(input.prompt, "画面描述\n\n补充");
  assert.equal(draft.prompt, "补充");
});
test("font sizing grows with node dimensions and remains readable at bounds", () => {
  assert.equal(canvasTextFontSize(360, 260), 14);
  assert.equal(canvasTextFontSize(720, 520), 24);
  assert.equal(canvasTextFontSize(180, 140), 12);
  assert.equal(canvasTextFontSize(), 14);
});
test("browser and remote snapshots retain Markdown, plain output, geometry and text edges", () => {
  const local = snapshot();
  const remote = remoteCanvasProjectDocument(local);
  assert.equal(pendingCanvasProjectContent(local), null);
  assert.equal(remote.nodes[0].markdown, "**画面描述**");
  assert.equal(remote.nodes[0].text, "画面描述");
  assert.deepEqual(remote.nodes[0].size, { width: 360, height: 260 });
  assert.deepEqual(remote.edges, local.edges);
  const validated = validateCanvasProjectSave(save(remote));
  assert.deepEqual(validated.document.nodes, JSON.parse(JSON.stringify(remote.nodes)));
});
test("empty editor saves, multipage remote output retains text and independent generator drafts", () => {
  const first = snapshot([textNode("text-1", ""), generator], [edge()]);
  const second = snapshot([textNode("text-2", "下一页")], []);
  const { schemaVersion: _one, ...one } = first;
  const { schemaVersion: _two, ...two } = second;
  const doc = { schemaVersion: 2, pages: [{ id: "page-1", name: "页面1", ...one }, { id: "page-2", name: "页面2", ...two }] };
  const validated = validateCanvasProjectSave(save(remoteCanvasProjectDocument(doc)));
  assert.equal(validated.document.pages[0].nodes[0].text, "");
  assert.equal(validated.document.pages[1].nodes[0].text, "下一页");
  assert.equal(validated.document.pages[0].generators[generator.id].draft.prompt, "");
});
test("server rejects oversized text, wrong ports, non-text Markdown and media metadata", () => {
  for (const mutate of [
    (doc) => { doc.nodes[0].text = "x".repeat(16001); },
    (doc) => { doc.nodes[0].markdown = "x".repeat(100001); },
    (doc) => { doc.edges[0].targetHandle = "reference"; },
    (doc) => { doc.edges[0].source = generator.id; },
    (doc) => { doc.nodes[1].markdown = "bad"; },
    (doc) => { doc.nodes[0].metadata = { pixelWidth: 20 }; },
    (doc) => { delete doc.nodes[0].text; },
  ]) {
    const input = save(); mutate(input.document);
    assert.throws(() => validateCanvasProjectSave(input), (error) => error.code === "INVALID_CANVAS_PROJECT");
  }
});
