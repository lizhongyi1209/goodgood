import test from "node:test";
import assert from "node:assert/strict";
import { defaultVideoGenerationDraft, videoGenerationProblem } from "../shared/contracts/video-generation.mjs";
import { canvasVideoDraftForMaterials, canvasVideoDraftForType, canvasVideoTypeAvailability, canvasVideoUiRolesForType } from "../features/canvas/canvas-video-material-modes.mjs";

const image = (key) => ({ key, kind: "image" });
const video = { key: "video", kind: "video" };
const option = (inputs, type) => canvasVideoTypeAvailability(inputs).find((item) => item.id === type);

test("the single-image entry rejects extra images/video and exposes only the first-frame role", () => {
  assert.equal(option([], "image_to_video").enabled, false);
  assert.equal(option([image("one")], "image_to_video").enabled, true);
  assert.equal(option([image("one"), image("two")], "image_to_video").enabled, false);
  assert.equal(option([image("one"), video], "image_to_video").enabled, false);
  assert.deepEqual(canvasVideoUiRolesForType("image_to_video", "image"), ["first_frame"]);
  assert.deepEqual(canvasVideoUiRolesForType("image_to_video", "video"), []);
});

test("adding another image chooses a compatible mode and preserves materials and retry input", () => {
  const inputs = [image("one"), image("two")];
  const frozen = { type: "image_to_video", media: [{ role: "first_frame" }, { role: "refer_image" }] };
  const draft = { ...defaultVideoGenerationDraft(), type: "image_to_video", lastInput: frozen,
    materials: [{ kind: "image", assetKind: "reference", assetId: "preserved", name: "synthetic" }] };
  const next = canvasVideoDraftForMaterials(draft, inputs);
  assert.notEqual(next.type, "image_to_video");
  assert.equal(next.lastInput, frozen);
  assert.equal(next.materials, draft.materials);
  assert.equal(canvasVideoDraftForType(next, "image_to_video", inputs), next);
});

test("all visible choices have concise rules, including disabled choices and media limits", () => {
  for (const inputs of [[], [image("one")], [video]]) {
    const choices = canvasVideoTypeAvailability(inputs);
    assert.ok(choices.every((item) => typeof item.rule === "string" && item.rule.length > 0));
    assert.match(choices.find((item) => item.id === "image_to_video").rule, /1.*首帧/);
    assert.match(choices.find((item) => item.id === "first_last_frame").rule, /尾帧可选/);
    assert.match(choices.find((item) => item.id === "reference_to_video").rule, /1–7.*4/);
  }
  assert.equal(option([video, ...Array.from({ length: 4 }, (_, index) => image(String(index)))], "reference_to_video").enabled, true);
  assert.equal(option([video, ...Array.from({ length: 5 }, (_, index) => image(String(index)))], "reference_to_video").enabled, false);
});

test("the provider contract still accepts historical first-frame plus reference snapshots", () => {
  const draft = defaultVideoGenerationDraft();
  const legacy = { ...draft, type: "image_to_video", prompt: "保留原冻结请求", media: [
    { kind: "image", assetKind: "reference", assetId: "first", name: "first", role: "first_frame" },
    { kind: "image", assetKind: "reference", assetId: "reference", name: "reference", role: "refer_image" },
  ] };
  assert.equal(videoGenerationProblem(legacy), null);
});
