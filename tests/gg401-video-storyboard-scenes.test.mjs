import test from "node:test";
import assert from "node:assert/strict";
import { canvasVideoStoryboardResize, canvasVideoStoryboardSceneSeconds, canvasVideoCameraPrompt,
  CANVAS_VIDEO_CAMERA_REFERENCES } from "../features/canvas/canvas-video-storyboard.mjs";
import { defaultVideoGenerationDraft, videoProviderBody } from "../shared/contracts/video-generation.mjs";
import { validateVideoDraft, validateVideoGeneration } from "../server/video-generation/validation.mjs";

test("total changes allocate whole seconds and preserve every scene and the original draft", () => {
  assert.deepEqual(canvasVideoStoryboardResize([], 5), []);
  for (let count = 1; count <= 6; count++) {
    const scenes = Object.freeze(Array.from({ length: count }, (_, index) => Object.freeze({ seconds: index + 1, text: `场景${index}` })));
    for (let total = Math.max(3, count); total <= 15; total++) {
      const resized = canvasVideoStoryboardResize(scenes, total);
      assert.equal(resized.reduce((sum, scene) => sum + scene.seconds, 0), total);
      assert.ok(resized.every((scene) => Number.isInteger(scene.seconds) && scene.seconds >= 1));
      assert.deepEqual(resized.map((scene) => scene.text), scenes.map((scene) => scene.text));
      assert.deepEqual(scenes.map((scene) => scene.seconds), Array.from({ length: count }, (_, index) => index + 1));
      assert.deepEqual(canvasVideoStoryboardResize(resized, total), resized);
    }
  }
});

test("changing a scene redistributes remaining time instead of leaving mismatched totals", () => {
  const scenes = Object.freeze([Object.freeze({ seconds: 2, text: "首场景" }), Object.freeze({ seconds: 3, text: "第二场景" }), Object.freeze({ seconds: 5, text: "第三场景" })]);
  const changed = canvasVideoStoryboardSceneSeconds(scenes, 1, 7, 10);
  assert.equal(changed[1].seconds, 7);
  assert.equal(changed.reduce((sum, scene) => sum + scene.seconds, 0), 10);
  assert.ok(changed.every((scene) => scene.seconds >= 1));
  assert.deepEqual(changed.map((scene) => scene.text), scenes.map((scene) => scene.text));
  assert.equal(canvasVideoStoryboardSceneSeconds(scenes, 1, 100, 10)[1].seconds, 8);
  assert.equal(canvasVideoStoryboardSceneSeconds(scenes, 1, 0, 10)[1].seconds, 1);
  assert.deepEqual(canvasVideoStoryboardSceneSeconds(scenes, 8, 5, 10), scenes);
});

test("camera references preserve the description, replace only an exact reference and respect connected text limits", () => {
  const prompt = canvasVideoCameraPrompt("人物缓慢抬头", "zoom-in");
  assert.ok(prompt.startsWith("人物缓慢抬头\n\n"));
  assert.equal(canvasVideoCameraPrompt(prompt, "zoom-in"), prompt);
  const replaced = canvasVideoCameraPrompt(prompt, "pan");
  assert.ok(replaced.includes("人物缓慢抬头"));
  assert.ok(replaced.endsWith(CANVAS_VIDEO_CAMERA_REFERENCES.find((item) => item.id === "pan").text));
  assert.ok(!replaced.includes("镜头缓慢变焦拉近"));
  assert.equal(canvasVideoCameraPrompt("x".repeat(3072), "pan"), null);
  assert.equal(canvasVideoCameraPrompt("主体", "pan", "x".repeat(3072)), null);
  assert.equal(canvasVideoCameraPrompt("主体", "unknown"), null);
  const input = { ...defaultVideoGenerationDraft(), prompt, multiShot: false, media: [] };
  assert.equal(videoProviderBody(input, []).settings.camera_control, undefined);
  assert.equal(videoProviderBody(input, []).contents[0].text, prompt);
});

test("automatic is a new-node default; restored choices and omitted legacy fields keep their original behavior", () => {
  const draft = defaultVideoGenerationDraft();
  assert.equal(draft.multiShot, true);
  assert.equal(validateVideoDraft({ ...draft, multiShot: false }).multiShot, false);
  const { multiShot, ...legacy } = draft;
  assert.equal(validateVideoDraft(legacy).multiShot, false);
  const { materials, roles, ...base } = draft;
  const request = { ...base, requestId: "00000000-0000-4000-8000-000000000001",
    projectId: "00000000-0000-4000-8000-000000000002", media: [], prompt: "主体动作" };
  const { multiShot: oldFlag, ...oldRequest } = request;
  assert.equal(validateVideoGeneration(oldRequest).multiShot, false);
  assert.equal(validateVideoDraft({ ...draft, requestId: request.requestId, lastInput: oldRequest }).lastInput.multiShot, false);
  const saved = validateVideoDraft({ ...draft, prompt: "原描述保留", duration: 8,
    shots: [{ seconds: 3, text: "人物抬头" }, { seconds: 5, text: "镜头拉远" }] });
  assert.equal(saved.multiShot, true);
  assert.equal(saved.prompt, "原描述保留");
  const applied = validateVideoGeneration({ ...request, prompt: "", duration: saved.duration, shots: saved.shots });
  assert.equal(videoProviderBody(applied, []).contents[0].text, "shot 1, 3s, 人物抬头; shot 2, 5s, 镜头拉远");
});
