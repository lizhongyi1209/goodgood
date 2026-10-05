import type { VideoGenerationInput, VideoGenerationCount } from "../../shared/contracts/video-generation.mjs";
export function canvasVideoGenerationBatchInputs(input: VideoGenerationInput, count: VideoGenerationCount, createId: () => string): VideoGenerationInput[];
