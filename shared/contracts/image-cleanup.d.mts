export const IMAGE_CLEANUP_CREDIT_COST: 10;
export const IMAGE_CLEANUP_SOURCE_KINDS: readonly ["asset", "reference"];
export type ImageCleanupInput = Readonly<{ requestId: string; sourceKind: "asset" | "reference"; sourceId: string; name: string; projectId: string | null }>;
export type ImageCleanupResult = Readonly<{ requestId: string; chargedCredits: 10; reference: Readonly<{ id: string; name: string; mimeType: "image/jpeg" | "image/png"; width: number; height: number; byteSize: number }> }>;
