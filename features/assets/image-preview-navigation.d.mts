export type ImagePreviewView = Readonly<{ scale: number; x: number; y: number }>;
export const INITIAL_IMAGE_VIEW: ImagePreviewView;
export function zoomImageView(view: ImagePreviewView, anchor: Readonly<{ x: number; y: number }>, factor: number): ImagePreviewView;
export function attachImagePreviewNavigation(surface: HTMLElement, options: Readonly<{
  onViewChange: (view: ImagePreviewView) => void;
  onDraggingChange?: (dragging: boolean) => void;
}>): { zoomBy: (factor: number) => void; fit: () => void; dispose: () => void };
