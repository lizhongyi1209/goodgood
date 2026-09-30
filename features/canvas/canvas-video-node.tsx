"use client";

import { useEffect, useRef, useState } from "react";
import { useReactFlow, type NodeProps } from "@xyflow/react";
import { Play } from "lucide-react";

import { CanvasMediaMetadata } from "./canvas-media-metadata";
import { CanvasImageResizeControls } from "./canvas-image-resize-controls";
import { fittedCanvasVideoSize, videoFrameMatches } from "./canvas-video-size";
import type { CanvasNode, CanvasVideoNode as CanvasVideoNodeType } from "./canvas-workspace";
import styles from "./canvas-workspace.module.css";

export type CanvasVideoNodeData = Record<string, unknown> & {
  name: string;
  previewUrl: string;
  uploadState?: "uploading" | "failed";
  uploadError?: string;
  onRetryUpload?: () => void;
  onPreviewReady?: () => void;
  assetId?: string;
  onRefreshSource?: () => Promise<boolean>;
  localPreviewUrl?: string;
  videoSized?: boolean;
  pixelWidth?: number;
  pixelHeight?: number;
  durationSeconds?: number;
};

function formatDuration(seconds?: number) {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return "--:--";
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const tail = String(whole % 60).padStart(2, "0");
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}:${tail}`
    : `${String(minutes).padStart(2, "0")}:${tail}`;
}

export function CanvasVideoNode({ id, data, selected, width }: NodeProps<CanvasVideoNodeType>) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const refreshAttemptedRef = useRef(false);
  const [hovering, setHovering] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failureState, setFailureState] = useState({
    url: data.previewUrl,
    videoFailed: false,
    localPreviewFailed: false,
  });
  const failures = failureState.url === data.previewUrl
    ? failureState
    : { url: data.previewUrl, videoFailed: false, localPreviewFailed: false };
  const { videoFailed, localPreviewFailed } = failures;
  const updateFailures = (patch: Partial<Pick<typeof failures, "videoFailed" | "localPreviewFailed">>) => {
    setFailureState((current) => ({
      ...(current.url === data.previewUrl
        ? current
        : { url: data.previewUrl, videoFailed: false, localPreviewFailed: false }),
      ...patch,
    }));
  };
  const { updateNode } = useReactFlow<CanvasNode>();
  const tiny = width !== undefined && width < 80;
  const localFallback = videoFailed && !localPreviewFailed ? data.localPreviewUrl : undefined;
  const videoUnavailable = videoFailed && !localFallback;

  useEffect(() => { refreshAttemptedRef.current = false; }, [data.assetId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoUnavailable) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPlayback = () => {
      if (hovering && data.uploadState !== "uploading" && document.visibilityState === "visible" && !reducedMotion.matches) {
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    };
    syncPlayback();
    video.addEventListener("canplay", syncPlayback);
    reducedMotion.addEventListener("change", syncPlayback);
    document.addEventListener("visibilitychange", syncPlayback);
    return () => {
      video.removeEventListener("canplay", syncPlayback);
      reducedMotion.removeEventListener("change", syncPlayback);
      document.removeEventListener("visibilitychange", syncPlayback);
      video.pause();
    };
  }, [hovering, videoUnavailable, data.previewUrl, data.uploadState, localFallback]);

  return (
    <>
      <CanvasMediaMetadata kind="video" name={data.name} nodeWidth={width} pixelWidth={data.pixelWidth} pixelHeight={data.pixelHeight} />
      <article
        className={`${styles.videoNode} ${data.videoSized ? styles.videoNodeReady : ""} ${playing ? styles.videoPreviewing : ""} ${tiny ? styles.videoNodeTiny : ""} ${data.uploadState === "uploading" ? styles.mediaUploading : ""}`}
        aria-label={`视频 ${data.name}`}
        aria-busy={data.uploadState === "uploading" || undefined}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onClick={(event) => {
          if (event.nativeEvent instanceof PointerEvent && event.nativeEvent.pointerType === "touch" && playing) videoRef.current?.pause();
        }}
      >
        {videoUnavailable
          ? <div className={styles.sourceFailure} role="alert">视频无法预览，请换一个 MP4 文件。</div>
          : <>
              <video
                ref={videoRef}
                src={localFallback ?? data.previewUrl}
                className={styles.videoElement}
                muted
                playsInline
                loop
                preload="metadata"
                aria-label={`视频预览 ${data.name}`}
                onLoadedMetadata={(event) => {
                  const video = event.currentTarget;
                  if (data.assetId && video.currentSrc === new URL(data.previewUrl, window.location.href).href) {
                    refreshAttemptedRef.current = false;
                    data.onPreviewReady?.();
                  }
                  const pixelWidth = video.videoWidth;
                  const pixelHeight = video.videoHeight;
                  const durationSeconds = Number.isFinite(video.duration) ? video.duration : undefined;
                  const size = fittedCanvasVideoSize(undefined, pixelWidth, pixelHeight);
                  if (!size) { updateFailures({ videoFailed: true }); return; }
                  updateNode(id, (node) => {
                    if (node.type !== "sourceVideo") return {};
                    const currentSize = {
                      width: Number(node.style?.width ?? node.width),
                      height: Number(node.style?.height ?? node.height),
                    };
                    const frameMatches = videoFrameMatches(currentSize, pixelWidth, pixelHeight);
                    if (node.data.videoSized && frameMatches && node.data.pixelWidth === pixelWidth && node.data.pixelHeight === pixelHeight && node.data.durationSeconds === durationSeconds) return {};
                    const fittedSize = fittedCanvasVideoSize(currentSize, pixelWidth, pixelHeight) ?? size;
                    return {
                      ...(!frameMatches ? { style: { ...node.style, ...fittedSize } } : {}),
                      data: { ...node.data, videoSized: true, pixelWidth, pixelHeight, durationSeconds },
                    };
                  });
                  if (durationSeconds && durationSeconds > 0.05) {
                    try { video.currentTime = Math.min(0.05, durationSeconds / 2); } catch { /* Keep the first available frame. */ }
                  }
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onError={() => {
                  if (localFallback) { updateFailures({ localPreviewFailed: true }); return; }
                  if (!refreshAttemptedRef.current && data.onRefreshSource) {
                    refreshAttemptedRef.current = true;
                    void data.onRefreshSource().then((refreshed) => { if (!refreshed) updateFailures({ videoFailed: true }); });
                  } else updateFailures({ videoFailed: true });
                }}
              />
              {!playing && <button
                type="button"
                className={`${styles.videoPlay} nodrag nopan`}
                aria-label={`播放 ${data.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  void videoRef.current?.play().catch(() => {});
                }}
              ><Play size={20} fill="currentColor" aria-hidden="true" /></button>}
              <span className={styles.videoDuration}>{formatDuration(data.durationSeconds)}</span>
            </>}
        {data.assetId && videoFailed && <div className={`${styles.mediaUploadFailure} nodrag nopan`} role="alert">
          <span>视频已上传，预览暂不可用。</span>
          <button type="button" onClick={(event) => {
            event.stopPropagation();
            void (data.onRefreshSource?.() ?? Promise.resolve(false)).finally(() => {
              refreshAttemptedRef.current = false;
              updateFailures({ videoFailed: false, localPreviewFailed: false });
            });
          }}>重试预览</button>
        </div>}
        {data.uploadState === "failed" && <div className={`${styles.mediaUploadFailure} nodrag nopan`} role="alert">
          <span title={data.uploadError}>{data.uploadError ?? "视频上传失败。"}</span>
          <button type="button" onClick={(event) => { event.stopPropagation(); data.onRetryUpload?.(); }}>重试</button>
        </div>}
      </article>
      {selected && data.videoSized && !videoUnavailable && <CanvasImageResizeControls />}
    </>
  );
}
