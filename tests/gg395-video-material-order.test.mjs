import test from "node:test";
import assert from "node:assert/strict";
import { defaultVideoGenerationDraft } from "../shared/contracts/video-generation.mjs";
import { canvasVideoDraftForMaterials, canvasVideoDraftForType } from "../features/canvas/canvas-video-material-modes.mjs";

const images = [{ key: "edge:one", kind: "image" }, { key: "direct:two", kind: "image" }, { key: "direct:three", kind: "image" }];

test("frame assignment follows tray image order across connected/direct inputs, independent of old role choices", () => {
  const draft = { ...defaultVideoGenerationDraft(), type: "first_last_frame", roles: {
    "edge:one": "last_frame", "direct:two": "refer_image", "direct:three": "first_frame",
  } };
  const value = canvasVideoDraftForMaterials(draft, [{ key: "prompt", kind: "text" }, ...images]);
  assert.deepEqual(value.roles, { "edge:one": "first_frame", "direct:two": "last_frame", "direct:three": "refer_image" });
  assert.equal(canvasVideoDraftForMaterials(value, [{ key: "prompt", kind: "text" }, ...images]), value);
  assert.deepEqual(draft.roles, { "edge:one": "last_frame", "direct:two": "refer_image", "direct:three": "first_frame" });
});

test("removing the first promotes the remaining image; mode switches classify references automatically", () => {
  const frames = canvasVideoDraftForType(defaultVideoGenerationDraft(), "first_last_frame", images.slice(0, 2));
  const remaining = canvasVideoDraftForMaterials(frames, [images[1]]);
  assert.equal(remaining.type, "first_last_frame");
  assert.deepEqual(remaining.roles, { "direct:two": "first_frame" });
  const references = canvasVideoDraftForType(frames, "reference_to_video", images);
  assert.deepEqual(references.roles, { "edge:one": "refer_image", "direct:two": "refer_image", "direct:three": "refer_image" });
  assert.equal(canvasVideoDraftForMaterials(remaining, []).type, "text_to_video");
});

test("editable frame reassignment preserves the frozen retry composition and material records", () => {
  const lastInput = { type: "first_last_frame", media: [{ key: "old", role: "last_frame" }] };
  const draft = { ...defaultVideoGenerationDraft(), type: "first_last_frame", lastInput, requestId: "old-request",
    materials: [{ kind: "image", assetKind: "reference", assetId: "preserved", name: "synthetic" }] };
  const value = canvasVideoDraftForMaterials(draft, images.slice(0, 2));
  assert.equal(value.lastInput, lastInput);
  assert.equal(value.materials, draft.materials);
  assert.equal(value.requestId, draft.requestId);
  assert.equal(value.lastInput.media[0].role, "last_frame");
});
