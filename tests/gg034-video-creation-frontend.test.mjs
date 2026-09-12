import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

test("GG-034 keeps image and video as explicit composer modes", async () => {
  const [modeSwitch, imageComposer, page] = await Promise.all([
    read("features/creation/creation-mode-switch.tsx"),
    read("features/creation/creation-composer.tsx"),
    read("app/page.tsx"),
  ]);

  assert.match(modeSwitch, /role="tablist" aria-label="创作类型"/);
  assert.match(modeSwitch, />\s*图片\s*</);
  assert.match(modeSwitch, />\s*视频\s*</);
  assert.match(imageComposer, /<CreationModeSwitch value=\{mode\} onChange=\{onModeChange\}/);
  assert.match(page, /creationMode === "image"/);
  assert.match(page, /<VideoCreationComposer/);
  assert.match(page, /const \[videoPrompt, setVideoPrompt\] = useState\(""\)/);
  assert.match(page, /const \[videoReferences, setVideoReferences\] = useState<VideoReference\[]>\(\[\]\)/);
  assert.match(page, /useState<VideoGenerationMode>\(DEFAULT_VIDEO_GENERATION_MODE\)/);
});

test("GG-034 exposes the accepted Seedance catalog and model constraints", async () => {
  const options = await read("features/creation/video-generation-options.ts");
  const modelOrder = [
    'id: "seedance-2-5"',
    'id: "seedance-2-0"',
    'id: "seedance-2-0-fast"',
    'id: "seedance-2-0-mini"',
  ].map((token) => options.indexOf(token));

  assert.ok(modelOrder.every((index) => index >= 0));
  assert.deepEqual([...modelOrder].sort((left, right) => left - right), modelOrder);
  assert.match(options, /id: "seedance-2-5"[\s\S]*max: 30[\s\S]*resolutions: \["480p", "720p"\]/);
  assert.match(options, /id: "seedance-2-0"[\s\S]*capabilities: STANDARD_CAPABILITIES/);
  assert.match(options, /STANDARD_CAPABILITIES[\s\S]*max: 15[\s\S]*\["480p", "720p", "1080p", "4K"\]/);
  assert.match(options, /VIDEO_ASPECT_RATIOS = \[[\s\S]*"adaptive"[\s\S]*"21:9"/);
  assert.match(options, /DEFAULT_VIDEO_GENERATION_MODE: VideoGenerationMode = "multimodal"/);
  assert.match(options, /id: "multimodal"[\s\S]*label: "多模态"/);
  assert.match(options, /id: "first_last_frame"[\s\S]*label: "首尾帧"[\s\S]*最多两张图片/);
  assert.match(options, /first_last_frame[\s\S]*imageLimit: 2, videoLimit: 0, audioLimit: 0, totalLimit: 2/);
});

test("GG-034 video composer exposes creator parameters and multimedia references", async () => {
  const composer = await read("features/creation/video-creation-composer.tsx");

  for (const label of ["画面比例", "生成模型", "清晰度", "时长", "声音"]) {
    assert.match(composer, new RegExp(label));
  }
  assert.match(composer, /上传图片/);
  assert.match(composer, /从资产库选择/);
  assert.match(composer, /onOpenReferenceLibrary/);
  assert.match(composer, /上传视频/);
  assert.match(composer, /上传音频/);
  assert.match(composer, /生成模式/);
  assert.match(composer, /VIDEO_GENERATION_MODE_OPTIONS\.map/);
  assert.match(composer, /aria-label="视频生成模式"/);
  assert.match(composer, /referenceCounts\.image.*referenceLimits\.imageLimit/);
  assert.match(composer, /`图片 \$\{ordinal\}`/);
  assert.match(composer, /generationMode === "first_last_frame"[\s\S]*videoReferenceRoleLabel\(reference\.role\)[\s\S]*mediaLabel\.replace\(" ", ""\)/);
  assert.doesNotMatch(composer, /设置\$\{mediaLabel\}用途/);
  assert.doesNotMatch(composer, /className="video-reference-role/);
  assert.match(composer, /接口待接入/);
  assert.doesNotMatch(composer, /生成数量/);
});

test("GG-034 reuses image, video, and audio assets without uploading them again", async () => {
  const [page, selection] = await Promise.all([
    read("app/page.tsx"),
    read("features/creation/video-asset-selection.ts"),
  ]);

  assert.match(page, /onOpenReferenceLibrary=\{\(\) => openReferenceLibrary\("video"\)\}/);
  assert.match(page, /筛选资产类型/);
  assert.match(page, /多模态模式可复用图片、视频和音频/);
  assert.match(selection, /"all" \| VideoReferenceMediaType/);
  assert.match(selection, /id: material\.id/);
  assert.match(selection, /mediaType: material\.mediaType/);
  assert.match(selection, /material\.mediaType === "video"[\s\S]*"reference_video"/);
  assert.match(selection, /material\.mediaType === "audio"[\s\S]*"reference_audio"/);
  assert.match(selection, /videoReferenceCapacityError/);
  assert.doesNotMatch(selection, /uploadReferenceFiles|URL\.createObjectURL/);
});

test("GG-034 never routes the preview video action through image generation", async () => {
  const page = await read("app/page.tsx");
  const start = page.indexOf("const handleVideoGenerate = () =>");
  const end = page.indexOf("const handleReferenceFiles", start);
  const handler = page.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.match(handler, /视频生成接口尚未接入/);
  assert.doesNotMatch(handler, /generationBoundary|\/api\/generations|runGeneration/);
});

test("GG-034 styles the attached mode control and responsive video drawer", async () => {
  const css = await read("app/globals.css");

  assert.match(css, /\.creation-mode-row\s*\{/);
  assert.match(css, /\.creation-mode-switch button\.selected\s*\{/);
  assert.match(css, /\.video-ratio-options\s*\{/);
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*\.video-ratio-options\s*\{[^}]*grid-template-columns:\s*repeat\(3/);
});

test("GG-034 records the accepted frontend-only boundary", async () => {
  const [adr, task, backlog] = await Promise.all([
    read("docs/decisions/0048-add-image-video-creation-modes.md"),
    read("docs/tasks/GG-034-video-creation-frontend.md"),
    read("docs/BACKLOG.md"),
  ]);

  assert.match(adr, /Status: Accepted/);
  assert.match(adr, /Do not submit video mode to `\/api\/generations`/);
  assert.match(task, /不修改后端 API、数据库、计费、provider/);
  assert.match(backlog, /GG-034/);
});
