import { isGenerationJobActive } from "@/features/creation/generation-job";
import type { GenerationJob } from "@/shared/contracts/generation";

export type TrackedGenerationRun = Readonly<{
  key: string;
  job: GenerationJob;
}>;

export function upsertGenerationRun(
  current: readonly TrackedGenerationRun[],
  key: string,
  job: GenerationJob,
): readonly TrackedGenerationRun[] {
  const existingIndex = current.findIndex((run) => run.key === key);
  const nextRun = Object.freeze({ key, job });
  if (existingIndex < 0) {
    return Object.freeze([nextRun, ...current]);
  }
  return Object.freeze(current.map((run, index) =>
    index === existingIndex ? nextRun : run));
}

export function removeGenerationRun(
  current: readonly TrackedGenerationRun[],
  key: string,
): readonly TrackedGenerationRun[] {
  return Object.freeze(current.filter((run) => run.key !== key));
}

export function getActiveGenerationRuns(
  runs: readonly TrackedGenerationRun[],
): readonly TrackedGenerationRun[] {
  return runs.filter((run) => isGenerationJobActive(run.job.state));
}

export function getFailedGenerationRuns(
  runs: readonly TrackedGenerationRun[],
): readonly TrackedGenerationRun[] {
  return runs.filter((run) =>
    !isGenerationJobActive(run.job.state) && run.job.error !== null);
}

export function getPersistentGenerationJobIds(
  runs: readonly TrackedGenerationRun[],
): readonly string[] {
  return runs
    .map((run) => run.job.id)
    .filter((jobId) => !jobId.startsWith("pending_"));
}
