import type { HttpGenerationBoundary } from "@/features/creation/http-generation-boundary";
import type { GenerationInputSnapshot, GenerationJob } from "@/shared/contracts/generation";
import { canvasImageJobIsActive } from "./canvas-image-prompt-batch.mjs";
import { canvasImageSlotFrozenInput, type CanvasImageSlot } from "./canvas-image-slots.mjs";

export function pendingCanvasImageJob(input: GenerationInputSnapshot): GenerationJob {
  const timestamp = new Date().toISOString();
  return { id: `pending_${crypto.randomUUID()}`, input, state: "queued", outputs: [], error: null,
    createdAt: timestamp, updatedAt: timestamp };
}

export function pendingCanvasImageSlots(snapshots: readonly GenerationInputSnapshot[]): CanvasImageSlot[] {
  return snapshots.flatMap((snapshot) => Array.from({ length: snapshot.modelId === "seedream-5.0-pro" ? 1 : snapshot.count }, () => {
    const id = crypto.randomUUID();
    return { id, requestKey: id, job: pendingCanvasImageJob(canvasImageSlotFrozenInput({ ...snapshot, count: 1 })) };
  }));
}

/** Unknown POST retries use the original key and endpoint; known failures get a new request. */
export function retryCanvasImageSlot(slot: CanvasImageSlot, expectedPriceVersion?: number): CanvasImageSlot {
  if (slot.job.id.startsWith("pending_") && slot.requestKey && slot.job.error?.code === "SUBMISSION_UNKNOWN") {
    return { ...slot, job: pendingCanvasImageJob(slot.job.input) };
  }
  const input = canvasImageSlotFrozenInput({ ...slot.job.input, count: 1, expectedPriceVersion });
  return { ...slot, outputIndex: 0, requestKey: crypto.randomUUID(),
    retryOfJobId: slot.job.input.count === 1 && !slot.job.id.startsWith("pending_") && slot.job.state === "failed"
      ? slot.job.id : slot.retryOfJobId,
    job: pendingCanvasImageJob(input) };
}

export async function runCanvasGeneratorSlots({ slots, resume = false, boundary, observe, settled }: {
  slots: readonly CanvasImageSlot[];
  resume?: boolean;
  boundary: HttpGenerationBoundary;
  observe: (job: GenerationJob, slot: CanvasImageSlot) => void;
  settled?: (slot: CanvasImageSlot) => void;
}) {
  return Promise.allSettled(slots.map(async (slot) => {
    let latest = slot.job;
    const onJob = (next: GenerationJob) => { latest = next; observe(next, slot); };
    try {
      if (resume && (slot.job.id.startsWith("pending_") || !canvasImageJobIsActive(slot.job))) return slot.job;
      if (resume) return await boundary.resume(slot.job, onJob);
      const request = slot.requestKey ? { idempotencyKey: slot.requestKey } : undefined;
      if (slot.retryOfJobId) return await boundary.retry({ ...slot.job, id: slot.retryOfJobId }, onJob, request);
      return await boundary.service.submit(slot.job.input, onJob, request);
    } catch {
      if (latest.id.startsWith("pending_")) onJob({ ...latest, state: "failed", error: {
        code: "SUBMISSION_UNKNOWN", title: "生成状态未确认", retryable: Boolean(slot.requestKey),
        message: "请求状态未确认。点击重试将查询同一请求，不会重复提交已接受的任务。",
      } });
      throw new Error("图片生成状态未确认。");
    } finally { settled?.(slot); }
  }));
}

/** Start every segment before awaiting any result; retries keep sibling slots. */
export async function runCanvasGeneratorBatch({ jobs, mode, retryIndex, boundary, observe }: {
  jobs: readonly GenerationJob[];
  mode: "submit" | "resume" | "retry";
  retryIndex?: number;
  boundary: HttpGenerationBoundary;
  observe: (job: GenerationJob, index: number) => void;
}) {
  return Promise.allSettled(jobs.map(async (job, index) => {
    if (mode === "retry" && index !== retryIndex ||
        mode === "resume" && (job.id.startsWith("pending_") || !canvasImageJobIsActive(job))) return job;
    let latest = job;
    const onJob = (next: GenerationJob) => { latest = next; observe(next, index); };
    try {
      if (mode === "resume") return await boundary.resume(job, onJob);
      if (mode === "retry" && !job.id.startsWith("pending_")) return await boundary.retry(job, onJob);
      return await boundary.service.submit(job.input, onJob);
    } catch {
      // Do not pretend a durable server job failed or resubmit an uncertain POST.
      if (latest.id.startsWith("pending_")) onJob({ ...latest, state: "failed", error: {
        code: "SUBMISSION_UNKNOWN", title: "生成状态未确认",
        message: "请求可能仍在处理，请先检查资产库，再决定是否重新生成。", retryable: false,
      } });
      throw new Error("图片生成状态未确认。");
    }
  }));
}
