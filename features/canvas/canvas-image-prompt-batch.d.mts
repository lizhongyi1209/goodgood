import type { GenerationJob, GenerationOutput } from "@/shared/contracts/generation";

export type CanvasImageJobs = { job?: GenerationJob; jobs?: readonly GenerationJob[]; slots?: readonly import("./canvas-image-slots.mjs").CanvasImageSlot[] };
export function parseCanvasImagePrompts(prompt: string): Readonly<{ hasSeparator: boolean; prompts: readonly string[] }>;
export function canvasGeneratorJobs(data: CanvasImageJobs): readonly GenerationJob[];
export function canvasGeneratorOutputs(data: CanvasImageJobs): GenerationOutput[];
export function canvasImageJobIsActive(job: GenerationJob): boolean;
export function canvasImageBatchCreditAmount(creditAmount: string, promptCount: number): string;
export function recoverCanvasImageJob(job: GenerationJob): GenerationJob;
