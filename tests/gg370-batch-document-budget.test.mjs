import test from "node:test";
import assert from "node:assert/strict";
import { createCanvasBatchDocumentBudget, CANVAS_BATCH_DOCUMENT_BYTE_LIMIT } from "../features/canvas/canvas-batch-document-budget.mjs";
import { canvasImageSlotFrozenInput } from "../features/canvas/canvas-image-slots.mjs";

const uuid = (index) => String(index).padStart(8, "0") + "-0000-4000-8000-000000000000";
const snapshot = (prompt = "保持人物，替换服装。🧵") => ({ prompt, composerPrompt: "不持久化的显示内容", modelId: "nano-banana-2",
  catalogModelName: "仅用于显示", references: [{ id: uuid(5), name: "参考服装🧥.png", status: "ready", url: "/private-image" }],
  aspectRatio: "adaptive", resolution: "2K", count: 12, projectId: uuid(9), canvasProjectId: uuid(7), expectedPriceVersion: 4 });
const bytes = (value) => new TextEncoder().encode(JSON.stringify(value)).byteLength;
const slot = (input, index = 1) => ({ id: uuid(index), requestKey: uuid(index + 100),
  input: canvasImageSlotFrozenInput({ ...input, count: 1 }) });
const document = (slots = []) => ({ name: "批量画布", document: { schemaVersion: 1,
  nodes: [{ id: "batch", type: "imageGenerator", position: { x: 10, y: 20 }, imageSlots: slots }], edges: [], generators: {} } });

test("incremental budget equals actual frozen cloud JSON bytes, including Chinese and emoji UTF-8", () => {
  const first = snapshot(), second = snapshot("商品放到图一的场景里。");
  const budget = createCanvasBatchDocumentBudget(bytes(document()));
  assert.equal(budget.append(first, 3), true);
  const actual = [slot(first, 1), slot(first, 2), slot(first, 3)];
  assert.equal(budget.bytes, bytes(document(actual)));
  assert.equal(budget.append(second, 2), true);
  actual.push(slot(second, 4), slot(second, 5));
  assert.equal(budget.bytes, bytes(document(actual)));
  assert.equal(budget.append(first, 0), true);
  assert.equal(budget.bytes, bytes(document(actual)));
});

test("single-item and multi-item appends account for exactly one comma between records", () => {
  const input = snapshot("plain");
  const recordBytes = bytes(slot(input));
  const budget = createCanvasBatchDocumentBudget(2);
  assert.equal(budget.append(input, 1), true);
  assert.equal(budget.bytes, 2 + recordBytes);
  assert.equal(budget.append(input, 1), true);
  assert.equal(budget.bytes, 2 + recordBytes * 2 + 1);
  assert.equal(budget.append(input, 3), true);
  assert.equal(budget.bytes, 2 + recordBytes * 5 + 4);
});

test("exact existing one-MiB ceiling is accepted; overflow is atomic and does not consume future capacity", () => {
  const input = snapshot();
  const recordBytes = bytes(slot(input));
  const exact = createCanvasBatchDocumentBudget(CANVAS_BATCH_DOCUMENT_BYTE_LIMIT - recordBytes);
  assert.equal(exact.append(input, 1), true);
  assert.equal(exact.bytes, CANVAS_BATCH_DOCUMENT_BYTE_LIMIT);
  assert.equal(exact.append(input, 1), false);
  assert.equal(exact.bytes, CANVAS_BATCH_DOCUMENT_BYTE_LIMIT);
  const room = createCanvasBatchDocumentBudget(CANVAS_BATCH_DOCUMENT_BYTE_LIMIT - recordBytes);
  const before = room.bytes;
  assert.equal(room.append(input, 2), false);
  assert.equal(room.bytes, before);
  assert.equal(room.append(input, 1), true);
  const overflow = createCanvasBatchDocumentBudget(CANVAS_BATCH_DOCUMENT_BYTE_LIMIT - recordBytes + 1);
  assert.equal(overflow.append(input, 1), false);
  assert.equal(overflow.bytes, CANVAS_BATCH_DOCUMENT_BYTE_LIMIT - recordBytes + 1);
});

test("astronomical counts are rejected arithmetically; budget never constructs a slot array", () => {
  const budget = createCanvasBatchDocumentBudget(bytes(document()));
  const before = budget.bytes;
  assert.equal(budget.append(snapshot(), Number.MAX_SAFE_INTEGER), false);
  assert.equal(budget.bytes, before);
  assert.equal(budget.append(snapshot(), 1_000_000_000_000_000), false);
  assert.equal(budget.bytes, before);
  assert.equal(budget.append(snapshot(), 1), true);
});

test("cloud-only snapshot data controls size; local URLs/display metadata and original generation count are excluded", () => {
  const first = snapshot();
  const altered = { ...first, references: first.references.map((reference) => ({ ...reference, url: "/" + "x".repeat(20000), status: "failed" })),
    count: 6, composerPrompt: "x".repeat(20000), catalogModelName: "x".repeat(20000), projectId: uuid(99) };
  const a = createCanvasBatchDocumentBudget(2), b = createCanvasBatchDocumentBudget(2);
  assert.equal(a.append(first, 2), true);
  assert.equal(b.append(altered, 2), true);
  assert.equal(a.bytes, b.bytes);
  assert.equal(first.count, 12);
  assert.equal(first.references[0].url, "/private-image");
});

test("invalid counts/snapshots fail atomically and an oversized base fails closed", () => {
  const budget = createCanvasBatchDocumentBudget(2);
  for (const count of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(budget.append(snapshot(), count), false);
    assert.equal(budget.bytes, 2);
  }
  assert.equal(budget.append({ ...snapshot(), references: null }, 1), false);
  assert.equal(budget.bytes, 2);
  assert.equal(budget.append(snapshot(), 1), true);
  const oversized = createCanvasBatchDocumentBudget(CANVAS_BATCH_DOCUMENT_BYTE_LIMIT + 1);
  assert.equal(oversized.append(snapshot(), 0), false);
  assert.equal(oversized.append(snapshot(), 1), false);
  for (const invalid of [-1, 0.5, Infinity, NaN]) assert.throws(() => createCanvasBatchDocumentBudget(invalid), RangeError);
});
