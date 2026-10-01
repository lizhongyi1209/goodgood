export const CANVAS_SELECTION_CLIPBOARD_TYPE = "application/x-goodgood-canvas-selection";

const ignoredTargetSelector = "input, textarea, select, button, a, [contenteditable], [role='button'], [role='textbox'], [role='menu'], [role='dialog'], .nokey";

export function isCanvasClipboardTarget(target, surface) {
  return Boolean(target && typeof target.closest === "function" && surface?.contains(target) &&
    (target === surface || target.closest(".react-flow")) && !target.closest(ignoredTargetSelector));
}

export function readCanvasClipboardImages(clipboardData) {
  const isImage = (file) => file?.type?.startsWith("image/");
  // files and items expose the same payload. Prefer files so each image uploads once.
  const files = Array.from(clipboardData?.files ?? []).filter(isImage);
  if (files.length) return [...new Set(files)];
  const itemFiles = Array.from(clipboardData?.items ?? []).flatMap((item) => {
    if (item.kind !== "file" || !item.type.startsWith("image/")) return [];
    const file = item.getAsFile();
    return isImage(file) ? [file] : [];
  });
  return [...new Set(itemFiles)];
}

export function handleCanvasClipboardCopy(event, { selectionToken, onCopySelection }) {
  if (event.defaultPrevented || !event.clipboardData ||
      !isCanvasClipboardTarget(event.target, event.currentTarget) || !onCopySelection()) return false;
  event.clipboardData.setData(CANVAS_SELECTION_CLIPBOARD_TYPE, selectionToken);
  event.preventDefault();
  event.stopPropagation();
  return true;
}

export function handleCanvasClipboardPaste(event, { selectionToken, onPasteSelection, onPasteImages }) {
  if (event.defaultPrevented || !event.clipboardData ||
      !isCanvasClipboardTarget(event.target, event.currentTarget)) return false;
  if (selectionToken && event.clipboardData.getData(CANVAS_SELECTION_CLIPBOARD_TYPE) === selectionToken) {
    event.preventDefault();
    event.stopPropagation();
    onPasteSelection();
    return true;
  }
  const files = readCanvasClipboardImages(event.clipboardData);
  if (!files.length) return false;
  event.preventDefault();
  event.stopPropagation();
  onPasteImages(files);
  return true;
}
