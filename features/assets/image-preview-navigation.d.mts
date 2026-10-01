export type ImagePreviewView = Readonly<{ scale: number; x: number; y: number }>;
export const INITIAL_IMAGE_VIEW: ImagePreviewView;
export function fitImageFrame(viewport: Readonly<{ width: number; height: number }>, source: Readonly<{ width?: number; height?: number }>): Readonly<{ x: number; y: number; width: number; height: number }> | null;
export function zoomImageView(view: ImagePreviewView, anchor: Readonly<{ x: number; y: number }>, factor: number): ImagePreviewView;
export function attachImagePreviewNavigation(surface: HTMLElement, options: Readonly<{
  onViewChange: (view: ImagePreviewView) => void;
  onDraggingChange?: (dragging: boolean) => void;
}>): { zoomBy: (factor: number) => void; fit: () => void; dispose: () => void };
