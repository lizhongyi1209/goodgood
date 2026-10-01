import type { AssetArrangement, AssetFolder, OrganizedAssetKind } from "@/features/assets/http-asset-organization";
export type CanvasLibraryDeleteTarget = Readonly<{ id: string; name: string; kind: OrganizedAssetKind | "folder" }>;
export function nextCanvasFolderName(folders?: readonly Pick<AssetFolder, "name">[]): string;
export function canvasFolderNameError(value: string): string | null;
export function canvasAssetDeleteNotice(target: CanvasLibraryDeleteTarget): string;
export function deleteCanvasLibraryEntry(target: CanvasLibraryDeleteTarget, operations: { deleteFolder: (id: string) => Promise<void>; deleteGenerated: (id: string) => Promise<void>; deleteUploaded: (kind: "reference" | "video" | "audio", id: string) => Promise<void> }): Promise<void>;
export function removeCanvasLibraryEntry<T extends { folders: readonly AssetFolder[]; arrangements: readonly AssetArrangement[]; items: readonly { kind: OrganizedAssetKind; id: string }[] }>(data: T | null, target: CanvasLibraryDeleteTarget): T | null;
