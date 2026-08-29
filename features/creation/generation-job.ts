import type {
  GenerationError,
  GenerationJob,
  GenerationJobState,
  GenerationOutput,
} from "@/shared/contracts/generation";

const ALLOWED_JOB_TRANSITIONS = {
  queued: ["running", "failed", "cancelled"],
  running: ["refining", "succeeded", "failed", "cancelled"],
  refining: ["succeeded", "failed", "cancelled"],
  succeeded: [],
  failed: [],
  cancelled: [],
} as const satisfies Readonly<
  Record<GenerationJobState, readonly GenerationJobState[]>
>;

export type GenerationUiStage =
  | "idle"
  | "queued"
  | "rendering"
  | "refining"
  | "complete"
  | "failed";

export function canTransitionGenerationJob(
  from: GenerationJobState,
  to: GenerationJobState,
): boolean {
  return (ALLOWED_JOB_TRANSITIONS[from] as readonly GenerationJobState[]).includes(
    to,
  );
}

export function transitionGenerationJob(
  job: GenerationJob,
  state: GenerationJobState,
  updatedAt: string,
  update: Readonly<{
    outputs?: readonly GenerationOutput[];
    error?: GenerationError | null;
  }> = {},
): GenerationJob {
  if (!canTransitionGenerationJob(job.state, state)) {
    throw new Error(`Invalid generation job transition: ${job.state} -> ${state}`);
  }

  return Object.freeze({
    ...job,
    state,
    outputs: update.outputs
      ? Object.freeze(update.outputs.map((output) => Object.freeze({ ...output })))
      : job.outputs,
    error: update.error === undefined ? job.error : update.error,
    updatedAt,
  });
}

export function isGenerationJobActive(state: GenerationJobState): boolean {
  return state === "queued" || state === "running" || state === "refining";
}

export function toGenerationUiStage(
  state: GenerationJobState | null,
): GenerationUiStage {
  if (state === null) return "idle";
  if (state === "running") return "rendering";
  if (state === "succeeded") return "complete";
  if (state === "cancelled") return "failed";
  return state;
}
