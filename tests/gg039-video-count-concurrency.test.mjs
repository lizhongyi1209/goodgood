import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import { build } from "esbuild";

const result = await build({ entryPoints: ["features/creation/video-preview-runs.ts"], bundle: true, write: false, platform: "node", format: "cjs", packages: "external" });
const compiled = { exports: {} };
new Function("require", "module", "exports", result.outputFiles[0].text)(createRequire(import.meta.url), compiled, compiled.exports);
const { createVideoPreviewRuns, submitVideoPreviewRuns, resumeVideoPreviewRun, updateVideoPreviewRun, isVideoPreviewRunActive } = compiled.exports;
const input = { prompt: "test", generationMode: "multimodal", modelId: "seedance-2-5", line: "standard", ratio: "16:9", resolution: "720p", duration: 5, generateAudio: true, references: [] };
const job = (taskId, status = "queued") => ({ taskId, status, progress: 0, resultUrl: status === "completed" ? "/demo.mp4" : null, error: status === "failed" ? "rejected" : null, terminal: ["completed", "failed"].includes(status) });

test("GG-039 counts allocate immutable ordered slots without upstream count fields", () => {
  for (const count of [1, 2, 4]) {
    const draft = { ...input };
    const runs = createVideoPreviewRuns(draft, count, `batch-${count}`, 123);
    draft.prompt = "changed";
    assert.equal(runs.length, count);
    assert.equal(new Set(runs.map((run) => run.key)).size, count);
    assert.deepEqual(runs.map((run) => run.ordinal), Array.from({ length: count }, (_, i) => i));
    assert.equal(runs[0].input.prompt, "test");
    assert.ok(Object.isFrozen(runs[0].input));
    assert.ok(Object.isFrozen(runs[0].input.references));
    assert.equal(runs[0].input.count, undefined);
    assert.equal(runs[0].input.n, undefined);
  }
  assert.throws(() => createVideoPreviewRuns(input, 3, "bad"), /仅支持/);
});

test("GG-039 starts four requests concurrently and isolates out-of-order success/failure", async () => {
  const runs = createVideoPreviewRuns(input, 4, "batch");
  let tracked = [...runs];
  const releases = [];
  const pending = submitVideoPreviewRuns(runs, (update) => { tracked = updateVideoPreviewRun(tracked, update); }, async (snapshot, observe) => {
    assert.equal(snapshot, runs[0].input);
    const ordinal = releases.length;
    observe(job(`task-${ordinal}`));
    return new Promise((resolve, reject) => releases.push({ resolve, reject }));
  });
  assert.equal(releases.length, 4, "all POST paths start before any task completes");
  const newer = createVideoPreviewRuns({ ...input, prompt: "new batch" }, 2, "newer");
  tracked = [...newer, ...tracked];
  releases[3].resolve(job("task-3", "completed"));
  releases[1].reject(new Error("poll disconnected"));
  releases[0].resolve(job("task-0", "failed"));
  releases[2].resolve(job("task-2", "completed"));
  await pending;
  assert.deepEqual(tracked.map((run) => run.key), [...newer, ...runs].map((run) => run.key));
  assert.equal(tracked[3].job.taskId, "task-1");
  assert.equal(tracked[3].monitoringError, "poll disconnected");
  assert.equal(tracked[2].job.status, "failed");
  assert.equal(tracked[4].job.status, "completed");
  assert.equal(tracked[5].job.status, "completed");
  assert.ok(isVideoPreviewRunActive(tracked[0]));
  assert.equal(isVideoPreviewRunActive(tracked[3]), false);
});

test("GG-039 resumes only a known task and never silently resubmits uncertain creation", async () => {
  const run = createVideoPreviewRuns(input, 1, "uncertain")[0];
  let current = run;
  let calls = 0;
  await submitVideoPreviewRuns([run], (update) => { current = update; }, async () => { calls++; throw new Error("connection lost"); });
  assert.equal(calls, 1);
  await resumeVideoPreviewRun(current, () => assert.fail("unknown ID must not query"), async () => assert.fail("must not POST or query"));
  current = { ...current, job: job("task-known") };
  await resumeVideoPreviewRun(current, (update) => { current = update; }, async (initial, observe) => { assert.equal(initial.taskId, "task-known"); observe(job("task-known", "completed")); return job("task-known", "completed"); });
  assert.equal(current.monitoringError, null);
  assert.equal(current.job.status, "completed");
  assert.equal(calls, 1);
});

test("GG-039 HTTP fan-out sends four single-task POSTs and polls each returned ID", async () => {
  const priorFetch = globalThis.fetch;
  const priorWindow = globalThis.window;
  const requests = [];
  let number = 0;
  globalThis.window = { setTimeout: (callback) => queueMicrotask(callback) };
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });
    if (options.method === "POST") {
      const payload = JSON.parse(options.body);
      assert.deepEqual(payload, input);
      return Response.json(job(`task-http-${++number}`));
    }
    const id = new URL(url, "http://localhost").searchParams.get("taskId");
    return Response.json(job(id, "completed"));
  };
  try {
    const runs = createVideoPreviewRuns(input, 4, "http");
    let tracked = runs;
    await submitVideoPreviewRuns(runs, (update) => { tracked = updateVideoPreviewRun(tracked, update); });
    assert.equal(requests.filter((request) => request.options.method === "POST").length, 4);
    assert.equal(new Set(requests.filter((request) => request.options.method !== "POST").map((request) => request.url)).size, 4);
    assert.ok(tracked.every((run) => run.job.status === "completed"));
  } finally { globalThis.fetch = priorFetch; globalThis.window = priorWindow; }
});

test("GG-039 exposes independent count and repeat-submit controls with compact local cards", async () => {
  const read = (name) => readFile(name, "utf8");
  const [composer, page, detail, boundary] = await Promise.all([read("features/creation/video-creation-composer.tsx"), read("app/page.tsx"), read("features/creation/video-preview-detail.tsx"), read("features/creation/http-video-preview-boundary.ts")]);
  assert.match(composer, /aria-label="视频生成数量"/);
  assert.match(composer, /disabled=\{!interfaceAvailable\}/);
  assert.doesNotMatch(page, /if \(isVideoGenerating\) return/);
  assert.match(page, /generationCount=\{videoGenerationCount\}/);
  assert.match(page, /setVideoGenerationCount\(DEFAULT_VIDEO_GENERATION_COUNT\)/);
  assert.match(page, /<VideoPreviewCard/);
  assert.doesNotMatch(page, /className="video-preview-result"/);
  assert.match(detail, /<video key=\{active.key\}.*controls/);
  assert.match(boundary, /return pollLocalVideoPreview\(job, observer\)/);
});
