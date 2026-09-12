import { parsePromptBatch } from "@/shared/contracts/prompt-batch.mjs";
import { createGenerationInputSnapshot } from "@/features/creation/generation-snapshot";
import { createVideoPreviewRuns } from "@/features/creation/video-preview-runs";
import type { GenerationInputDraft } from "@/shared/contracts/generation";
import type { LocalVideoPreviewInput } from "@/features/creation/http-video-preview-boundary";
import type { VideoGenerationCount } from "@/features/creation/video-generation-options";
import type { GenerationInputSnapshot } from "@/shared/contracts/generation";
import type { TrackedGenerationRun } from "@/features/creation/generation-runs";

export function createImagePromptBatch(draft: GenerationInputDraft) {
  const batch = parsePromptBatch(draft.prompt);
  if (!batch.prompts.length) throw new Error("请先输入画面描述，分隔符不能作为提示词。");
  if (draft.prompt.trim().length > 4_000) throw new Error("画面描述总长度不能超过 4000 个字符。");
  return Object.freeze(batch.prompts.map((prompt) => createGenerationInputSnapshot({
    ...draft, prompt,
    ...(batch.hasSeparator && draft.projectId ? { composerPrompt: draft.prompt.trim() } : {}),
  })));
}

export function createVideoPromptBatch(input: LocalVideoPreviewInput, count: VideoGenerationCount, batchId: string, submittedAt = Date.now()) {
  const batch = parsePromptBatch(input.prompt);
  if (!batch.prompts.length) throw new Error("请先输入视频描述，分隔符不能作为提示词。");
  return batch.prompts.flatMap((prompt, promptOrdinal) => createVideoPreviewRuns(
    { ...input, prompt }, count, `${batchId}-p${promptOrdinal}`, submittedAt,
  ).map((run) => ({ ...run, promptOrdinal, promptCount: batch.prompts.length })));
}

export function createImagePromptRuns(snapshots: readonly GenerationInputSnapshot[], createKey = () => globalThis.crypto.randomUUID(), timestamp = new Date().toISOString()): readonly TrackedGenerationRun[] {
  return snapshots.map((input) => {
    const key = createKey();
    return { key, submittedAt: Date.parse(timestamp), job: { id: `pending_${key}`, createdAt: timestamp, updatedAt: timestamp, input, outputs: [], error: null, state: "queued" } };
  });
}

// All callbacks start before awaiting any; a failed segment never skips siblings.
export async function submitPromptBatch<T>(snapshots: readonly T[], submit: (snapshot: T) => Promise<unknown>) {
  return Promise.allSettled(snapshots.map(async (snapshot) => submit(snapshot)));
}
