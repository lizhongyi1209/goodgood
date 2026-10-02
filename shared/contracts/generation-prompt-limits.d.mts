export const PROMPT_DRAFT_MAX_LENGTH: number;
export type GenerationPromptLimit = Readonly<{ maxLength: number; source: "provider" | "application" }>;
export const GENERATION_PROMPT_LIMITS: Readonly<Record<string, GenerationPromptLimit>>;
export type GenerationPromptStatus = Readonly<{
  length: number;
  maxLength: number;
  limitSource: "provider" | "application";
  excess: number;
  tooLong: boolean;
  errorMessage: string | null;
  advice: string | null;
}>;
export function countPromptCharacters(text: string): number;
export function getGenerationPromptStatus(modelId: string | null | undefined, text: string): GenerationPromptStatus;
