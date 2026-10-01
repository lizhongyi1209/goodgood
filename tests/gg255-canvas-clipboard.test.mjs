import assert from "node:assert/strict";
import test from "node:test";

import {
  CANVAS_SELECTION_CLIPBOARD_TYPE,
  handleCanvasClipboardCopy,
  handleCanvasClipboardPaste,
  readCanvasClipboardImages,
} from "../features/canvas/canvas-clipboard.mjs";
import { selectCanvasMediaFiles } from "../features/canvas/canvas-local-images.mjs";

const image = (name = "image.png", type = "image/png", size = 100) => ({ name, type, size });
const item = (file) => ({ kind: "file", type: file?.type ?? "image/png", getAsFile: () => file });

function clipboard(files = [], items = [], initial = {}) {
  const values = new Map(Object.entries(initial));
  return { files, items, getData: (type) => values.get(type) ?? "", setData: (type, value) => values.set(type, value) };
}

function event(data = clipboard(), { blocked = null, inFlow = true, inCanvas = true, surfaceTarget = false } = {}) {
  const surface = { contains: (target) => target === surface || target.inCanvas,
    closest: () => null };
  const target = surfaceTarget ? surface : { inCanvas,
    closest: (selector) => selector === ".react-flow" ? (inFlow ? {} : null)
      : (blocked && selector.includes(blocked) ? {} : null) };
  return { target, currentTarget: surface, clipboardData: data, defaultPrevented: false,
    stopped: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; } };
}

function pasteOptions(selectionToken = "local-selection") {
  const selected = [];
  const uploaded = [];
  return { selectionToken, selected, uploaded,
    onPasteSelection: () => selected.push(true), onPasteImages: (files) => uploaded.push(files) };
}

test("clipboard files are authoritative and upload multiple images once across files/items", () => {
  const first = image("one.png");
  const second = image("two.jpg", "image/jpeg");
  const data = clipboard([first, second, first], [
    { kind: "file", type: first.type, getAsFile: () => { throw new Error("duplicate view must not be read"); } },
  ]);
  const options = pasteOptions();
  const paste = event(data);
  assert.equal(handleCanvasClipboardPaste(paste, options), true);
  assert.deepEqual(options.uploaded, [[first, second]]);
  assert.deepEqual(options.selected, []);
  assert.equal(paste.defaultPrevented, true);
  assert.equal(paste.stopped, true);
});

test("items-only image clipboard supports native screenshot payloads and null files", () => {
  const screenshot = image();
  const data = clipboard([], [item(screenshot), item(null), item(screenshot),
    { kind: "string", type: "text/html", getAsFile: () => { throw new Error("not an image"); } }]);
  assert.deepEqual(readCanvasClipboardImages(data), [screenshot]);
  const options = pasteOptions(null);
  assert.equal(handleCanvasClipboardPaste(event(data), options), true);
  assert.deepEqual(options.uploaded, [[screenshot]]);
});

test("empty, plain URLs, HTML-only and non-image clipboard payloads do not upload or duplicate nodes", () => {
  for (const data of [null, clipboard(), clipboard([], [], {
    "text/plain": "https://example.com/image.png", "text/html": '<img src="https://example.com/image.png">',
  }), clipboard([image("video.mp4", "video/mp4")])]) {
    const paste = event(data);
    const options = pasteOptions();
    assert.equal(handleCanvasClipboardPaste(paste, options), false);
    assert.deepEqual(options.uploaded, []);
    assert.deepEqual(options.selected, []);
    assert.equal(paste.defaultPrevented, false);
  }
});

test("inputs, editable fields, controls, menus and dialogs preserve their native clipboard behavior", () => {
  for (const blocked of ["input", "textarea", "select", "button", "a,", "[contenteditable]",
    "[role='button']", "[role='textbox']", "[role='menu']", "[role='dialog']", ".nokey"]) {
    const paste = event(clipboard([image()]), { blocked });
    const options = pasteOptions();
    assert.equal(handleCanvasClipboardPaste(paste, options), false, blocked);
    assert.deepEqual(options.uploaded, [], blocked);
    assert.equal(paste.defaultPrevented, false, blocked);
    let copied = false;
    assert.equal(handleCanvasClipboardCopy(paste, { selectionToken: "local-selection",
      onCopySelection: () => { copied = true; return true; } }), false, blocked);
    assert.equal(copied, false, blocked);
  }
});

test("events outside the flow, portaled dialogs and already handled paste events are ignored", () => {
  for (const scope of [{ inFlow: false }, { inCanvas: false }]) {
    const paste = event(clipboard([image()]), scope);
    const options = pasteOptions();
    assert.equal(handleCanvasClipboardPaste(paste, options), false);
    assert.deepEqual(options.uploaded, []);
  }
  const handled = event(clipboard([image()]));
  handled.defaultPrevented = true;
  const options = pasteOptions();
  assert.equal(handleCanvasClipboardPaste(handled, options), false);
  assert.deepEqual(options.uploaded, []);
});

test("a focused canvas surface can receive pasted images without a focused node", () => {
  const options = pasteOptions(null);
  assert.equal(handleCanvasClipboardPaste(event(clipboard([image()]), { surfaceTarget: true }), options), true);
  assert.equal(options.uploaded.length, 1);
});

test("native copy stores a session marker and same-session paste duplicates nodes instead of uploading stale images", () => {
  const data = clipboard();
  let copied = 0;
  const copy = event(data);
  assert.equal(handleCanvasClipboardCopy(copy, { selectionToken: "local-selection",
    onCopySelection: () => { copied += 1; return true; } }), true);
  assert.equal(copied, 1);
  assert.equal(copy.defaultPrevented, true);
  assert.equal(copy.stopped, true);
  assert.equal(data.getData(CANVAS_SELECTION_CLIPBOARD_TYPE), "local-selection");
  data.files.push(image());
  const options = pasteOptions();
  assert.equal(handleCanvasClipboardPaste(event(data), options), true);
  assert.deepEqual(options.selected, [true]);
  assert.deepEqual(options.uploaded, []);
});

test("external replacement and foreign selection markers cannot paste stale local nodes", () => {
  const options = pasteOptions();
  const external = image("external.png");
  assert.equal(handleCanvasClipboardPaste(event(clipboard([external], [], {
    [CANVAS_SELECTION_CLIPBOARD_TYPE]: "another-workspace",
  })), options), true);
  assert.deepEqual(options.selected, []);
  assert.deepEqual(options.uploaded, [[external]]);
  assert.equal(handleCanvasClipboardPaste(event(clipboard([], [], {
    [CANVAS_SELECTION_CLIPBOARD_TYPE]: "another-workspace",
  })), options), false);
  assert.deepEqual(options.selected, []);
});

test("unavailable internal selections leave the native clipboard untouched", () => {
  const data = clipboard([], [], { "text/plain": "previous" });
  const copy = event(data);
  assert.equal(handleCanvasClipboardCopy(copy, { selectionToken: "local-selection", onCopySelection: () => false }), false);
  assert.equal(data.getData(CANVAS_SELECTION_CLIPBOARD_TYPE), "");
  assert.equal(data.getData("text/plain"), "previous");
  assert.equal(copy.defaultPrevented, false);
});

test("clipboard images retain the existing drop format, empty-file and size validation", () => {
  const good = image();
  const data = clipboard([good, image("unsupported.gif", "image/gif"), image("empty.png", "image/png", 0),
    image("oversized.png", "image/png", 20 * 1024 * 1024 + 1)]);
  let result;
  const options = pasteOptions();
  options.onPasteImages = (files) => { result = selectCanvasMediaFiles(files); };
  assert.equal(handleCanvasClipboardPaste(event(data), options), true);
  assert.deepEqual(result.accepted, [good]);
  assert.equal(result.errors.length, 3);
  assert.match(result.errors.join(" "), /unsupported\.gif.*empty\.png.*oversized\.png/);
});
