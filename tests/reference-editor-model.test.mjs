import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false, ws: false },
});

after(async () => {
  await vite.close();
});

async function loadModel() {
  return vite.ssrLoadModule(
    "/features/references/reference-editor-model.ts",
  );
}

test("reference editor crop presets stay centered and preserve their pixel ratio", async () => {
  const { cropRectForPreset } = await loadModel();

  assert.deepEqual(cropRectForPreset("original", 1200, 900), {
    height: 1,
    width: 1,
    x: 0,
    y: 0,
  });
  assert.deepEqual(cropRectForPreset("1:1", 1200, 900), {
    height: 1,
    width: 0.75,
    x: 0.125,
    y: 0,
  });
  const portrait = cropRectForPreset("9:16", 1200, 900);
  assert.equal(portrait.height, 1);
  assert.equal(portrait.y, 0);
  assert.ok(Math.abs((portrait.width * 1200) / (portrait.height * 900) - 9 / 16) < 1e-10);
  assert.ok(Math.abs(portrait.x - (1 - portrait.width) / 2) < 1e-10);
});

test("reference editor crop movement and resize remain inside source bounds", async () => {
  const { moveCropRect, resizeCropRect } = await loadModel();
  const crop = { height: 0.5, width: 0.5, x: 0.25, y: 0.25 };

  assert.deepEqual(moveCropRect(crop, { x: 1, y: -1 }), {
    height: 0.5,
    width: 0.5,
    x: 0.5,
    y: 0,
  });
  const resized = resizeCropRect(
    crop,
    "se",
    { x: 0.95, y: 0.95 },
    "1:1",
    1200,
    900,
  );
  assert.ok(resized.x >= 0 && resized.y >= 0);
  assert.ok(resized.x + resized.width <= 1);
  assert.ok(resized.y + resized.height <= 1);
  assert.ok(Math.abs((resized.width * 1200) / (resized.height * 900) - 1) < 1e-10);
});

test("reference editor bbox reports current-canvas pixels and normalized coordinates", async () => {
  const {
    createReferenceEditorBbox,
    formatReferenceEditorBboxPrompt,
  } = await loadModel();
  const bbox = createReferenceEditorBbox(
    { height: 0.25, width: 0.25, x: 0.25, y: 0.25 },
    { height: 0.5, width: 0.5, x: 0.25, y: 0.25 },
    1600,
    1200,
  );

  assert.deepEqual(bbox, {
    canvas: { height: 600, width: 800 },
    normalized: [0, 0, 500, 500],
    pixel: [0, 0, 400, 300],
  });
  assert.equal(
    formatReferenceEditorBboxPrompt(2, bbox),
    "图 2 的目标区域 bbox [0, 0, 500, 500]（当前画布 800×600px；像素 [0, 0, 400, 300]）",
  );
});

test("reference editor history records a gesture once and supports undo and redo", async () => {
  const {
    commitReferenceEditorGesture,
    createReferenceEditorDocument,
    createReferenceEditorHistory,
    hasReferenceEditorPixelEdits,
    redoReferenceEditorHistory,
    undoReferenceEditorHistory,
  } = await loadModel();
  const start = createReferenceEditorDocument();
  const live = {
    ...start,
    strokes: [{
      color: "#b52b30",
      id: "stroke-1",
      points: [{ x: 0.1, y: 0.1 }, { x: 0.3, y: 0.3 }],
      width: 0.02,
    }],
  };
  const duringGesture = { ...createReferenceEditorHistory(start), present: live };
  const committed = commitReferenceEditorGesture(duringGesture, start);

  assert.equal(committed.past.length, 1);
  assert.equal(hasReferenceEditorPixelEdits(committed.present), true);
  const undone = undoReferenceEditorHistory(committed);
  assert.equal(hasReferenceEditorPixelEdits(undone.present), false);
  assert.deepEqual(redoReferenceEditorHistory(undone).present, live);
});

test("reference editor sticker supports hit testing, movement, bounded scale, and rotation", async () => {
  const {
    createReferenceEditorSticker,
    moveReferenceEditorSticker,
    pointInReferenceEditorSticker,
    rotateReferenceEditorSticker,
    scaleReferenceEditorSticker,
  } = await loadModel();
  const sticker = createReferenceEditorSticker({
    crop: { height: 1, width: 1, x: 0, y: 0 },
    id: "sticker-1",
    imageHeight: 1200,
    imageWidth: 1600,
    name: "纹理.png",
    sourceHeight: 500,
    sourceWidth: 1000,
    src: "blob:sticker",
  });

  assert.equal(pointInReferenceEditorSticker({ x: 0.5, y: 0.5 }, sticker, 1600, 1200), true);
  assert.equal(pointInReferenceEditorSticker({ x: 0, y: 0 }, sticker, 1600, 1200), false);
  assert.deepEqual(
    moveReferenceEditorSticker(sticker, { x: 2, y: -2 }, { height: 1, width: 1, x: 0, y: 0 }).center,
    { x: 1, y: 0 },
  );
  assert.equal(scaleReferenceEditorSticker(sticker, 100).scale, 3);
  assert.equal(scaleReferenceEditorSticker(sticker, 0.001).scale, 0.2);
  assert.equal(rotateReferenceEditorSticker(sticker, 195).rotation, -165);
});
