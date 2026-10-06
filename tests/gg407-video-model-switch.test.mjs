import test from "node:test";
import assert from "node:assert/strict";
import { defaultVideoGenerationDraft, videoGenerationProblem } from "../shared/contracts/video-generation.mjs";
import { canvasVideoDraftForMaterials, canvasVideoDraftForModel } from "../features/canvas/canvas-video-material-modes.mjs";

const image = (key, patch = {}) => ({ key, kind: "image", ...patch });
const video = (key, patch = {}) => ({ key, kind: "video", ...patch });
const text = { key: "edge:prompt", kind: "text" };
const draft = (patch = {}) => ({ ...defaultVideoGenerationDraft(), prompt: "人物缓慢抬头", ...patch });
const request = (value, inputs) => ({ ...value, media: inputs.filter((item) => item.kind !== "text").map((item, index) => ({
  kind: item.kind, assetKind: item.kind === "video" ? "video" : "reference", assetId: String(index), name: item.key, role: value.roles[item.key],
})) });

test("empty and incomplete media permit choosing Motion without reconciliation reverting the model", () => {
  for (const inputs of [[], [text], [image("first")], [video("action")]]) {
    const plan = canvasVideoDraftForModel(draft(), "kling-3.0", inputs);
    assert.equal(plan.draft.modelId, "kling-3.0");
    assert.equal(plan.draft.type, "motion_control");
    assert.deepEqual(plan.removedKeys, []);
    assert.equal(canvasVideoDraftForMaterials(plan.draft, inputs), plan.draft);
    assert.match(videoGenerationProblem(request(plan.draft, inputs)), /角色图片和一个动作视频/);
  }
  const selected = canvasVideoDraftForModel(draft(), "kling-3.0", []).draft;
  const inputs = [text, image("first"), video("action")];
  const ready = canvasVideoDraftForMaterials(selected, inputs);
  assert.equal(ready.modelId, "kling-3.0");
  assert.deepEqual(ready.roles, { first: "image", action: "video" });
  assert.equal(videoGenerationProblem(request(ready, inputs)), null);
});

test("Motion retains ordered first image/video and text, removing only excess direct and connected references", () => {
  const materials = [{ kind: "image", assetKind: "reference", assetId: "extra-image", name: "参考图" },
    { kind: "video", assetKind: "video", assetId: "extra-video", name: "视频" }];
  const frozen = { modelId: "kling-3.0-omni", prompt: "原请求", media: [] };
  const value = Object.freeze(draft({ resolution: "4k", audio: "native", count: 4, materials: Object.freeze(materials),
    shots: Object.freeze([{ seconds: 5, text: "原场景" }]), lastInput: frozen, requestId: "old-request" }));
  const inputs = [text, image("edge:first", { unavailable: true }), image("direct:reference:extra-image"),
    image("edge:last"), video("edge:action"), video("direct:video:extra-video")];
  const plan = canvasVideoDraftForModel(value, "kling-3.0", inputs);
  assert.deepEqual(plan.removedKeys, ["direct:reference:extra-image", "edge:last", "direct:video:extra-video"]);
  assert.deepEqual(plan.draft.materials, []);
  assert.deepEqual(plan.draft.roles, { "edge:first": "image", "edge:action": "video" });
  assert.equal(plan.draft.resolution, "1080p");
  assert.equal(plan.draft.audio, "original");
  assert.equal(plan.draft.multiShot, false);
  assert.deepEqual(plan.draft.shots, []);
  assert.equal(plan.draft.prompt, value.prompt);
  assert.equal(plan.draft.count, 4);
  assert.equal(plan.draft.lastInput, frozen);
  assert.equal(plan.draft.requestId, value.requestId);
  assert.equal(value.materials.length, 2);
  assert.equal(value.shots.length, 1);
  assert.equal(value.resolution, "4k");
});

test("returning to Omni retains compatible direct media and selects valid reference/smart settings", () => {
  const materials = [{ kind: "image", assetKind: "reference", assetId: "person", name: "人物", role: "image" },
    { kind: "video", assetKind: "video", assetId: "action", name: "动作", role: "video" }];
  const inputs = [text, image("direct:reference:person"), video("direct:video:action")];
  const value = draft({ modelId: "kling-3.0", type: "motion_control", materials, audio: "original", multiShot: false });
  const plan = canvasVideoDraftForModel(value, "kling-3.0-omni", inputs);
  assert.deepEqual(plan.removedKeys, []);
  assert.equal(plan.draft.materials.length, 2);
  assert.equal(plan.draft.type, "reference_to_video");
  assert.deepEqual(plan.draft.roles, { "direct:reference:person": "refer_image", "direct:video:action": "feature_video" });
  assert.equal(plan.draft.multiShot, true);
  assert.equal(plan.draft.audio, "off");
  assert.equal(videoGenerationProblem(request(plan.draft, inputs)), null);
  const removedVideo = canvasVideoDraftForMaterials(plan.draft, inputs.slice(0, 2));
  assert.equal(removedVideo.modelId, "kling-3.0-omni");
  assert.equal(removedVideo.type, "reference_to_video");
});

test("Omni switch retains up to four images with a video or seven without video, in tray order", () => {
  const value = draft({ modelId: "kling-3.0", type: "motion_control", multiShot: false });
  const images = Array.from({ length: 8 }, (_, index) => image(`image:${index}`));
  const withVideo = canvasVideoDraftForModel(value, "kling-3.0-omni", [text, ...images, video("first-video"), video("extra-video")]);
  assert.deepEqual(withVideo.removedKeys, ["image:4", "image:5", "image:6", "image:7", "extra-video"]);
  assert.equal(Object.values(withVideo.draft.roles).filter((role) => role === "refer_image").length, 4);
  assert.equal(withVideo.draft.roles["first-video"], "feature_video");
  const imagesOnly = canvasVideoDraftForModel(value, "kling-3.0-omni", [text, ...images]);
  assert.deepEqual(imagesOnly.removedKeys, ["image:7"]);
  assert.equal(imagesOnly.draft.type, "first_last_frame");
  assert.equal(imagesOnly.draft.roles["image:0"], "first_frame");
  assert.equal(imagesOnly.draft.roles["image:1"], "last_frame");
  assert.equal(Object.keys(imagesOnly.draft.roles).length, 7);
});

test("switching to the same or unknown model does not discard excess pending references", () => {
  const value = draft();
  const inputs = Array.from({ length: 8 }, (_, index) => image(String(index), { unavailable: true }));
  for (const modelId of [value.modelId, "unsupported"]) {
    const plan = canvasVideoDraftForModel(value, modelId, inputs);
    assert.equal(plan.draft, value);
    assert.deepEqual(plan.removedKeys, []);
  }
  assert.equal(canvasVideoDraftForMaterials(value, inputs).modelId, value.modelId);
});
