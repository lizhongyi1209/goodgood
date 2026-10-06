"use client";

import { useEffect, useRef, useState, type ReactEventHandler } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { attachCanvasVideoPreviewPlayback } from "./canvas-video-preview-playback.mjs";
import styles from "./canvas-video-result-player.module.css";

function formatTime(value: number) {
  const seconds = Math.floor(Number.isFinite(value) ? Math.max(0, value) : 0);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function CanvasVideoResultPlayer({ url, label, canvas = false, className, scopeKey, suspended = false,
  onError, onLoadedMetadata }: Readonly<{
  url: string; label: string; canvas?: boolean; className?: string; scopeKey?: string; suspended?: boolean;
  onError?: ReactEventHandler<HTMLVideoElement>; onLoadedMetadata?: ReactEventHandler<HTMLVideoElement>;
}>) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<ReturnType<typeof attachCanvasVideoPreviewPlayback> | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const playback = attachCanvasVideoPreviewPlayback(video, {
      page: document, reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)"), manualOnly: true,
    });
    playbackRef.current = playback;
    playback.setEnabled(!suspended);
    return () => { playbackRef.current = null; playback.dispose(); };
  }, [url, scopeKey, suspended]);

  const updatePosition = () => {
    const value = videoRef.current?.currentTime;
    setPosition(value !== undefined && Number.isFinite(value) ? Math.max(0, value) : 0);
  };
  const seek = (value: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(value) || duration <= 0) return;
    try { video.currentTime = Math.max(0, Math.min(duration, value)); updatePosition(); }
    catch { /* The source may have become unavailable while scrubbing. */ }
  };
  return <div className={`${styles.player} ${canvas ? styles.canvas : ""}`} data-playing={playing || undefined}>
    <video ref={videoRef} src={url} className={`${styles.video} ${className ?? ""}`}
      controls={false} disablePictureInPicture disableRemotePlayback muted={muted} playsInline preload="metadata" aria-label={label}
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
      onEnded={() => { playbackRef.current?.pause(); setPlaying(false); updatePosition(); }}
      onTimeUpdate={updatePosition} onSeeked={updatePosition} onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
      onLoadedMetadata={(event) => {
        const value = event.currentTarget.duration;
        setDuration(Number.isFinite(value) && value > 0 ? value : 0);
        updatePosition(); onLoadedMetadata?.(event);
      }} onDurationChange={(event) => {
        const value = event.currentTarget.duration;
        setDuration(Number.isFinite(value) && value > 0 ? value : 0);
      }} onError={(event) => { playbackRef.current?.pause(); onError?.(event); }} />
    <div className={`${styles.controls} nodrag nopan nowheel`} role="group" aria-label="视频播放控制"
      onPointerDown={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}>
      <button type="button" disabled={suspended} aria-label={playing ? "暂停视频" : "播放视频"}
        title={playing ? "暂停" : "播放"} onClick={() => {
          if (playing) playbackRef.current?.pause(); else playbackRef.current?.play();
        }}>{playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}</button>
      <input className={styles.seek} type="range" min={0} max={duration || 1} step={0.01}
        value={Math.min(position, duration || 0)} disabled={suspended || duration <= 0} aria-label="视频播放进度"
        aria-valuetext={`${formatTime(position)}，共 ${formatTime(duration)}`} onChange={(event) => seek(Number(event.currentTarget.value))} />
      <span className={styles.time}>{formatTime(position)} / {formatTime(duration)}</span>
      <button type="button" disabled={suspended} aria-label={muted ? "开启声音" : "静音"} title={muted ? "开启声音" : "静音"}
        aria-pressed={!muted} onClick={() => { const video = videoRef.current; if (video) video.muted = !video.muted; }}>
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </button>
    </div>
  </div>;
}
