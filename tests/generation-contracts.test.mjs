import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";
import {
  GENERATION_MODEL_CAPABILITIES,
  GPT_IMAGE_2_PIXEL_SIZES,
  SUPPORTED_GENERATION_ASPECT_RATIOS,
  SUPPORTED_GENERATION_RESOLUTIONS,
} from "../server/generation/capabilities.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true, hmr: false, ws: false },
});

after(async () => {
  await vite.close();
});

async function createSnapshot(prompt = "银灰色未来服装") {
  const { createGenerationInputSnapshot } = await vite.ssrLoadModule(
    "/features/creation/generation-snapshot.ts",
  );
  return createGenerationInputSnapshot({
    prompt,
    references: [],
    modelId: "nano-banana-2",
    aspectRatio: "4:5",
    resolution: "2K",
    count: 2,
  });
}

test("maps stable model IDs to fixed presentation copy", async () => {
  const {
    DEFAULT_GENERATION_MODEL_ID,
    GENERATION_MODEL_CATALOG,
    findGenerationModelByName,
    getGenerationModel,
  } = await vite.ssrLoadModule("/features/models/catalog.ts");

  assert.equal(DEFAULT_GENERATION_MODEL_ID, "nano-banana-2");
  assert.deepEqual(
    GENERATION_MODEL_CATALOG.map(({ id, name, description }) => ({
      id,
      name,
      description,
    })),
    [
      { id: "nano-banana-2", name: "Nano Banana 2", description: "快速，批量" },
      { id: "nano-banana-pro", name: "Nano Banana Pro", description: "高质量资产，视觉优先" },
      { id: "gpt-image-2", name: "GPT IMAGE 2", description: "高真实感，提示词遵循" },
    ],
  );
  assert.equal(findGenerationModelByName("Nano Banana Pro")?.id, "nano-banana-pro");
  assert.throws(
    () => getGenerationModel("provider-model-name"),
    /Unknown GoodGood model/,
  );
});

test("maps ratios and resolution labels without persisting UI indices", async () => {
  const {
    GENERATION_ASPECT_RATIOS,
    GENERATION_RESOLUTIONS,
  } = await vite.ssrLoadModule("/shared/contracts/generation.ts");
  const {
    DEFAULT_GENERATION_RATIO_BY_MODE,
    GPT_IMAGE_2_DIMENSIONS,
    GPT_IMAGE_2_RATIO_IDS,
    GENERATION_RATIO_OPTIONS,
    findGenerationRatioByLabel,
    formatGenerationResolution,
    formatPixelDimensions,
    getSharedPixelDimensions,
    getDefaultGenerationRatioForModelMode,
    getGenerationPixelDimensions,
    getGenerationRatio,
    getGenerationRatioIndex,
    getGenerationRatioOptions,
    getGenerationCountOptions,
    getGenerationResolutionLabel,
    resolveGenerationAspectRatioForModel,
    resolveGenerationCountForModel,
    resolveGenerationThinkingLevelForModel,
    resolveGoogleSearchForModel,
  } = await vite.ssrLoadModule(
    "/features/creation/generation-options.ts",
  );

  assert.equal(GENERATION_RATIO_OPTIONS.length, 14);
  assert.deepEqual(
    [...GENERATION_ASPECT_RATIOS],
    [...SUPPORTED_GENERATION_ASPECT_RATIOS],
  );
  assert.deepEqual(
    [...GENERATION_RESOLUTIONS],
    [...SUPPORTED_GENERATION_RESOLUTIONS],
  );
  assert.deepEqual(
    GENERATION_RATIO_OPTIONS.map((option) => option.id),
    ["1:8", "1:4", "9:16", "2:3", "3:4", "4:5", "1:1", "5:4", "4:3", "3:2", "16:9", "21:9", "4:1", "8:1"],
  );
  for (const option of GENERATION_RATIO_OPTIONS) {
    assert.equal(option.dimensions["2K"].width, option.dimensions["1K"].width * 2);
    assert.equal(option.dimensions["2K"].height, option.dimensions["1K"].height * 2);
    assert.equal(option.dimensions["4K"].width, option.dimensions["1K"].width * 4);
    assert.equal(option.dimensions["4K"].height, option.dimensions["1K"].height * 4);
  }
  assert.equal(DEFAULT_GENERATION_RATIO_BY_MODE.portrait, "4:5");
  assert.equal(DEFAULT_GENERATION_RATIO_BY_MODE.square, "1:1");
  assert.equal(DEFAULT_GENERATION_RATIO_BY_MODE.landscape, "16:9");

  const portrait = getGenerationRatio("4:5");
  assert.equal(portrait.mode, "portrait");
  assert.equal(portrait.value, 4 / 5);
  assert.deepEqual(portrait.dimensions["2K"], { width: 1856, height: 2304 });
  assert.equal(formatPixelDimensions(portrait.dimensions["2K"]), "1856 × 2304");
  assert.equal(getGenerationRatioIndex("4:5"), 5);
  assert.equal(findGenerationRatioByLabel("16 : 9")?.id, "16:9");
  assert.equal(getGenerationResolutionLabel("1K"), "1K");
  assert.equal(getGenerationResolutionLabel("2K"), "2K");
  assert.equal(getGenerationResolutionLabel("4K"), "4K");
  assert.equal(
    formatGenerationResolution("4K", { width: 3584, height: 4800 }),
    "4K · 3584 × 4800",
  );
  assert.equal(formatGenerationResolution("2K"), "2K");
  assert.deepEqual(
    getSharedPixelDimensions([
      { width: 3584, height: 4800 },
      { width: 3584, height: 4800 },
    ]),
    { width: 3584, height: 4800 },
  );
  assert.equal(
    getSharedPixelDimensions([
      { width: 3584, height: 4800 },
      { width: 3072, height: 4096 },
    ]),
    undefined,
  );
  assert.deepEqual(
    getGenerationRatioOptions("gpt-image-2").map((option) => option.id),
    [...GPT_IMAGE_2_RATIO_IDS],
  );
  assert.deepEqual(getGenerationCountOptions("nano-banana-2"), [1, 2, 4]);
  assert.deepEqual(getGenerationCountOptions("gpt-image-2"), [1, 2, 4]);
  assert.equal(resolveGenerationCountForModel("nano-banana-2", 4), 4);
  assert.equal(resolveGenerationCountForModel("gpt-image-2", 4), 4);
  assert.equal(resolveGenerationThinkingLevelForModel("nano-banana-2", "high"), "high");
  assert.equal(resolveGenerationThinkingLevelForModel("gpt-image-2", "high"), "low");
  assert.equal(resolveGoogleSearchForModel("nano-banana-2", true), true);
  assert.equal(resolveGoogleSearchForModel("gpt-image-2", true), false);
  assert.deepEqual(
    [...GPT_IMAGE_2_RATIO_IDS],
    [...GENERATION_MODEL_CAPABILITIES["gpt-image-2"].aspectRatios],
  );
  for (const ratio of GPT_IMAGE_2_RATIO_IDS) {
    for (const resolution of GENERATION_RESOLUTIONS) {
      const dimensions = GPT_IMAGE_2_DIMENSIONS[ratio][resolution];
      assert.equal(
        `${dimensions.width}x${dimensions.height}`,
        GPT_IMAGE_2_PIXEL_SIZES[ratio][resolution],
      );
    }
  }
  assert.deepEqual(GPT_IMAGE_2_DIMENSIONS["3:4"]["4K"], {
    width: 2448,
    height: 3264,
  });
  assert.deepEqual(
    getGenerationPixelDimensions("gpt-image-2", "16:9", "2K"),
    { width: 3648, height: 2048 },
  );
  assert.equal(
    resolveGenerationAspectRatioForModel("gpt-image-2", "4:5"),
    "3:4",
  );
  assert.equal(
    resolveGenerationAspectRatioForModel("gpt-image-2", "21:9"),
    "16:9",
  );
  assert.equal(
    getDefaultGenerationRatioForModelMode("gpt-image-2", "portrait"),
    "3:4",
  );
  assert.throws(
    () => getGenerationPixelDimensions("gpt-image-2", "4:5", "1K"),
    /Unsupported generation ratio/,
  );
});

test("enforces auditable job transitions and terminal states", async () => {
  const {
    canTransitionGenerationJob,
    isGenerationJobActive,
    toGenerationUiStage,
    transitionGenerationJob,
  } = await vite.ssrLoadModule("/features/creation/generation-job.ts");
  const snapshot = await createSnapshot();
  const queued = Object.freeze({
    id: "GG-unit-job",
    input: snapshot,
    state: "queued",
    outputs: Object.freeze([]),
    error: null,
    createdAt: "2026-08-30T00:00:00.000Z",
    updatedAt: "2026-08-30T00:00:00.000Z",
  });

  assert.equal(canTransitionGenerationJob("queued", "running"), true);
  assert.equal(canTransitionGenerationJob("queued", "succeeded"), false);
  assert.equal(isGenerationJobActive("refining"), true);
  assert.equal(isGenerationJobActive("failed"), false);
  assert.equal(toGenerationUiStage(null), "idle");
  assert.equal(toGenerationUiStage("running"), "rendering");
  assert.equal(toGenerationUiStage("succeeded"), "complete");

  const running = transitionGenerationJob(
    queued,
    "running",
    "2026-08-30T00:00:01.000Z",
  );
  const succeeded = transitionGenerationJob(
    running,
    "succeeded",
    "2026-08-30T00:00:02.000Z",
    { outputs: [{ id: "asset-1", previewUrl: "/asset.png", previewPosition: "50% 50%" }] },
  );

  assert.equal(succeeded.state, "succeeded");
  assert.ok(Object.isFrozen(succeeded));
  assert.ok(Object.isFrozen(succeeded.outputs));
  assert.throws(
    () => transitionGenerationJob(succeeded, "running", "2026-08-30T00:00:03.000Z"),
    /Invalid generation job transition/,
  );
});

test("tracks unlimited parallel client runs without cross-run replacement", async () => {
  const {
    getActiveGenerationRuns,
    getFailedGenerationRuns,
    getGenerationRunSlots,
    getPersistentGenerationJobIds,
    getSucceededGenerationJobIds,
    removeGenerationRun,
    upsertGenerationRun,
  } = await vite.ssrLoadModule("/features/creation/generation-runs.ts");
  const snapshot = await createSnapshot();
  const timestamp = "2026-09-08T00:00:00.000Z";
  const createJob = (id, state = "queued", error = null, outputs = []) => Object.freeze({
    createdAt: timestamp,
    error,
    id,
    input: snapshot,
    outputs: Object.freeze(outputs),
    state,
    updatedAt: timestamp,
  });

  assert.deepEqual(getActiveGenerationRuns([]), []);
  assert.deepEqual(getFailedGenerationRuns([]), []);
  let runs = [];
  for (let index = 0; index < 25; index += 1) {
    runs = upsertGenerationRun(
      runs,
      `run-${index}`,
      createJob(`pending_${index}`),
    );
  }
  assert.equal(runs.length, 25);
  assert.equal(getActiveGenerationRuns(runs).length, 25);
  assert.equal(runs[0].key, "run-24");

  const firstPosition = runs.findIndex((run) => run.key === "run-0");
  const firstSlotKey = getGenerationRunSlots(runs)
    .find((slot) => slot.runKey === "run-0").key;
  runs = upsertGenerationRun(runs, "run-0", createJob("job-0", "running"));
  assert.equal(runs.findIndex((run) => run.key === "run-0"), firstPosition);
  assert.equal(runs[firstPosition].job.id, "job-0");
  assert.equal(runs.length, 25);
  assert.equal(
    getGenerationRunSlots(runs).find((slot) => slot.runKey === "run-0").key,
    firstSlotKey,
  );

  const failure = Object.freeze({
    code: "MODEL_REJECTED",
    message: "请调整提示词后重试。",
    retryable: true,
    title: "本次生成未完成",
  });
  runs = upsertGenerationRun(runs, "run-1", createJob("job-1", "failed", failure));
  assert.equal(getActiveGenerationRuns(runs).length, 24);
  assert.deepEqual(getFailedGenerationRuns(runs).map((run) => run.key), ["run-1"]);
  assert.equal(getGenerationRunSlots(runs).some((slot) => slot.runKey === "run-1"), false);
  assert.deepEqual(getPersistentGenerationJobIds(runs).sort(), ["job-0", "job-1"]);

  const output = Object.freeze({
    height: 1200,
    id: "asset-0",
    previewPosition: "50% 50%",
    previewUrl: "/asset-0.png",
    width: 896,
  });
  const secondOutput = Object.freeze({ ...output, id: "asset-1", previewUrl: "/asset-1.png" });
  runs = upsertGenerationRun(
    runs,
    "run-0",
    createJob("job-0", "succeeded", null, [output, secondOutput]),
  );
  const completedSlots = getGenerationRunSlots(runs)
    .filter((slot) => slot.runKey === "run-0");
  assert.deepEqual(completedSlots.map((slot) => slot.key), [
    firstSlotKey,
    "generation-slot-run-0-1",
  ]);
  assert.deepEqual(completedSlots.map((slot) => slot.output), [output, secondOutput]);
  assert.deepEqual(getSucceededGenerationJobIds(runs), ["job-0"]);
  runs = removeGenerationRun(runs, "run-0");
  assert.equal(runs.length, 24);
  assert.equal(runs.some((run) => run.key === "run-1"), true);
});

test("runs successful mock jobs through repository and provider boundaries", async () => {
  const { createMockGenerationBoundary } = await vite.ssrLoadModule(
    "/features/creation/mock-generation-boundary.ts",
  );
  const states = [];
  const boundary = createMockGenerationBoundary({
    wait: async () => {},
    createJobId: () => "GG-success",
    now: () => new Date("2026-08-30T00:00:00.000Z"),
  });

  assert.equal(await boundary.repository.findById("missing"), null);
  const completed = await boundary.service.submit(
    await createSnapshot(),
    (job) => states.push(job.state),
  );

  assert.deepEqual(states, ["queued", "running", "refining", "succeeded"]);
  assert.equal(completed.outputs.length, 2);
  assert.equal(completed.error, null);
  assert.equal((await boundary.repository.findById("GG-success"))?.state, "succeeded");
});

test("normalizes mock failure and retries the preserved snapshot", async () => {
  const { createMockGenerationBoundary } = await vite.ssrLoadModule(
    "/features/creation/mock-generation-boundary.ts",
  );
  let jobNumber = 0;
  const boundary = createMockGenerationBoundary({
    wait: async () => {},
    createJobId: () => `GG-retry-${++jobNumber}`,
    now: () => new Date("2026-08-30T00:00:00.000Z"),
  });
  const snapshot = await createSnapshot("模拟 error");
  const firstStates = [];
  const failed = await boundary.service.submit(
    snapshot,
    (job) => firstStates.push(job.state),
  );

  assert.deepEqual(firstStates, ["queued", "running", "failed"]);
  assert.equal(failed.error?.code, "MODEL_TIMEOUT");
  assert.equal(failed.error?.retryable, true);
  assert.equal(failed.input, snapshot);

  const retryStates = [];
  const retried = await boundary.service.submit(
    failed.input,
    (job) => retryStates.push(job.state),
  );
  assert.deepEqual(retryStates, ["queued", "running", "refining", "succeeded"]);
  assert.equal(retried.outputs.length, 2);
  assert.equal((await boundary.repository.findById(failed.id))?.state, "failed");
});
