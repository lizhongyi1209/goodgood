"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { advanceCanvasVideoGenerationProgress, type CanvasVideoProgressInput } from "./canvas-video-generation-progress.mjs";
import styles from "./canvas-video-generator-node.module.css";

export function CanvasVideoGenerationProgress({ attemptKey, state, progress }: Readonly<CanvasVideoProgressInput>) {
  const [frame, setFrame] = useState(() => advanceCanvasVideoGenerationProgress(null, { attemptKey, state, progress }));
  const display = advanceCanvasVideoGenerationProgress(frame, { attemptKey, state, progress });
  const estimated = display?.estimated ?? false;

  useEffect(() => {
    const input = { attemptKey, state, progress };
    setFrame((current) => advanceCanvasVideoGenerationProgress(current, input));
    if (!display || !estimated) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;
    let previousTick = performance.now();
    const sync = () => {
      window.clearInterval(timer);
      timer = undefined;
      previousTick = performance.now();
      if (document.visibilityState !== "visible" || reducedMotion.matches) return;
      timer = window.setInterval(() => {
        const now = performance.now();
        const elapsed = now - previousTick;
        previousTick = now;
        setFrame((current) => advanceCanvasVideoGenerationProgress(current, input, elapsed));
      }, 2000);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    reducedMotion.addEventListener("change", sync);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
      reducedMotion.removeEventListener("change", sync);
    };
    // The current phase/report owns this clock, not each simulated frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptKey, state, progress, estimated]);

  if (!display) return null;
  const percentage = Math.round(display.value);
  return <>
    <LoaderCircle size={22} className={styles.spinner} aria-hidden="true" />
    <span className={styles.progressLabel}>
      <span>生成中</span>
      {!estimated && <span className={styles.progressValue}>{percentage}%</span>}
    </span>
    <div className={styles.progressTrack} role="progressbar" aria-label="视频生成进度"
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={!estimated ? percentage : undefined}
      aria-valuetext={!estimated ? `生成中，${percentage}%` : "生成中，预计进度"}
      title={estimated ? "预计进度" : undefined}>
      <span className={styles.progressFill} style={{ transform: `scaleX(${display.value / 100})` }} />
    </div>
  </>;
}
