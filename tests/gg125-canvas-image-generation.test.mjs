import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { upsertCanvasJobNodes } from "../features/canvas/canvas-job-nodes.mjs";

const job = (state, count = 2) => ({
  id: "job-1",
  state,
  input: { count },
  outputs: state === "succeeded" ? [{ id: "image-1" }, { id: "image-2" }] : [],
  error: state === "failed" ? { title: "失败", message: "可重试" } : null,
});

test("canvas result nodes keep their positions through progress, failure and retry", () => {
  const retry = () => {};
  const queued = upsertCanvasJobNodes([], "run-1", job("queued"), { x: 20, y: 40 }, retry);
  assert.deepEqual(queued.map(({ id, position }) => ({ id, position })), [
    { id: "canvas-run-1-0", position: { x: 20, y: 40 } },
    { id: "canvas-run-1-1", position: { x: 274, y: 40 } },
  ]);

  const dragged = queued.map((node, index) => index === 0
    ? { ...node, position: { x: 90, y: 120 } }
    : node);
  const running = upsertCanvasJobNodes(dragged, "run-1", job("running"), { x: 0, y: 0 }, retry);
  assert.equal(running[0].position.x, 90);
  assert.equal(running[1].position.x, 274);

  const failed = upsertCanvasJobNodes(running, "run-1", job("failed"), { x: 0, y: 0 }, retry);
  assert.equal(failed.length, 1);
  assert.deepEqual(failed[0].position, { x: 90, y: 120 });

  const retried = upsertCanvasJobNodes(failed, "run-1", job("queued"), { x: 0, y: 0 }, retry);
  assert.deepEqual(retried.map((node) => node.position), [
    { x: 90, y: 120 },
    { x: 344, y: 120 },
  ]);
  const succeeded = upsertCanvasJobNodes(retried, "run-1", job("succeeded"), { x: 0, y: 0 }, retry);
  assert.equal(succeeded[0].data.job.outputs[0].id, "image-1");
  assert.equal(succeeded[1].data.job.outputs[1].id, "image-2");

  const resized = succeeded.map((node, index) => index === 0
    ? { ...node, width: 160, height: 320, data: { ...node.data, imageSized: true } }
    : node);
  const refreshed = upsertCanvasJobNodes(resized, "run-1", job("succeeded"), { x: 0, y: 0 }, retry);
  assert.deepEqual({ width: refreshed[0].width, height: refreshed[0].height }, { width: 160, height: 320 });
  assert.equal(refreshed[0].data.imageSized, true);
  const replacement = { ...job("succeeded"), outputs: [{ id: "image-new" }, { id: "image-2" }] };
  const replaced = upsertCanvasJobNodes(refreshed, "run-1", replacement, { x: 0, y: 0 }, retry);
  assert.equal(replaced[0].width, undefined);
  assert.equal(replaced[0].data.imageSized, false);
});

test("canvas route owns its page and leaves the main workspace", () => {
  const page = readFileSync(new URL("../app/canvas/page.tsx", import.meta.url), "utf8");
  const workspace = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /CanvasPage/);
  assert.doesNotMatch(page, /\.\.\/page/);
  assert.match(workspace, /href="\/canvas"/);
  assert.doesNotMatch(workspace, /<CanvasWorkspace/);
});

test("canvas result starts at metadata dimensions and keeps a later user resize", () => {
  const output = { id: "sized-image", width: 1200, height: 1600 };
  const succeeded = upsertCanvasJobNodes([], "sized", {
    ...job("succeeded", 1), outputs: [output],
  }, { x: 10, y: 20 }, () => {});
  assert.deepEqual(succeeded[0].style, { width: 238, height: 317.3333333333333 });
  assert.equal(succeeded[0].data.imageSized, true);
  const resized = [{ ...succeeded[0], width: 180, height: 240 }];
  const refreshed = upsertCanvasJobNodes(resized, "sized", {
    ...job("succeeded", 1), outputs: [output],
  }, { x: 10, y: 20 }, () => {});
  assert.deepEqual({ width: refreshed[0].width, height: refreshed[0].height }, { width: 180, height: 240 });
});
