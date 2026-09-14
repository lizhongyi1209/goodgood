import type { BananaLine, GenerationModelId } from "./generation";
export type ModelSpecificationPrices = Readonly<
  Record<
    string,
    Readonly<{
      output: number;
      billing?: "tokens";
      input?: number;
      qualities?: Readonly<Record<string, number>>;
    }>
  >
>;
export type ManagedBananaLines = Readonly<
  Record<
    BananaLine,
    Readonly<{ enabled: boolean; prices: ModelSpecificationPrices }>
  >
>;
export type ManagedModel = Readonly<{
  id: string;
  name: string;
  description: string;
  mediaType: "image" | "video";
  adapterId: string;
  enabled: boolean;
  lines?: ManagedBananaLines;
  prices: Readonly<
    Record<
      string,
      Readonly<{
        output: number;
        billing?: "tokens";
        input?: number;
        qualities?: Readonly<Record<string, number>>;
      }>
    >
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
