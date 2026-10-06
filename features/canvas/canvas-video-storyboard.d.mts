import type { CanvasVideoGenerationDraft } from "../../shared/contracts/video-generation.mjs";
type Shot = CanvasVideoGenerationDraft["shots"][number];
export function canvasVideoStoryboardResize(shots: readonly Shot[], seconds: number): Shot[];
export function canvasVideoStoryboardSceneSeconds(shots: readonly Shot[], index: number, seconds: number, duration: number): Shot[];
export const CANVAS_VIDEO_CAMERA_REFERENCES: readonly { id: string; name: string; text: string }[];
export function canvasVideoCameraPrompt(prompt: string, referenceId: string, connectedText?: string): string | null;
export function canvasVideoStoryboardShots(shots: readonly Shot[], connectedText?: string): Shot[];
export function canvasVideoStoryboardProblem(shots: readonly Shot[], duration: number, connectedText?: string): string | null;
