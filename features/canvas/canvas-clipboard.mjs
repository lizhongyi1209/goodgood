export const CANVAS_SELECTION_CLIPBOARD_TYPE = "application/x-goodgood-canvas-selection";

const ignoredTargetSelector = "input, textarea, select, button, a, [contenteditable], [role='button'], [role='textbox'], [role='menu'], [role='dialog'], .nokey";
const openLayerSelector = ["[role='dialog']", "[role='alertdialog']", "[role='menu']"]
  .map((selector) => `${selector}:not([hidden]):not([aria-hidden='true']):not([data-state='closed'])`)
  .concat("[data-slot='popover-content'][data-state='open']").join(", ");

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

export function handleCanvasBodyClipboardPaste(event, { surface, ...options }) {
  const page = surface?.ownerDocument;
  if (!surface?.isConnected || event.currentTarget !== page ||
      (event.target !== page.body && event.target !== page.documentElement) ||
      (page.activeElement !== page.body && page.activeElement !== page.documentElement) ||
      surface.closest("[inert], [aria-hidden='true']") || page.querySelector(openLayerSelector)) return false;
  return handleCanvasClipboardPaste({
    target: surface, currentTarget: surface, clipboardData: event.clipboardData,
    defaultPrevented: event.defaultPrevented,
    preventDefault: () => event.preventDefault(), stopPropagation: () => event.stopPropagation(),
  }, options);
}
