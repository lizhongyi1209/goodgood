export const CANVAS_SELECTION_CLIPBOARD_TYPE: string;

type CanvasClipboardEvent = Pick<ClipboardEvent,
  "target" | "currentTarget" | "clipboardData" | "defaultPrevented" | "preventDefault" | "stopPropagation">;
type CanvasPasteOptions = Readonly<{
  selectionToken: string | null;
  onPasteSelection: () => void;
  onPasteImages: (files: File[]) => void;
}>;

export function isCanvasClipboardTarget(target: EventTarget | null, surface: EventTarget | null): boolean;
export function readCanvasClipboardImages(clipboardData: DataTransfer | null): File[];
export function handleCanvasClipboardCopy(event: CanvasClipboardEvent, options: Readonly<{
  selectionToken: string;
  onCopySelection: () => boolean;
}>): boolean;
export function handleCanvasClipboardPaste(event: CanvasClipboardEvent, options: CanvasPasteOptions): boolean;
export function handleCanvasBodyClipboardPaste(event: CanvasClipboardEvent,
  options: CanvasPasteOptions & Readonly<{ surface: HTMLElement }>): boolean;
