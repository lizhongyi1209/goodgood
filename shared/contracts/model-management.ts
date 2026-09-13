import type { GenerationModelId } from "./generation";
export type ManagedModel = Readonly<{
  id: string;
  name: string;
  description: string;
  mediaType: "image" | "video";
  adapterId: string;
  enabled: boolean;
  prices: Readonly<
    Record<string, Readonly<{ output: number; input?: number }>>
  >;
  version: number;
  updatedAt: string;
}>;
export type ManagedImageOption = Readonly<{
  id: GenerationModelId;
  catalogId: string;
  name: string;
  description: string;
  icon: "nano" | "openai";
  recommended: boolean;
}>;
export type ModelDirectory = Readonly<{ models: readonly ManagedModel[] }>;
