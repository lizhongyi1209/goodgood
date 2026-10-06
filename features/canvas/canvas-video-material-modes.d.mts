import type { CanvasVideoGenerationDraft, VideoGenerationType, VideoModelId, VideoRole } from "../../shared/contracts/video-generation.mjs";
export type CanvasVideoModeInput = { key: string; kind: "image" | "video" | "text"; role?: VideoRole };
export type CanvasVideoTypeOption = { id: VideoGenerationType; modelId: VideoModelId; name: string; hint: string; enabled: boolean; reason: string; rule: string };
export function canvasVideoTypeAvailability(inputs: readonly CanvasVideoModeInput[]): CanvasVideoTypeOption[];
export function canvasVideoDraftForType(draft: CanvasVideoGenerationDraft, type: VideoGenerationType, inputs: readonly CanvasVideoModeInput[]): CanvasVideoGenerationDraft;
export function canvasVideoDraftForMaterials(draft: CanvasVideoGenerationDraft, inputs: readonly CanvasVideoModeInput[]): CanvasVideoGenerationDraft;
export function canvasVideoSubmissionType(type: VideoGenerationType, media: readonly { role: VideoRole }[]): VideoGenerationType;
export function canvasVideoUiRolesForType(type: VideoGenerationType, kind: "image" | "video"): VideoRole[];
