import type { AssetArrangement, AssetFolder } from "@/features/assets/http-asset-organization";

export const CANVAS_ASSET_DRAG_TYPE: "application/x-goodgood-canvas-asset";
export type CanvasFolderDropData = Readonly<{
  folders: readonly AssetFolder[];
  arrangements: readonly AssetArrangement[];
  items: readonly Readonly<{ id: string; kind: string; media: string }>[];
}>;
export type CanvasFolderMovePlan = Readonly<{
  key: string;
  kind: "generated" | "reference";
  id: string;
  folderId: string;
  folderName: string;
  tags: readonly string[];
}>;
export type CanvasFolderMoveState = CanvasFolderMovePlan & Readonly<{
  phase: "pending" | "succeeded" | "failed";
  error: string | null;
}>;
export function planCanvasFolderMove(data: CanvasFolderDropData | null, key: string | null, folderId: string): CanvasFolderMovePlan | null;
export type CanvasFolderMover = Readonly<{
  isPending: () => boolean;
  dispose: () => void;
  move: (key: string, folderId: string) => Promise<boolean>;
}>;
export function createCanvasFolderMover(options: Readonly<{
  readData: () => CanvasFolderDropData | null;
  save: (kind: "generated" | "reference", id: string, value: Readonly<{ folderId: string; tags: readonly string[] }>) => Promise<AssetArrangement>;
  onSaved: (saved: AssetArrangement) => void;
  onState: (state: CanvasFolderMoveState) => void;
}>): CanvasFolderMover;
