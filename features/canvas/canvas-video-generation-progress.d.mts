import type { VideoGenerationState } from "../../shared/contracts/video-generation.mjs";

export type CanvasVideoProgressInput = { attemptKey: string; state: VideoGenerationState; progress: number | null };
export type CanvasVideoProgressFrame = {
  attemptKey: string; state: VideoGenerationState;
  value: number; reported: number | null; estimated: boolean; elapsedMs: number; startValue: number;
};
export function advanceCanvasVideoGenerationProgress(
  previous: CanvasVideoProgressFrame | null,
  input: CanvasVideoProgressInput,
  elapsedMs?: number,
): CanvasVideoProgressFrame | null;
