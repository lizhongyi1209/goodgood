import test from "node:test";
import assert from "node:assert/strict";
import { defaultVideoGenerationDraft, videoProviderBody } from "../shared/contracts/video-generation.mjs";
import { canvasVideoDraftForMaterials, canvasVideoDraftForType, canvasVideoParameterVisibility, canvasVideoTypeAvailability } from "../features/canvas/canvas-video-material-modes.mjs";

const image = (key) => ({ key, kind: "image" });
const video = { key: "video", kind: "video" };
const views = (draft, inputs) => inputs.map((item) => ({ ...item, role: draft.roles[item.key] }));

test("menu reorder keeps automatic frame preference and preserves an explicit reference choice", () => {
  const inputs = [image("first"), image("last")];
  const choices = canvasVideoTypeAvailability(inputs);
  const reference = choices.find((item) => item.id === "reference_to_video");
  assert.equal(reference.name, "全能参考");
  assert.ok(choices.indexOf(reference) < choices.findIndex((item) => item.id === "first_last_frame"));
  const frozen = { type: "text_to_video", media: [] };
  const draft = { ...defaultVideoGenerationDraft(), lastInput: frozen, resolution: "1080p" };
  const frames = canvasVideoDraftForMaterials(draft, inputs);
  assert.equal(frames.type, "first_last_frame");
  assert.equal(frames.lastInput, frozen);
  assert.equal(frames.resolution, "1080p");
  const referenced = canvasVideoDraftForType(frames, "reference_to_video", inputs);
  assert.equal(canvasVideoDraftForMaterials(referenced, inputs), referenced);
});

test("inherited ratio is hidden while independently selectable output resolution is still sent", () => {
  for (const role of ["first_frame", "feature_video", "base_video"]) {
    const type = role === "first_frame" ? "first_last_frame" : role === "feature_video" ? "reference_to_video" : "video_edit";
    const inputs = [{ role }];
    assert.equal(canvasVideoParameterVisibility(type, inputs).aspectRatio, false);
    const input = { ...defaultVideoGenerationDraft(), type, prompt: "synthetic", resolution: "1080p" };
    const body = videoProviderBody(input, [{ role, url: "https://example.test/media" }]);
    assert.equal(body.settings.aspect_ratio, undefined);
    assert.equal(body.settings.resolution, "1080p");
  }
  assert.equal(canvasVideoParameterVisibility("text_to_video", []).aspectRatio, true);
  assert.equal(canvasVideoParameterVisibility("reference_to_video", [{ role: "refer_image" }]).aspectRatio, true);
});

test("pending reference video hides fixed options; removing it restores image-reference choices", () => {
  const inputs = [image("image"), { ...video, unavailable: true }];
  const draft = canvasVideoDraftForType(defaultVideoGenerationDraft(), "reference_to_video", inputs);
  const visible = canvasVideoParameterVisibility(draft.type, views(draft, inputs));
  assert.deepEqual(visible, { aspectRatio: false, duration: true, audio: false, storyboard: false });
  assert.equal(draft.audio, "off");
  assert.equal(draft.multiShot, true);
  const imageOnly = canvasVideoDraftForMaterials(draft, inputs.slice(0, 1));
  assert.deepEqual(canvasVideoParameterVisibility(imageOnly.type, views(imageOnly, inputs.slice(0, 1))), {
    aspectRatio: true, duration: true, audio: true, storyboard: true,
  });
  assert.deepEqual(canvasVideoParameterVisibility("motion_control", [{ role: "image" }, { role: "video" }]), {
    aspectRatio: false, duration: false, audio: true, storyboard: false,
  });
  assert.equal(canvasVideoParameterVisibility("video_edit", [{ role: "base_video" }]).storyboard, false);
});
