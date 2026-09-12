import { VIDEO_GENERATION_COUNTS, type VideoGenerationCount } from "@/features/creation/video-generation-options";
import { pollLocalVideoPreview, submitLocalVideoPreview, type LocalVideoPreviewInput, type LocalVideoPreviewJob } from "@/features/creation/http-video-preview-boundary";

export type VideoPreviewRun = Readonly<{
  key: string;
  batchId: string;
  ordinal: number;
  count: VideoGenerationCount;
  submittedAt: number;
  input: LocalVideoPreviewInput;
  job: LocalVideoPreviewJob;
  monitoringError: string | null;
  outputRatio?: number;
}>;

export function createVideoPreviewRuns(input: LocalVideoPreviewInput, count: VideoGenerationCount, batchId: string, submittedAt = Date.now()): readonly VideoPreviewRun[] {
  if (!(VIDEO_GENERATION_COUNTS as readonly number[]).includes(count)) throw new Error("视频数量仅支持 1、2、4。");
  const snapshot = Object.freeze({ ...input, references: Object.freeze([]) as readonly [] });
  return Array.from({ length: count }, (_, ordinal) => Object.freeze({
    key: `${batchId}-${ordinal}`, batchId, ordinal, count, submittedAt, input: snapshot, monitoringError: null,
    job: Object.freeze({ taskId: `local_${batchId}-${ordinal}`, status: "submitting", progress: 0, resultUrl: null, error: null, terminal: false }),
  }));
}

export function updateVideoPreviewRun(runs: readonly VideoPreviewRun[], update: VideoPreviewRun): readonly VideoPreviewRun[] {
  return runs.map((run) => run.key === update.key ? update : run);
}

export function isVideoPreviewRunActive(run: VideoPreviewRun) {
  return !run.job.terminal && !run.monitoringError;
}

type Observe = (run: VideoPreviewRun) => void;
type Submit = typeof submitLocalVideoPreview;

// Each request starts immediately; failures never reject or cancel sibling runs.
export async function submitVideoPreviewRuns(runs: readonly VideoPreviewRun[], observe: Observe, submit: Submit = submitLocalVideoPreview) {
  await Promise.all(runs.map(async (initial) => {
    let current = initial;
    const update = (job: LocalVideoPreviewJob) => { current = { ...current, job, monitoringError: null }; observe(current); };
    try {
      update(await submit(initial.input, update));
    } catch (error) {
      const message = error instanceof Error ? error.message : "视频请求暂时无法确认。";
      // No known upstream ID means submission is uncertain: never silently POST again.
      current = { ...current, monitoringError: message };
      observe(current);
    }
  }));
}

export async function resumeVideoPreviewRun(run: VideoPreviewRun, observe: Observe, poll: typeof pollLocalVideoPreview = pollLocalVideoPreview) {
  if (run.job.taskId.startsWith("local_") || run.job.terminal || !run.monitoringError) return;
  let current = { ...run, monitoringError: null };
  observe(current);
  const update = (job: LocalVideoPreviewJob) => { current = { ...current, job }; observe(current); };
  try { update(await poll(run.job, update)); }
  catch (error) { observe({ ...current, monitoringError: error instanceof Error ? error.message : "查询暂时不可用。" }); }
}
