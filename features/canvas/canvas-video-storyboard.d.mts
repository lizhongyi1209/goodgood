import type { CanvasVideoGenerationDraft } from "../../shared/contracts/video-generation.mjs";
type Shot = CanvasVideoGenerationDraft["shots"][number];
export function canvasVideoStoryboardShots(shots: readonly Shot[], connectedText?: string): Shot[];
export function canvasVideoStoryboardProblem(shots: readonly Shot[], duration: number, connectedText?: string): string | null;
