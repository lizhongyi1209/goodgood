import test from "node:test";
import assert from "node:assert/strict";
import { defaultVideoGenerationDraft, videoGenerationProblem } from "../shared/contracts/video-generation.mjs";
import { canvasVideoTypeAvailability, canvasVideoDraftForMaterials, canvasVideoDraftForType } from "../features/canvas/canvas-video-material-modes.mjs";

const image = (key, role) => ({ key, kind: "image", role });
const video = (key = "video") => ({ key, kind: "video" });
const enabled = (inputs) => canvasVideoTypeAvailability(inputs).filter((item) => item.enabled).map((item) => item.id);
const draft = (patch = {}) => ({ ...defaultVideoGenerationDraft(), prompt: "人物缓慢抬头", ...patch });
const request = (value, inputs) => ({ ...value, media: inputs.filter((item) => item.kind !== "text").map((item, index) => ({
  kind: item.kind, assetKind: item.kind === "video" ? "video" : "reference", assetId: String(index), name: item.key, role: value.roles[item.key],
})) });

test("empty/text-only inputs allow only text; attaching and removing images changes the editable mode", () => {
  assert.deepEqual(enabled([]), ["text_to_video"]);
  assert.deepEqual(enabled([{ key: "prompt", kind: "text" }]), ["text_to_video"]);
  const inputs = [image("edge:image")];
  assert.deepEqual(enabled(inputs), ["image_to_video", "reference_to_video"]);
  const value = canvasVideoDraftForMaterials(draft(), inputs);
  assert.equal(value.type, "image_to_video");
  assert.equal(value.roles[inputs[0].key], "first_frame");
  assert.equal(videoGenerationProblem(request(value, inputs)), null);
  assert.equal(canvasVideoDraftForMaterials(value, inputs), value);
  const emptied = canvasVideoDraftForMaterials(value, []);
  assert.equal(emptied.type, "text_to_video");
  assert.deepEqual(emptied.roles, {});
  assert.equal(canvasVideoDraftForType(value, "text_to_video", inputs), value);
});

test("two images enable first/last frames and switching types redistributes every material", () => {
  const inputs = [image("first"), image("last"), image("reference")];
  assert.ok(enabled(inputs).includes("first_last_frame"));
  const frames = canvasVideoDraftForType(draft(), "first_last_frame", inputs);
  assert.deepEqual(frames.roles, { first: "first_frame", last: "last_frame", reference: "refer_image" });
  assert.equal(videoGenerationProblem(request(frames, inputs)), null);
  const swapped = canvasVideoDraftForType({ ...frames, roles: { first: "last_frame", last: "first_frame", reference: "refer_image" } }, "first_last_frame", inputs);
  assert.equal(swapped.roles.last, "first_frame");
  assert.equal(swapped.roles.first, "last_frame");
  const reference = canvasVideoDraftForType(frames, "reference_to_video", inputs);
  assert.ok(Object.values(reference.roles).every((role) => role === "refer_image"));
  assert.equal(canvasVideoDraftForMaterials(reference, inputs), reference);
  assert.equal(canvasVideoDraftForMaterials(frames, [inputs[0]]).type, "image_to_video");
});

test("video inputs enable reference/editing, and motion needs exactly one image plus one video", () => {
  assert.deepEqual(enabled([video()]), ["reference_to_video", "video_edit"]);
  const reference = canvasVideoDraftForMaterials(draft({ audio: "native", shots: [{ seconds: 5, text: "镜头" }] }), [video()]);
  assert.equal(reference.type, "reference_to_video");
  assert.equal(reference.roles.video, "feature_video");
  assert.equal(reference.audio, "off");
  assert.equal(reference.multiShot, true);
  assert.deepEqual(reference.shots, []);
  assert.equal(videoGenerationProblem(request(reference, [video()])), null);
  const inputs = [image("character"), video()];
  assert.deepEqual(enabled(inputs), ["reference_to_video", "video_edit", "motion_control"]);
  const motion = canvasVideoDraftForType(draft({ resolution: "4k" }), "motion_control", inputs);
  assert.equal(motion.modelId, "kling-3.0");
  assert.equal(motion.resolution, "1080p");
  assert.deepEqual(motion.roles, { character: "image", video: "video" });
  assert.equal(videoGenerationProblem(request(motion, inputs)), null);
  assert.equal(canvasVideoDraftForMaterials(motion, inputs), motion);
  assert.equal(canvasVideoDraftForMaterials(motion, [inputs[0]]).modelId, "kling-3.0-omni");
  assert.ok(!enabled([...inputs, image("extra")]).includes("motion_control"));
  const edit = canvasVideoDraftForType(reference, "video_edit", [video()]);
  assert.equal(edit.roles.video, "base_video");
  assert.equal(edit.multiShot, false);
  assert.equal(videoGenerationProblem(request(edit, [video()])), null);
});

test("pending media participate in availability; excess inputs remain visible without enabling an invalid mode", () => {
  assert.ok(!enabled([{ ...image("upload"), unavailable: true }]).includes("text_to_video"));
  assert.deepEqual(enabled([video("one"), video("two")]), []);
  assert.deepEqual(enabled(Array.from({ length: 8 }, (_, index) => image(`image${index}`))), []);
  assert.deepEqual(enabled([video(), ...Array.from({ length: 5 }, (_, index) => image(`image${index}`))]), []);
});

test("draft adaptation retains generation count, prompt and the immutable retry snapshot", () => {
  const frozen = { type: "text_to_video", prompt: "原始输入", media: [] };
  const value = draft({ count: 4, lastInput: frozen, requestId: "existing-request" });
  const adapted = canvasVideoDraftForMaterials(value, [image("new")]);
  assert.equal(adapted.count, 4);
  assert.equal(adapted.prompt, value.prompt);
  assert.equal(adapted.lastInput, frozen);
  assert.equal(adapted.requestId, value.requestId);
  assert.equal(value.type, "text_to_video");
  assert.deepEqual(value.roles, {});
});
