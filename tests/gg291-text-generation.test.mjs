import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { TEXT_GENERATION_MODELS, TEXT_GENERATION_CREDIT_COST, DEFAULT_TEXT_GENERATION_MODEL } from "../shared/contracts/text-generation.mjs";
import { validateTextGeneration } from "../server/text-generation/validation.mjs";
import { prepareTextGeneration } from "../server/text-generation/api.mjs";
import { TextGenerationError } from "../server/text-generation/errors.mjs";
import { streamTextProvider } from "../server/text-generation/provider.mjs";
import { readServerSentEvents } from "../shared/server-sent-events.mjs";
import { collectCanvasTextInputs, isCanvasTextGenerationConnection, isCanvasTextConnection } from "../features/canvas/canvas-text-input.mjs";
import { validateCanvasProjectSave } from "../server/canvas-projects/validation.mjs";

const input = () => ({ requestId: randomUUID(), projectId: randomUUID(), modelId: DEFAULT_TEXT_GENERATION_MODEL,
  prompt: "写一段说明", history: [], media: [] });
const toEvents = async (events) => { const result = []; for await (const event of events) result.push(event); return result; };
const stream = (...chunks) => new ReadableStream({ start(controller) { const encoder = new TextEncoder(); for (const chunk of chunks) controller.enqueue(encoder.encode(chunk)); controller.close(); } });

test("fixed catalog, default and pricing; invalid and empty inputs are rejected before execution", () => {
  assert.equal(TEXT_GENERATION_CREDIT_COST, 20);
  assert.equal(DEFAULT_TEXT_GENERATION_MODEL, "claude-opus-5-5");
  assert.deepEqual(TEXT_GENERATION_MODELS.map((model) => model.id), ["gemini-3.1-pro-preview", "claude-opus-5-5", "doubao-seed-2.0-pro", "gpt-6.1-sol", "deepseek-v4-pro"]);
  assert.throws(() => validateTextGeneration({ ...input(), modelId: "unlisted" }), { code: "INVALID_TEXT_GENERATION" });
  assert.throws(() => validateTextGeneration({ ...input(), prompt: " " }), { code: "EMPTY_TEXT_PROMPT" });
  assert.throws(() => validateTextGeneration({ ...input(), media: [{ kind: "video", assetKind: "video", assetId: randomUUID(), frames: ["https://private.invalid/video"] }] }), { code: "INVALID_TEXT_GENERATION" });
  assert.throws(() => validateTextGeneration({ ...input(), history: [{ role: "system", content: "x" }] }), { code: "INVALID_TEXT_GENERATION" });
});

test("SSE decoding retains fragmented Unicode, CRLF and multiline data", async () => {
  const encoded = new TextEncoder().encode('data: {"text":"你好"}\r\n\r\ndata: line 1\ndata: line 2\n\n');
  const body = new ReadableStream({ start(controller) { for (let index = 0; index < encoded.length; index++) controller.enqueue(encoded.slice(index, index + 1)); controller.close(); } });
  assert.deepEqual(await toEvents(readServerSentEvents(body)), ['{"text":"你好"}', "line 1\nline 2"]);
});

test("relay receives exact model/high reasoning, ignores reasoning chunks and rejects a truncated answer", async () => {
  let submitted;
  const args = { config: { url: "https://relay.invalid/v1/chat/completions", key: "test-only" }, input: input(), mediaContent: [], signal: new AbortController().signal,
    fetchImpl: async (_url, init) => { submitted = JSON.parse(init.body); return new Response(stream(
      'data: {"choices":[{"delta":{"reasoning_content":"private thinking"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"正文"}}]}\n\n', 'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n', 'data: [DONE]\n\n'), { headers: { "content-type": "text/event-stream" } }); } };
  assert.deepEqual(await toEvents(streamTextProvider(args)), ["正文"]);
  assert.equal(submitted.model, "claude-opus-5-5"); assert.equal(submitted.reasoning_effort, "high"); assert.equal(submitted.stream, true);
  await assert.rejects(() => toEvents(streamTextProvider({ ...args, fetchImpl: async () => new Response(stream('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'),
    { headers: { "content-type": "text/event-stream" } }) })), { code: "TEXT_OUTPUT_EMPTY" });
});

function fixture(providerStream) {
  const records = new Map(); const closes = []; let reservations = 0;
  return { records, closes, get reservations() { return reservations; }, options: {
    ownerContext: { ownerId: randomUUID() }, workspaceId: null, signal: new AbortController().signal,
    resources: { pool: {}, config: { provider: { baseUrl: "https://relay.invalid", apiKey: "test-only" } } },
    workspaceResolver: async () => ({ id: "test-workspace" }), mediaResolver: async () => [], providerStream,
    transactions: { recover: async () => {}, begin: async (_pool, { input }) => {
      if (records.has(input.requestId)) return { job: records.get(input.requestId), created: false };
      reservations += 20; const job = { id: input.requestId, state: "running", output_markdown: "" }; records.set(job.id, job); return { job, created: true };
    }, finish: async (_pool, value) => {
      const job = records.get(value.jobId);
      if (job.state !== "running") return job;
      closes.push(value); Object.assign(job, { state: value.state, output_markdown: value.output }); return job;
    } },
  } };
}
test("stream is lazy, settles once, and a successful replay never calls the provider or reserves again", async () => {
  let calls = 0;
  const state = fixture(async function* () { calls++; yield "# 标题\n"; yield "正文"; });
  const request = input();
  const prepared = await prepareTextGeneration({ ...state.options, input: request });
  assert.equal(calls, 0); assert.equal(state.reservations, 20);
  const events = await toEvents(prepared.events);
  assert.deepEqual(events.map((event) => event.type), ["start", "delta", "delta", "done"]);
  assert.equal(state.closes.length, 1); assert.equal(state.closes[0].state, "succeeded");
  const replay = await prepareTextGeneration({ ...state.options, input: request });
  assert.equal((await toEvents(replay.events))[1].text, "# 标题\n正文");
  assert.equal(calls, 1); assert.equal(state.reservations, 20); assert.equal(state.closes.length, 1);
});
test("empty/failing/cancelled streams release once and preserve partial output", async () => {
  for (const [provider, expectedOutput] of [
    [async function* () {}, ""], [async function* () { yield "已写内容"; throw new TextGenerationError("TEXT_PROVIDER_UNAVAILABLE", "暂时不可用", 503); }, "已写内容"],
  ]) {
    const state = fixture(provider); const prepared = await prepareTextGeneration({ ...state.options, input: input() });
    const events = await toEvents(prepared.events);
    assert.equal(events.at(-1).type, "error"); assert.equal(state.closes[0].state, "failed"); assert.equal(state.closes[0].output, expectedOutput);
    await prepared.cancel(); assert.equal(state.closes.length, 1);
  }
  let calls = 0; const state = fixture(async function* () { calls++; yield "should not run"; });
  const prepared = await prepareTextGeneration({ ...state.options, input: input() });
  await prepared.cancel(); await toEvents(prepared.events);
  assert.equal(calls, 0); assert.equal(state.closes.length, 1); assert.equal(state.closes[0].state, "cancelled");
});
test("all input kinds share one port, generated text feeds images, duplicate/self/cyclic edges are rejected", () => {
  const nodes = [{ id: "text", type: "textEditor", data: { text: "输入", markdown: "输入" } },
    { id: "generated", type: "textGenerator", data: { text: "输出", markdown: "**输出**" } },
    { id: "image", type: "sourceImage", data: {} }, { id: "video", type: "sourceVideo", data: {} }, { id: "image-gen", type: "imageGenerator", data: {} }];
  for (const [source, handle] of [["text", "text"], ["image", "reference"], ["video", "video"]]) {
    const edge = { id: source, source, sourceHandle: handle, target: "generated", targetHandle: "reference" };
    assert.equal(isCanvasTextGenerationConnection(edge, nodes, []), true);
    assert.equal(isCanvasTextGenerationConnection(edge, nodes, [edge]), false);
  }
  const textEdge = { id: "out", source: "generated", sourceHandle: "text", target: "image-gen", targetHandle: "reference" };
  assert.equal(isCanvasTextConnection(textEdge, nodes, []), true);
  assert.equal(collectCanvasTextInputs(nodes, [textEdge], "image-gen")[0].text, "输出");
  assert.equal(isCanvasTextGenerationConnection({ source: "generated", target: "generated", sourceHandle: "text", targetHandle: "reference" }, nodes, []), false);
  assert.equal(isCanvasTextConnection(textEdge, nodes, [{ source: "image-gen", target: "generated" }]), false);
});
test("new text node draft/result survives server document validation with image/video/text input edges", () => {
  const text = { id: "text", type: "textEditor", position: { x: 0, y: 0 }, markdown: "hi", text: "hi" };
  const generated = { ...text, id: "generated", type: "textGenerator", textGeneration: { modelId: DEFAULT_TEXT_GENERATION_MODEL, prompt: "继续", history: [{ role: "assistant", content: "hi" }], pendingRequestId: randomUUID() } };
  const doc = { schemaVersion: 1, nodes: [text, generated,
    { id: "image", type: "sourceImage", position: { x: 0, y: 0 }, asset: { id: randomUUID(), kind: "reference" } },
    { id: "video", type: "sourceVideo", position: { x: 0, y: 0 }, asset: { id: randomUUID(), kind: "video" } }],
    edges: [["text", "text"], ["image", "reference"], ["video", "video"]].map(([source, handle]) => ({ id: source, source, target: "generated", sourceHandle: handle, targetHandle: "reference" })),
    generators: {}, convertedReferences: {}, viewport: { x: 0, y: 0, zoom: 1 } };
  assert.deepEqual(validateCanvasProjectSave({ expectedVersion: null, name: "画布", document: doc }).document.nodes[1], generated);
});
