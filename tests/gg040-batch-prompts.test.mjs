import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import { build } from "esbuild";
import { parsePromptBatch, promptBatchOutputCount, promptContextForRetry } from "../shared/contracts/prompt-batch.mjs";
import { validateM3GenerationInput } from "../server/generation/api.mjs";
import { hashGenerationInput } from "../server/generation/repository.mjs";

async function compile(file) {
  const result = await build({ entryPoints: [file], bundle: true, write: false, platform: "node", format: "cjs", packages: "external" });
  const compiled = { exports: {} };
  new Function("require", "module", "exports", result.outputFiles[0].text)(createRequire(import.meta.url), compiled, compiled.exports);
  return compiled.exports;
}
const { createImagePromptBatch, createImagePromptRuns, createVideoPromptBatch, submitPromptBatch } = await compile("features/creation/prompt-batch.ts");
const { submitVideoPreviewRuns, updateVideoPreviewRun } = await compile("features/creation/video-preview-runs.ts");
const { upsertGenerationRun, getGenerationRunSlots } = await compile("features/creation/generation-runs.ts");
const source = "提示词A\n---\n提示词B";
const imageInput = { prompt: source, count: 4, modelId: "gpt-image-2", aspectRatio: "1:1", resolution: "1K", references: [], quality: "high", background: "transparent", outputFormat: "png" };
const videoInput = { prompt: source, generationMode: "multimodal", modelId: "seedance-2-5", line: "standard", ratio: "16:9", resolution: "720p", duration: 5, generateAudio: true, references: [] };

test("GG-040 exact standalone delimiters preserve multiline prompts, duplicates and order", () => {
  assert.deepEqual(parsePromptBatch(" A\r\n \t--- \r\nB\n---\nB ").prompts, ["A", "B", "B"]);
  for (const prompt of ["A---B", "A\n----\nB", "A\n--- B", "A\n—\nB"]) {
    assert.equal(parsePromptBatch(prompt).hasSeparator, false);
    assert.deepEqual(parsePromptBatch(prompt).prompts, [prompt]);
  }
  assert.deepEqual(parsePromptBatch("\n---\nA\n\nline 2\n---\n---\n B\n---\n").prompts, ["A\n\nline 2", "B"]);
  assert.deepEqual(parsePromptBatch("---\n---\n ").prompts, []);
  assert.equal(promptBatchOutputCount(source, 4), 8);
});

test("GG-040 image fan-out retains per-prompt counts and freezes shared options/references", () => {
  for (const count of [1, 2, 4]) {
    const reference = { id: "20000000-0000-4000-8000-000000000001", name: "ref", url: "blob:stub", status: "ready" };
    const draft = { ...imageInput, count, references: [reference] };
    const snapshots = createImagePromptBatch(draft);
    draft.prompt = "changed"; reference.name = "changed";
    assert.deepEqual(snapshots.map((input) => input.prompt), ["提示词A", "提示词B"]);
    assert.equal(snapshots.reduce((total, input) => total + input.count, 0), 2 * count);
    assert.ok(snapshots.every((input) => Object.isFrozen(input) && Object.isFrozen(input.references[0])));
    assert.ok(snapshots.every((input) => input.references[0].name === "ref" && input.quality === "high" && input.background === "transparent" && input.outputFormat === "png"));
  }
  assert.throws(() => createImagePromptBatch({ ...imageInput, prompt: "---\n---" }), /请先输入/);
  assert.throws(() => createImagePromptBatch({ ...imageInput, prompt: "A".repeat(4001) }), /4000/);
  assert.equal(createImagePromptBatch({ ...imageInput, prompt: "plain prompt" }).length, 1);
});

test("GG-040 image segments start together with stable slots and isolated out-of-order failure", async () => {
  let ordinal = 0;
  const runs = createImagePromptRuns(createImagePromptBatch(imageInput), () => `run-${ordinal++}`, "2026-09-13T00:00:00Z");
  let tracked = [...runs];
  const keys = getGenerationRunSlots(tracked).map((slot) => slot.key);
  const releases = [];
  const pending = submitPromptBatch(runs, (run) => new Promise((resolve) => releases.push((state) => {
    const job = { ...run.job, id: `durable-${run.key}`, state, outputs: state === "succeeded" ? Array.from({ length: 4 }, (_, i) => ({ id: `output-${i}` })) : [], error: state === "failed" ? { code: "MODEL_REJECTED" } : null };
    tracked = upsertGenerationRun(tracked, run.key, job); resolve(job);
  })));
  assert.equal(releases.length, 2);
  assert.equal(keys.length, 8);
  releases[1]("succeeded"); releases[0]("failed"); await pending;
  assert.deepEqual(tracked.map((run) => run.key), runs.map((run) => run.key));
  assert.equal(tracked[0].job.input.prompt, "提示词A");
  assert.equal(tracked[1].job.input.prompt, "提示词B");
  assert.deepEqual(getGenerationRunSlots(tracked).map((slot) => slot.key), keys.slice(4));
  tracked = upsertGenerationRun(tracked, runs[1].key, { ...tracked[1].job, createdAt: "2026-09-13T00:00:01Z" });
  assert.ok(getGenerationRunSlots(tracked).every((slot) => slot.submittedAt === Date.parse("2026-09-13T00:00:00Z")));
  const started = [];
  const outcomes = await submitPromptBatch([1, 2], async (i) => { started.push(i); if (i === 1) throw new Error("stub failure"); });
  assert.deepEqual(started, [1, 2]);
  assert.deepEqual(outcomes.map((outcome) => outcome.status), ["rejected", "fulfilled"]);
});

test("GG-040 video prompt/count product creates independent concurrent outputs", async () => {
  for (const count of [1, 2, 4]) {
    const runs = createVideoPromptBatch(videoInput, count, "batch", 123);
    assert.equal(runs.length, count * 2);
    assert.equal(new Set(runs.map((run) => run.key)).size, runs.length);
    assert.deepEqual(runs.map((run) => run.input.prompt), [...Array(count).fill("提示词A"), ...Array(count).fill("提示词B")]);
    let tracked = [...runs];
    const releases = [];
    const pending = submitVideoPreviewRuns(runs, (run) => { tracked = updateVideoPreviewRun(tracked, run); }, async () => {
      const taskId = `task-${releases.length}`;
      return new Promise((resolve) => releases.push(() => resolve({ taskId, status: "completed", terminal: true, resultUrl: "/stub.mp4", error: null, progress: 100 })));
    });
    assert.equal(releases.length, count * 2);
    releases.reverse().forEach((release) => release()); await pending;
    assert.ok(tracked.every((run) => run.job.status === "completed" && run.input.line === "standard" && run.input.duration === 5));
    assert.deepEqual(tracked.map((run) => run.key), runs.map((run) => run.key));
  }
  assert.throws(() => createVideoPromptBatch({ ...videoInput, prompt: "---" }, 4, "empty"), /请先输入/);
});

test("GG-040 real HTTP boundary stub sends eight single-video POSTs and queries each ID", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const posts = []; const gets = [];
  globalThis.window = { setTimeout: (callback) => queueMicrotask(callback) };
  globalThis.fetch = async (url, options) => {
    if (options?.method === "POST") {
      const payload = JSON.parse(options.body); posts.push(payload);
      return Response.json({ taskId: `task-${posts.length}`, status: "queued", terminal: false, resultUrl: null, error: null, progress: 0 });
    }
    const taskId = new URL(url, "http://127.0.0.1").searchParams.get("taskId"); gets.push(taskId);
    return Response.json({ taskId, status: "completed", terminal: true, resultUrl: "/stub.mp4", error: null, progress: 100 });
  };
  try {
    await submitVideoPreviewRuns(createVideoPromptBatch(videoInput, 4, "http"), () => {});
    assert.equal(posts.length, 8); assert.equal(new Set(gets).size, 8);
    assert.deepEqual(posts.map((input) => input.prompt), [...Array(4).fill("提示词A"), ...Array(4).fill("提示词B")]);
    assert.ok(posts.every((input) => input.count === undefined && input.n === undefined && input.composerPrompt === undefined));
  } finally { globalThis.fetch = originalFetch; globalThis.window = originalWindow; }
});

test("GG-040 project context is validated separately from model prompt and hash-bound", async () => {
  const projectId = "20000000-0000-4000-8000-000000000002";
  const snapshots = createImagePromptBatch({ ...imageInput, projectId });
  assert.ok(snapshots.every((input) => input.composerPrompt === source));
  const input = validateM3GenerationInput(snapshots[0]);
  assert.equal(input.prompt, "提示词A"); assert.equal(input.composerPrompt, source);
  assert.throws(() => validateM3GenerationInput({ ...snapshots[0], composerPrompt: "unrelated" }), /不一致/);
  assert.throws(() => validateM3GenerationInput({ ...snapshots[0], projectId: null }), /不一致/);
  assert.throws(() => validateM3GenerationInput({ ...snapshots[0], composerPrompt: "A".repeat(4001) }), /不一致/);
  assert.notEqual(hashGenerationInput(input), hashGenerationInput({ ...input, composerPrompt: "提示词A\n---\nother" }));
  const repository = await readFile("server/generation/repository.mjs", "utf8");
  assert.match(repository, /input\.composerPrompt \?\? input\.prompt/);
  assert.match(repository, /const visiblePrompt=[^;]+:input\.prompt;/);
  assert.match(repository, /visiblePrompt,\s*JSON\.stringify\(references\)/);
  assert.equal(promptContextForRetry("提示词A", source), source);
  assert.equal(promptContextForRetry("unrelated", source), "unrelated");
  assert.match(repository, /promptContextForRetry\(input.prompt, project.rows\[0\].prompt/);
});

test("GG-040/GG-041 retain batch orchestration and quote without duplicate composer copy", async () => {
  for (const composer of ["creation-composer.tsx", "video-creation-composer.tsx"]) {
    const code = await readFile(`features/creation/${composer}`, "utf8");
    assert.doesNotMatch(code, /PromptBatchSummary|prompt-batch-summary|批量提示词/);
  }
  const page = await readFile("app/page.tsx", "utf8");
  assert.match(page, /createImagePromptBatch\(draft\)/);
  assert.match(page, /submitPromptBatch\(runs/);
  assert.match(page, /createVideoPromptBatch\(/);
  assert.match(page, /BigInt\(activeBillingQuote.creditAmount\) \* BigInt\(imageQuotedPromptCount\)/);
  assert.match(page, /prompt: composerInput.prompt/);
  assert.match(page, /createComposerCheckpoint\(generationComposerSnapshotsRef.current.get\(runKey\) \?\? job.input\)/);
});
