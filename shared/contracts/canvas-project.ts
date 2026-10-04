import type { GenerationAspectRatio, GenerationCount, GenerationResolution, GptImageQuality, GptImageBackground, GptImageOutputFormat } from "@/shared/contracts/generation";
import type { GenerationJob, GenerationInputSnapshot, GenerationError } from "@/shared/contracts/generation";
import type { CanvasTextGenerationDraft } from "@/shared/contracts/text-generation.mjs";

export type CanvasProjectNode = Readonly<{
  id: string;
  type: "sourceImage" | "sourceVideo" | "sourceAudio" | "imageGenerator" | "imageResult" | "textEditor" | "textGenerator" | "group";
  position: Readonly<{ x: number; y: number }>;
  parentId?: string;
  emoji?: string;
  groupSizing?: "auto" | "manual";
  // Browser graph only; cloud compatibility encodes this in child order.
  referenceOrder?: readonly string[];
  size?: Readonly<{ width: number; height: number }>;
  asset?: Readonly<{ id: string; kind: "reference" | "generated" | "video" | "audio" }>;
  jobId?: string;
  jobIds?: readonly string[];
  imageSlots?: readonly CanvasProjectImageSlot[];
  index?: number;
  sequence?: number;
  name?: string;
  markdown?: string;
  text?: string;
  textGeneration?: CanvasTextGenerationDraft;
  metadata?: Readonly<{ pixelWidth?: number; pixelHeight?: number; durationSeconds?: number }>;
  // Browser recovery only. Never send this field to the server.
  pendingFileId?: string;
  localJob?: GenerationJob;
  localJobs?: readonly GenerationJob[];
}>;

/** Cloud-safe frozen inputs and idempotent request identities; runtime jobs stay local. */
export type CanvasProjectImageSlot = Readonly<{
  id: string;
  requestKey?: string;
  retryOfJobId?: string;
  jobId?: string;
  outputIndex?: number;
  input: GenerationInputSnapshot;
  error?: GenerationError;
}>;

export type CanvasProjectEdge = Readonly<{
  id: string;
  source: string;
  target: string;
  sourceHandle: string | null;
  targetHandle: string | null;
  // Browser graph only; cloud compatibility encodes active child edges.
  excludedSourceIds?: readonly string[];
}>;

export type CanvasProjectGenerator = Readonly<{
  draft: Readonly<{
    prompt: string;
    modelKey: string | null;
    ratio: GenerationAspectRatio;
    resolution: GenerationResolution;
    count: GenerationCount;
    quality?: GptImageQuality;
    background?: GptImageBackground;
    outputFormat?: GptImageOutputFormat;
    // Browser-only target order; cloud compatibility uses ranked edge IDs.
    referenceOrder?: readonly string[];
  }>;
  directReferenceIds: readonly string[];
  // Browser recovery only. Files are stored separately in IndexedDB.
  pendingReferences?: readonly Readonly<{ id: string; name: string }>[];
}>;

export const CANVAS_PROJECT_MAX_PAGES = 10;
export const CANVAS_PROJECT_DEFAULT_PAGE_ID = "page-1";
export const CANVAS_PROJECT_DEFAULT_PAGE_NAME = "页面1";

export type CanvasPageDocument = Readonly<{
  nodes: readonly CanvasProjectNode[];
  edges: readonly CanvasProjectEdge[];
  generators: Readonly<Record<string, CanvasProjectGenerator>>;
  convertedReferences?: Readonly<Record<string, string>>;
  viewport: Readonly<{ x: number; y: number; zoom: number }>;
}>;

export type CanvasProjectPage = CanvasPageDocument & Readonly<{
  id: string;
  name: string;
}>;

export type LegacyCanvasProjectDocument = CanvasPageDocument & Readonly<{
  schemaVersion: 1;
}>;

export type PagedCanvasProjectDocument = Readonly<{
  schemaVersion: 2;
  pages: readonly CanvasProjectPage[];
}>;

export type CanvasProjectDocument = LegacyCanvasProjectDocument | PagedCanvasProjectDocument;

/** Legacy documents remain unchanged in storage until a content edit is saved. */
export function getCanvasProjectPages(document: CanvasProjectDocument): readonly CanvasProjectPage[] {
  if (document.schemaVersion === 2) return document.pages;
  const { schemaVersion: _schemaVersion, ...page } = document;
  return [{ id: CANVAS_PROJECT_DEFAULT_PAGE_ID, name: CANVAS_PROJECT_DEFAULT_PAGE_NAME, ...page }];
}

export type CanvasProjectRecord = Readonly<{
  id: string;
  name: string;
  version: number;
  updatedAt: string;
  document: CanvasProjectDocument;
}>;

export type CanvasProjectSummary = Readonly<{
  id: string;
  name: string;
  version: number;
  updatedAt: string;
}>;
