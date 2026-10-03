import type { GenerationInputSnapshot, GenerationJob, GenerationOutput } from "@/shared/contracts/generation";
export type CanvasImageSlot = Readonly<{ id: string; requestKey?: string; retryOfJobId?: string; outputIndex?: number; job: GenerationJob }>;
export type CanvasImageSlotData = { slots?: readonly CanvasImageSlot[]; job?: GenerationJob; jobs?: readonly GenerationJob[] };
export type CanvasImageResultSlot = CanvasImageSlot & Readonly<{ slotIndex: number; key: string; output?: GenerationOutput }>;
export function canvasGeneratorSlots(data: CanvasImageSlotData): readonly CanvasImageSlot[];
export function canvasGeneratorResultSlots(data: CanvasImageSlotData): CanvasImageResultSlot[];
export function canvasImageSlotCanRetry(slot: CanvasImageSlot): boolean;
export function canvasImageSlotFrozenInput(input: GenerationInputSnapshot): GenerationInputSnapshot;
export function recoverCanvasImageSlot(slot: CanvasImageSlot): CanvasImageSlot;
