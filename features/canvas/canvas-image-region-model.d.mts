import type { PlacementPoint, PlacementRegion, PlacementSize } from "./canvas-image-placement-model.mjs";
export type RegionScreenRect = Readonly<{ left: number; top: number; width: number; height: number }>;
export function regionImageFrame(bounds: RegionScreenRect, size: PlacementSize): RegionScreenRect | null;
export function regionPointFromClient(point: PlacementPoint, frame: RegionScreenRect, size: PlacementSize): PlacementPoint;
export function regionPanelPosition(frame: RegionScreenRect, available: RegionScreenRect, panelHeight?: number): Readonly<{ left: number; top: number; width: number; maxHeight: number }>;
export function regionBboxText(region: PlacementRegion | null, size: PlacementSize | null): string;
