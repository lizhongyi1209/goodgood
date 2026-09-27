import assert from "node:assert/strict";
import test from "node:test";

import { canvasImagePositions, selectCanvasImageFiles } from "../features/canvas/canvas-local-images.mjs";
import { initialCanvasImageSize } from "../features/canvas/canvas-image-size.mjs";
import { upsertCanvasJobNodes } from "../features/canvas/canvas-job-nodes.mjs";

test("canvas accepts local JPEG and PNG while reporting invalid files", () => {
  const jpg = { name: "a.jpg", type: "image/jpeg", size: 2_000 };
  const png = { name: "b.png", type: "image/png", size: 20 * 1024 * 1024 };
  const { accepted, errors } = selectCanvasImageFiles([
    jpg,
    { name: "video.mp4", type: "video/mp4", size: 1_000 },
    { name: "empty.png", type: "image/png", size: 0 },
    png,
    { name: "large.jpg", type: "image/jpeg", size: 20 * 1024 * 1024 + 1 },
  ]);
  assert.deepEqual(accepted, [jpg, png]);
  assert.equal(errors.length, 3);
  assert.match(errors[0], /video\.mp4/);
  assert.match(errors[1], /empty\.png/);
  assert.match(errors[2], /large\.jpg/);
  assert.deepEqual(selectCanvasImageFiles([]), { accepted: [], errors: [] });
});

test("multiple dropped images are arranged around the drop point", () => {
  assert.deepEqual(canvasImagePositions({ x: 500, y: 400 }, 2), [
    { x: 254, y: 280 },
    { x: 508, y: 280 },
  ]);
  assert.deepEqual(canvasImagePositions({ x: 500, y: 400 }, 0), []);
});

test("canvas image cards start within bounds without changing source proportions", () => {
  const landscape = initialCanvasImageSize(1200, 800);
  const portrait = initialCanvasImageSize(600, 1200);
  assert.equal(landscape.width, 238);
  assert.equal(landscape.width / landscape.height, 1200 / 800);
  assert.deepEqual(portrait, { width: 160, height: 320 });
  assert.deepEqual(initialCanvasImageSize(40, 20), { width: 40, height: 20 });
  assert.equal(initialCanvasImageSize(0, 100), null);
});

test("new generation updates retain independently placed local images", () => {
  const source = {
    id: "local-image",
    type: "sourceImage",
    position: { x: 47, y: 81 },
    data: { name: "source.png" },
  };
  const job = { id: "job", state: "queued", input: { count: 1 }, outputs: [] };
  const withJob = upsertCanvasJobNodes([source], "run", job, { x: 300, y: 400 }, () => {});
  assert.equal(withJob[0], source);
  assert.deepEqual(withJob.map((node) => node.id), ["local-image", "canvas-run-0"]);
  const failed = upsertCanvasJobNodes(withJob, "run", { ...job, state: "failed" }, { x: 0, y: 0 }, () => {});
  assert.equal(failed[0], source);
  assert.deepEqual(failed[1].position, { x: 300, y: 400 });
});
