import type { HttpGenerationBoundary } from "@/features/creation/http-generation-boundary";
import type { GenerationInputSnapshot, GenerationJob } from "@/shared/contracts/generation";
import { canvasImageJobIsActive } from "./canvas-image-prompt-batch.mjs";

export function pendingCanvasImageJob(input: GenerationInputSnapshot): GenerationJob {
  const timestamp = new Date().toISOString();
  return { id: `pending_${crypto.randomUUID()}`, input, state: "queued", outputs: [], error: null,
    createdAt: timestamp, updatedAt: timestamp };
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
