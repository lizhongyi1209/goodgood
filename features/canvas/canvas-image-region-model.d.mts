import type { PlacementPoint, PlacementRegion, PlacementSize } from "./canvas-image-placement-model.mjs";
export type RegionScreenRect = Readonly<{ left: number; top: number; width: number; height: number }>;
export const REGION_MARK_COLOR: string;
export function defaultRegion(size: PlacementSize): PlacementRegion | null;
export function regionMarkRects(region: PlacementRegion | null, size: PlacementSize): PlacementRegion[];
export function paintRegionAnnotation(context: CanvasRenderingContext2D, base: CanvasImageSource, region: PlacementRegion, size: PlacementSize): void;
export function regionImageFrame(bounds: RegionScreenRect, size: PlacementSize): RegionScreenRect | null;
export function regionPointFromClient(point: PlacementPoint, frame: RegionScreenRect, size: PlacementSize): PlacementPoint;
export function regionPanelPosition(frame: RegionScreenRect, available: RegionScreenRect, panelHeight?: number, panelWidth?: number): Readonly<{ left: number; top: number; width: number; maxHeight: number }>;
