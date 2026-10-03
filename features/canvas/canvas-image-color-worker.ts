import { applyColorLut, type ColorLut } from "./canvas-image-color-model.mjs";

// Export runs off the UI thread. Closing the editor terminates this worker.
self.onmessage = (event: MessageEvent<{ pixels: ArrayBuffer; lut: ColorLut }>) => {
  try {
    const pixels = new Uint8ClampedArray(event.data.pixels);
    applyColorLut(pixels, event.data.lut);
    self.postMessage({ pixels: pixels.buffer }, { transfer: [pixels.buffer] });
  } catch {
    self.postMessage({ error: "图片处理失败，请重试。" });
  }
};
