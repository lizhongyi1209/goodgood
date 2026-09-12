import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  O1KEY_SEEDANCE_ROUTES,
  SeedanceProviderError,
  buildO1KeySeedanceAssetPayload,
  buildO1KeySeedanceVideoPayload,
  createO1KeySeedanceClient,
  resolveO1KeySeedanceRoute,
} from "../server/video/o1key-seedance-adapter.mjs";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const EXPECTED_MODELS = Object.freeze({
  standard: Object.freeze({
    "seedance-2-5": "doubao-seedance-2-5-260628-max",
    "seedance-2-0": "doubao-seedance-2-0-260128-max",
    "seedance-2-0-fast": "doubao-seedance-2-0-fast-260128-max",
    "seedance-2-0-mini": "doubao-seedance-2-0-mini-260615-max",
  }),
  backup: Object.freeze({
    "seedance-2-5": "dreamina-seedance-2-5-hc",
    "seedance-2-0": "dreamina-seedance-2-0-hc",
    "seedance-2-0-fast": "dreamina-seedance-2-0-fast-hc",
    "seedance-2-0-mini": "dreamina-seedance-2-0-mini-hc",
  }),
});

test("GG-035 adds a standard-default video line without changing Seedance 2.5 capabilities", async () => {
  const [options, composer, page] = await Promise.all([
    read("features/creation/video-generation-options.ts"),
    read("features/creation/video-creation-composer.tsx"),
    read("app/page.tsx"),
  ]);

  assert.match(options, /DEFAULT_VIDEO_PROVIDER_LINE: VideoProviderLine = "standard"/);
  assert.match(options, /\{ id: "standard", label: "标准" \}/);
  assert.match(options, /\{ id: "backup", label: "备用" \}/);
  assert.match(
    options,
    /id: "seedance-2-5"[\s\S]*duration: Object\.freeze\(\{ min: 4, max: 30 \}\)[\s\S]*imageLimit: 30[\s\S]*videoLimit: 10[\s\S]*audioLimit: 10[\s\S]*totalLimit: 50/,
  );
  assert.match(composer, /<label>线路<\/label>/);
  assert.match(composer, /aria-label="视频生成线路"/);
  assert.match(composer, /onProviderLineChange\(option\.id\)/);
  assert.match(page, /useState<VideoProviderLine>\(DEFAULT_VIDEO_PROVIDER_LINE\)/);
  assert.match(page, /providerLine=\{videoProviderLine\}/);
  assert.match(page, /onProviderLineChange=\{setVideoProviderLine\}/);
});

test("GG-035 maps standard to Doubao and backup to HC for every product model", () => {
  assert.equal(O1KEY_SEEDANCE_ROUTES.standard.providerType, "doubao");
  assert.equal(O1KEY_SEEDANCE_ROUTES.backup.providerType, "hc");

  for (const [line, models] of Object.entries(EXPECTED_MODELS)) {
    for (const [modelId, providerModel] of Object.entries(models)) {
      assert.deepEqual(resolveO1KeySeedanceRoute({ line, modelId }), {
        line,
        modelId,
        providerModel,
        providerType: line === "standard" ? "doubao" : "hc",
        routeVersion: `o1key-${line === "standard" ? "doubao" : "hc"}-${modelId}-v1`,
      });
    }
  }
});

test("GG-035 builds exact Doubao and HC material payloads", () => {
  assert.deepEqual(
    buildO1KeySeedanceAssetPayload({
      assetType: "video",
      line: "standard",
      modelId: "seedance-2-5",
      name: " 角色视频 ",
      url: "https://assets.goodgood.invalid/reference.mp4",
    }),
    {
      type: "doubao",
      url: "https://assets.goodgood.invalid/reference.mp4",
      name: "角色视频",
      asset_type: "video",
      model: "doubao-seedance-2-5-260628-max",
    },
  );

  assert.deepEqual(
    buildO1KeySeedanceAssetPayload({
      assetType: "audio",
      line: "backup",
      modelId: "seedance-2-0-mini",
      url: "https://assets.goodgood.invalid/reference.mp3",
    }),
    {
      type: "hc",
      url: "https://assets.goodgood.invalid/reference.mp3",
      asset_type: "audio",
    },
  );
});

test("GG-035 converts current video modes and parameters to O1Key content", () => {
  const textOnly = buildO1KeySeedanceVideoPayload({
    duration: 30,
    generateAudio: true,
    generationMode: "multimodal",
    line: "standard",
    modelId: "seedance-2-5",
    prompt: " 长镜头穿过森林 ",
    ratio: "adaptive",
    references: [],
    resolution: "720p",
  });
  assert.deepEqual(textOnly, {
    model: "doubao-seedance-2-5-260628-max",
    content: [{ type: "text", text: "长镜头穿过森林" }],
    duration: 30,
    resolution: "720p",
    ratio: "adaptive",
    generate_audio: true,
  });

  const multimodal = buildO1KeySeedanceVideoPayload({
    duration: 5,
    generateAudio: false,
    generationMode: "multimodal",
    line: "backup",
    modelId: "seedance-2-0",
    prompt: "人物转身看向镜头",
    ratio: "16:9",
    references: [
      {
        mediaType: "image",
        role: "reference_image",
        url: "asset://image-1",
      },
      {
        mediaType: "video",
        role: "reference_video",
        url: "https://assets.goodgood.invalid/reference.mp4",
      },
      {
        mediaType: "audio",
        role: "reference_audio",
        url: "asset://audio-1",
      },
    ],
    resolution: "4K",
  });
  assert.deepEqual(multimodal, {
    model: "dreamina-seedance-2-0-hc",
    content: [
      { type: "text", text: "人物转身看向镜头" },
      {
        type: "image_url",
        image_url: { url: "asset://image-1" },
        role: "reference_image",
      },
      {
        type: "video_url",
        video_url: { url: "https://assets.goodgood.invalid/reference.mp4" },
        role: "reference_video",
      },
      {
        type: "audio_url",
        audio_url: { url: "asset://audio-1" },
        role: "reference_audio",
      },
    ],
    duration: 5,
    resolution: "4k",
    ratio: "16:9",
    generate_audio: false,
  });

  const frames = buildO1KeySeedanceVideoPayload({
    duration: 4,
    generateAudio: false,
    generationMode: "first_last_frame",
    line: "standard",
    modelId: "seedance-2-0-mini",
    prompt: "从白天过渡到夜晚",
    ratio: "9:16",
    references: [
      {
        mediaType: "image",
        role: "first_frame",
        url: "https://assets.goodgood.invalid/first.jpg",
      },
      {
        mediaType: "image",
        role: "last_frame",
        url: "https://assets.goodgood.invalid/last.jpg",
      },
    ],
    resolution: "480p",
  });
  assert.equal(frames.content[1].role, "first_frame");
  assert.equal(frames.content[2].role, "last_frame");
});

test("GG-035 calls the four documented O1Key endpoints with exact methods", async () => {
  const requests = [];
  const responses = [
    {
      success: true,
      data: {
        Id: "mva-123",
        Ref: "asset://mva-123",
        Status: "Processing",
        AssetType: "Image",
        Error: null,
      },
    },
    {
      success: true,
      data: {
        Id: "mva-123",
        Ref: "asset://mva-123",
        Status: "Active",
        AssetType: "Image",
        Error: null,
      },
    },
    {
      id: "task-123",
      task_id: "task-123",
      object: "video",
      model: "doubao-seedance-2-5-260628-max",
      status: "queued",
      progress: 0,
    },
    {
      id: "task-123",
      task_id: "task-123",
      object: "video",
      status: "completed",
      progress: 100,
      result_url: "https://cdn.goodgood.invalid/result.mp4",
    },
  ];
  const client = createO1KeySeedanceClient({
    allowInsecureLoopback: true,
    apiKey: "test-token",
    baseUrl: "http://127.0.0.1:9999/",
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return Response.json(responses.shift(), { status: 200 });
    },
  });

  await client.createAsset({
    assetType: "image",
    line: "standard",
    modelId: "seedance-2-5",
    url: "https://assets.goodgood.invalid/reference.png",
  });
  await client.getAsset({ assetId: "mva-123", line: "standard", modelId: "seedance-2-5" });
  await client.createVideo({
    duration: 5,
    generateAudio: false,
    generationMode: "multimodal",
    line: "standard",
    modelId: "seedance-2-5",
    prompt: "测试视频",
    ratio: "16:9",
    references: [],
    resolution: "720p",
  });
  await client.getVideo({ taskId: "task-123" });

  assert.deepEqual(
    requests.map(({ url, options }) => [url, options.method]),
    [
      ["http://127.0.0.1:9999/v1/seedance/assets", "POST"],
      ["http://127.0.0.1:9999/v1/seedance/assets/mva-123?type=doubao", "GET"],
      ["http://127.0.0.1:9999/v1/video/generations", "POST"],
      ["http://127.0.0.1:9999/v1/video/generations/task-123", "GET"],
    ],
  );
  assert.ok(requests.every(({ options }) => options.headers.authorization === "Bearer test-token"));
  assert.equal(
    JSON.parse(requests[2].options.body).model,
    "doubao-seedance-2-5-260628-max",
  );
});

test("GG-035 rejects incompatible roles and insecure HC references before transport", () => {
  assert.throws(
    () => buildO1KeySeedanceVideoPayload({
      duration: 5,
      generateAudio: true,
      generationMode: "multimodal",
      line: "standard",
      modelId: "seedance-2-5",
      prompt: "只有声音",
      ratio: "1:1",
      references: [{ mediaType: "audio", role: "reference_audio", url: "asset://audio" }],
      resolution: "720p",
    }),
    (error) => error instanceof SeedanceProviderError && error.code === "INVALID_VIDEO_REQUEST",
  );
  assert.throws(
    () => buildO1KeySeedanceAssetPayload({
      line: "backup",
      modelId: "seedance-2-0",
      url: "http://assets.goodgood.invalid/reference.png",
    }),
    /HC references must use HTTPS/,
  );
});

test("GG-035 real smoke requires explicit execution and a file-only credential", async () => {
  const [script, packageJson] = await Promise.all([
    read("scripts/run-seedance-provider-smoke.mjs"),
    read("package.json"),
  ]);
  assert.match(script, /argumentsList\.includes\("--execute"\)/);
  assert.match(script, /argumentValue\(argumentsList, "--key-file"\)/);
  assert.doesNotMatch(script, /--api-key/);
  assert.doesNotMatch(script, /console\.log\([^\n]*apiKey/);
  assert.match(script, /line: "standard"/);
  assert.match(script, /modelId: "seedance-2-5"/);
  assert.match(script, /duration: 4/);
  assert.match(script, /resolution: "480p"/);
  assert.match(packageJson, /"video:provider-smoke": "node scripts\/run-seedance-provider-smoke\.mjs"/);
});
