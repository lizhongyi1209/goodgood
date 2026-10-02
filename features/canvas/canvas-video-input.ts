import { goodGoodApiFetch } from "@/features/auth/http-auth-boundary";

function videoEvent(video: HTMLVideoElement, event: "loadeddata" | "seeked", signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); video.removeEventListener(event, ready); video.removeEventListener("error", failed); signal.removeEventListener("abort", aborted); };
    const ready = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error("视频无法读取，请重新连接素材。")); };
    const aborted = () => { cleanup(); reject(signal.reason); };
    const timer = setTimeout(failed, 15_000);
    video.addEventListener(event, ready, { once: true });
    video.addEventListener("error", failed, { once: true });
    signal.addEventListener("abort", aborted, { once: true });
    if (signal.aborted) aborted();
  });
}

/** Reuses the existing private video read. Never uploads frames or creates reference assets. */
export async function canvasVideoFrames(url: string, signal: AbortSignal) {
  const response = await goodGoodApiFetch(url, { signal });
  if (!response.ok || Number(response.headers.get("content-length") ?? 0) > 20 * 1024 * 1024) throw new Error("视频暂时无法读取，请重试。");
  const blob = await response.blob();
  if (!blob.size || blob.size > 20 * 1024 * 1024) throw new Error("视频超过 20MB，请使用较短的视频。");
  signal.throwIfAborted();
  const objectUrl = URL.createObjectURL(blob);
  const video = document.createElement("video");
  video.muted = true; video.playsInline = true; video.preload = "auto";
  try {
    const loaded = videoEvent(video, "loadeddata", signal);
    video.src = objectUrl; video.load();
    await loaded;
    if (!Number.isFinite(video.duration) || video.duration <= 0 || !video.videoWidth || !video.videoHeight) throw new Error("视频内容无法解码。");
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 768 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("无法提取视频画面。");
    const count = Math.min(6, Math.max(1, Math.ceil(video.duration)));
    const frames: string[] = [];
    for (let index = 0; index < count; index += 1) {
      signal.throwIfAborted();
      const time = count === 1 ? 0 : Math.max(0, video.duration - 0.05) * index / (count - 1);
      if (Math.abs(video.currentTime - time) > 0.01) {
        const sought = videoEvent(video, "seeked", signal);
        video.currentTime = time;
        await sought;
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = canvas.toDataURL("image/jpeg", 0.75);
      if (frame.length > 500_000) throw new Error("视频画面过大，请缩小视频后重试。");
      frames.push(frame);
    }
    return frames;
  } finally { video.removeAttribute("src"); video.load(); URL.revokeObjectURL(objectUrl); }
}
