export const CANVAS_SELECTION_CLIPBOARD_TYPE: string;

type CanvasClipboardEvent = Pick<ClipboardEvent,
  "target" | "currentTarget" | "clipboardData" | "defaultPrevented" | "preventDefault" | "stopPropagation">;

export function isCanvasClipboardTarget(target: EventTarget | null, surface: EventTarget | null): boolean;
export function readCanvasClipboardImages(clipboardData: DataTransfer | null): File[];
export function handleCanvasClipboardCopy(event: CanvasClipboardEvent, options: Readonly<{
  selectionToken: string;
  onCopySelection: () => boolean;
}>): boolean;
export function handleCanvasClipboardPaste(event: CanvasClipboardEvent, options: Readonly<{
  selectionToken: string | null;
  onPasteSelection: () => void;
  onPasteImages: (files: File[]) => void;
}>): boolean;
