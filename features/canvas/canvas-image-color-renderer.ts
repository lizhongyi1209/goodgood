import { PRIVATE_IMAGE_UPLOAD_MAX_BYTES } from "@/shared/contracts/upload-limits.mjs";
import { applyColorLut, type ColorLut } from "./canvas-image-color-model.mjs";

export function readColorPixels(image: HTMLImageElement, longestEdge = 2048): ImageData {
  const factor = Math.min(1, longestEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * factor));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * factor));
  try {
    const context = canvas.getContext("2d", { colorSpace: "srgb", willReadFrequently: true });
    if (!context) throw new Error("当前浏览器无法读取图片颜色。");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return context.getImageData(0, 0, canvas.width, canvas.height);
  } finally { canvas.width = 0; canvas.height = 0; }
}

async function transformPixels(pixels: Uint8ClampedArray, lut: ColorLut, signal: AbortSignal) {
  signal.throwIfAborted();
  if (typeof Worker !== "undefined") {
    let worker: Worker | null = null;
    try { worker = new Worker(new URL("./canvas-image-color-worker.ts", import.meta.url), { type: "module" }); } catch { /* Use the cooperative fallback below. */ }
    if (worker) {
      const activeWorker = worker;
      return new Promise<Uint8ClampedArray>((resolve, reject) => {
        const abort = () => finish(undefined, signal.reason ?? new DOMException("Aborted", "AbortError"));
        const finish = (result?: Uint8ClampedArray, cause?: unknown) => {
          signal.removeEventListener("abort", abort); activeWorker.terminate();
          if (cause) reject(cause); else if (result) resolve(result);
        };
        signal.addEventListener("abort", abort, { once: true });
        activeWorker.onmessage = (event: MessageEvent<{ pixels?: ArrayBuffer; error?: string }>) => {
          if (event.data.pixels) finish(new Uint8ClampedArray(event.data.pixels));
          else finish(undefined, new Error(event.data.error ?? "图片处理失败，请重试。"));
        };
        activeWorker.onerror = () => finish(undefined, new Error("图片处理失败，请重新打开调色后重试。"));
        try { const buffer = pixels.buffer as ArrayBuffer; activeWorker.postMessage({ pixels: buffer, lut }, [buffer]); }
        catch (cause) { finish(undefined, cause); }
        if (signal.aborted) abort();
      });
    }
  }
  for (let offset = 0; offset < pixels.length; offset += 65536) {
    signal.throwIfAborted();
    applyColorLut(pixels, lut, offset, Math.min(pixels.length, offset + 65536));
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  signal.throwIfAborted();
  return pixels;
}

// Hardware preview uses the same trilinear LUT as the CPU export. No CSS filter
// approximation and no image decoding/upload on each slider movement.
export function createColorPreview(pixels: ImageData) {
  let canvas = document.createElement("canvas");
  canvas.width = pixels.width; canvas.height = pixels.height;
  let gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: false, preserveDrawingBuffer: true });
  let program: WebGLProgram | null = null;
  let sourceTexture: WebGLTexture | null = null;
  let lutTexture: WebGLTexture | null = null;
  let buffer: WebGLBuffer | null = null;
  const shaders: WebGLShader[] = [];
  const releaseGpu = () => {
    if (!gl) return;
    for (const shader of shaders) gl.deleteShader(shader);
    gl.deleteTexture(sourceTexture); gl.deleteTexture(lutTexture); gl.deleteBuffer(buffer); gl.deleteProgram(program);
  };
  if (gl) {
    try {
      const shader = (type: number, source: string) => {
        const item = gl!.createShader(type);
        if (!item) throw new Error("GPU unavailable");
        shaders.push(item); gl!.shaderSource(item, source); gl!.compileShader(item);
        if (!gl!.getShaderParameter(item, gl!.COMPILE_STATUS)) throw new Error("GPU unavailable");
        return item;
      };
      program = gl.createProgram(); if (!program) throw new Error("GPU unavailable");
      gl.attachShader(program, shader(gl.VERTEX_SHADER, "attribute vec2 point; varying vec2 uv; void main(){uv=vec2((point.x+1.0)*0.5,(1.0-point.y)*0.5);gl_Position=vec4(point,0.0,1.0);}"));
      gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `precision highp float;
        varying vec2 uv; uniform sampler2D source; uniform sampler2D colors; uniform float size; uniform bool original;
        void main(){ vec4 pixel=texture2D(source,uv); if(original){gl_FragColor=pixel;return;}
          vec3 p=pixel.rgb*(size-1.0); float lower=floor(p.b); float upper=min(lower+1.0,size-1.0);
          vec2 low=vec2((lower*size+p.r+0.5)/(size*size),(p.g+0.5)/size);
          vec2 high=vec2((upper*size+p.r+0.5)/(size*size),(p.g+0.5)/size);
          gl_FragColor=vec4(mix(texture2D(colors,low).rgb,texture2D(colors,high).rgb,fract(p.b)),pixel.a);
        }`));
      gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("GPU unavailable");
      gl.useProgram(program);
      buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, "point"); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      const texture = (unit: number) => {
        gl!.activeTexture(gl!.TEXTURE0 + unit); const item = gl!.createTexture(); gl!.bindTexture(gl!.TEXTURE_2D, item);
        gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR); gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
        gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE); gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
        return item;
      };
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      sourceTexture = texture(0); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, pixels.width, pixels.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels.data);
      gl.uniform1i(gl.getUniformLocation(program, "source"), 0);
      lutTexture = texture(1); gl.uniform1i(gl.getUniformLocation(program, "colors"), 1);
      gl.viewport(0, 0, pixels.width, pixels.height);
    } catch {
      releaseGpu(); gl?.getExtension("WEBGL_lose_context")?.loseContext(); gl = null;
      canvas = document.createElement("canvas"); canvas.width = pixels.width; canvas.height = pixels.height;
    }
  }
  const gpu = gl, gpuProgram = program;
  const context = gpu ? null : canvas.getContext("2d", { colorSpace: "srgb" });
  let pending: AbortController | null = null;
  let disposed = false;
  return {
    canvas,
    async draw(lut: ColorLut, original: boolean) {
      pending?.abort(); const controller = new AbortController(); pending = controller;
      if (disposed) return;
      if (gpu && gpuProgram) {
        if (gpu.isContextLost()) throw new Error("图片预览已中断，请重新打开调色。");
        gpu.activeTexture(gpu.TEXTURE1); gpu.bindTexture(gpu.TEXTURE_2D, lutTexture);
        gpu.texImage2D(gpu.TEXTURE_2D, 0, gpu.RGBA, lut.size * lut.size, lut.size, 0, gpu.RGBA, gpu.UNSIGNED_BYTE, new Uint8Array(lut.data));
        gpu.uniform1f(gpu.getUniformLocation(gpuProgram, "size"), lut.size);
        gpu.uniform1i(gpu.getUniformLocation(gpuProgram, "original"), original ? 1 : 0);
        gpu.drawArrays(gpu.TRIANGLES, 0, 6); return;
      }
      if (!context) throw new Error("当前浏览器无法显示调色预览。");
      const output = original ? new Uint8ClampedArray(pixels.data) : await transformPixels(new Uint8ClampedArray(pixels.data), lut, controller.signal);
      if (!controller.signal.aborted && !disposed) context.putImageData(new ImageData(new Uint8ClampedArray(output), pixels.width, pixels.height), 0, 0);
    },
    dispose() { disposed = true; pending?.abort(); releaseGpu(); gpu?.getExtension("WEBGL_lose_context")?.loseContext(); canvas.remove(); canvas.width = 0; canvas.height = 0; },
  };
}

export async function exportColorImage(image: HTMLImageElement, lut: ColorLut, name: string, format: "png" | "jpeg", signal: AbortSignal): Promise<File> {
  signal.throwIfAborted();
  const width = image.naturalWidth, height = image.naturalHeight;
  if (!width || !height || width * height > 40000000 || Math.max(width, height) > 16384) throw new Error("图片尺寸过大，暂时无法保存调色副本。");
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  try {
    const context = canvas.getContext("2d", { colorSpace: "srgb", willReadFrequently: true });
    if (!context) throw new Error("当前浏览器无法导出图片。");
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, width, height);
    if (format === "jpeg") for (let i = 3; i < pixels.data.length; i += 4) {
      if (pixels.data[i] !== 255) throw new Error("这张图片包含透明区域，请使用 PNG 保存。");
    }
    const output = await transformPixels(pixels.data, lut, signal);
    signal.throwIfAborted();
    context.putImageData(new ImageData(new Uint8ClampedArray(output), width, height), 0, 0);
    const mime = format === "png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("图片导出失败，请重试。")), mime, .95));
    signal.throwIfAborted();
    if (blob.size > PRIVATE_IMAGE_UPLOAD_MAX_BYTES) throw new Error(format === "png" ? "图片超过 20 MB，可选择 JPEG 后重试。" : "图片超过 20 MB，暂时无法保存。");
    const basename = name.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]+/g, "_").trim() || "GoodGood图片";
    return new File([blob], `${basename}_调色.${format === "png" ? "png" : "jpg"}`, { type: mime });
  } finally { canvas.width = 0; canvas.height = 0; }
}
