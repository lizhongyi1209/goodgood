export const TEXT_ASSET_MAX_TEXT: number;
export const TEXT_ASSET_MAX_MARKDOWN: number;
export const TEXT_ASSET_MAX_NAME: number;
export const TEXT_ASSET_PREVIEW_LENGTH: number;
export const TEXT_ASSETS_UPDATED_EVENT: string;
export type TextAssetInput = Readonly<{ id: string; name: string; markdown: string; text: string }>;
export type TextAssetSummary = Readonly<{ id: string; name: string; previewText: string; createdAt: string }>;
export type TextAsset = TextAssetSummary & Readonly<{ markdown: string; text: string }>;
export function isTextAssetId(value: unknown): boolean;
export function textAssetInputError(input: unknown): string | null;
export function textAssetDefaultName(text: string): string;
export function textAssetPreview(text: string): string;

