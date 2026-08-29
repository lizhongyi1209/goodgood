import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

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
    DEFAULT_GENERATION_RATIO_BY_MODE,
    GENERATION_RATIO_OPTIONS,
    findGenerationRatioByLabel,
    formatPixelDimensions,
    getGenerationRatio,
    getGenerationRatioIndex,
    getGenerationResolutionLabel,
  } = await vite.ssrLoadModule(
    "/features/creation/generation-options.ts",
  );

  assert.equal(GENERATION_RATIO_OPTIONS.length, 14);
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
  assert.equal(getGenerationResolutionLabel("1K"), "标准");
  assert.equal(getGenerationResolutionLabel("2K"), "高清");
  assert.equal(getGenerationResolutionLabel("4K"), "超清");
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
