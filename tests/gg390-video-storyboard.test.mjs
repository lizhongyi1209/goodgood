import test from "node:test";
import assert from "node:assert/strict";
import { canvasVideoStoryboardShots, canvasVideoStoryboardProblem } from "../features/canvas/canvas-video-storyboard.mjs";
import { defaultVideoGenerationDraft, videoProviderBody } from "../shared/contracts/video-generation.mjs";
import { validateVideoGeneration } from "../server/video-generation/validation.mjs";

test("connected context is included once in the first shot without mutating the editor's draft", () => {
  const shots = [{ seconds: 2, text: "  人物抬头  " }, { seconds: 3, text: " 镜头拉远 " }];
  const effective = canvasVideoStoryboardShots(shots, " 主体为年轻女性 ");
  assert.deepEqual(effective, [{ seconds: 2, text: "主体为年轻女性\n\n人物抬头" }, { seconds: 3, text: "镜头拉远" }]);
  assert.equal(shots[0].text, "  人物抬头  ");
  assert.equal(canvasVideoStoryboardProblem(shots, 5, " 主体为年轻女性 "), null);
  assert.deepEqual(canvasVideoStoryboardShots(effective), effective);
});

test("manual editing guides empty, mismatched, invalid and oversized shots before applying", () => {
  assert.match(canvasVideoStoryboardProblem([], 5), /1–6/);
  assert.match(canvasVideoStoryboardProblem([{ seconds: 5, text: "" }], 5), /描述/);
  assert.match(canvasVideoStoryboardProblem([{ seconds: 4, text: "动作" }], 5), /合计/);
  assert.match(canvasVideoStoryboardProblem([{ seconds: 1.5, text: "动作" }], 5), /整数/);
  assert.match(canvasVideoStoryboardProblem([{ seconds: 5, text: "x".repeat(512) }], 5, "连接文本"), /包括连接文本/);
  assert.match(canvasVideoStoryboardProblem(Array.from({ length: 6 }, () => ({ seconds: 1, text: "x".repeat(512) })), 6), /总描述/);
  assert.equal(canvasVideoStoryboardProblem([{ seconds: 5, text: "" }], 5, "只使用连接描述"), null);
});

test("edited scenes use the existing single-video multi-shot API and preserve their order and seconds", () => {
  const { materials, roles, ...draft } = defaultVideoGenerationDraft();
  const shots = canvasVideoStoryboardShots([{ seconds: 2, text: "人物抬头" }, { seconds: 3, text: "镜头拉远" }], "白色上衣");
  const input = validateVideoGeneration({ ...draft, requestId: "00000000-0000-4000-8000-000000000001",
    projectId: "00000000-0000-4000-8000-000000000002", multiShot: true, prompt: "", shots, media: [] });
  const body = videoProviderBody(input, []);
  assert.equal(body.settings.multi_shot, true);
  assert.equal(body.settings.duration, 5);
  assert.equal(body.contents.length, 1);
  assert.equal(body.contents[0].text, "shot 1, 2s, 白色上衣\n\n人物抬头; shot 2, 3s, 镜头拉远");
});
