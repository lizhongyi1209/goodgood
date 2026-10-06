import test from "node:test";
import assert from "node:assert/strict";
import { defaultVideoGenerationDraft, videoGenerationProblem, videoProviderBody } from "../shared/contracts/video-generation.mjs";
import { validateVideoGeneration } from "../server/video-generation/validation.mjs";
import { canvasVideoDraftForType, canvasVideoSubmissionType, canvasVideoTypeAvailability } from "../features/canvas/canvas-video-material-modes.mjs";

const media = (role, index = 3) => ({ kind: "image", assetKind: "reference", name: "synthetic.png",
  assetId: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`, role });
const input = (items) => {
  const { materials, roles, ...draft } = defaultVideoGenerationDraft();
  return { ...draft, type: "first_last_frame", prompt: "镜头缓慢推进", media: items,
    requestId: "00000000-0000-4000-8000-000000000001", projectId: "00000000-0000-4000-8000-000000000002" };
};

test("one image enables first/last-frame mode without creating a last frame", () => {
  const images = [{ key: "edge:first", kind: "image" }];
  assert.ok(canvasVideoTypeAvailability(images).find((item) => item.id === "first_last_frame").enabled);
  const draft = canvasVideoDraftForType(defaultVideoGenerationDraft(), "first_last_frame", images);
  assert.equal(draft.type, "first_last_frame");
  assert.deepEqual(draft.roles, { "edge:first": "first_frame" });
});

test("first-only is valid and submits through the existing single-frame request", () => {
  const source = input([media("first_frame")]);
  assert.equal(videoGenerationProblem(source), null);
  assert.equal(validateVideoGeneration(source).media.length, 1);
  const type = canvasVideoSubmissionType(source.type, source.media);
  assert.equal(type, "image_to_video");
  const frozen = validateVideoGeneration({ ...source, type });
  const body = videoProviderBody(frozen, frozen.media.map((item) => ({ ...item, url: "https://example.test/first.png" })));
  assert.deepEqual(body.contents.map((item) => item.type), ["prompt", "first_frame"]);
  assert.equal(source.type, "first_last_frame");
});

test("first and last preserve two-frame requests; empty and last-only remain invalid", () => {
  const source = input([media("first_frame"), media("last_frame", 4)]);
  assert.equal(canvasVideoSubmissionType(source.type, source.media), "first_last_frame");
  assert.equal(videoGenerationProblem(source), null);
  assert.throws(() => validateVideoGeneration(input([])), /首帧/);
  assert.throws(() => validateVideoGeneration(input([media("last_frame")])), /首帧/);
});
