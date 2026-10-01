/** Bind a silent tile preview to real mouse hover, not merely viewport visibility. */
export function attachAssetVideoHoverPlayback({ surface, video, motion, documentTarget, createObserver, onPlayingChange }) {
  let enabled = false;
  let hovered = false;
  let visible = false;
  let disposed = false;
  let playing = false;
  let failed = false;
  let pending = null;

  const mayPlay = () => !disposed && enabled && hovered && visible &&
    documentTarget.visibilityState === "visible" && !motion.matches;
  const reportPlaying = (value) => {
    if (disposed || playing === value) return;
    playing = value;
    onPlayingChange(value);
  };
  const pause = () => {
    if (pending) pending.cancelled = true;
    video.pause();
    reportPlaying(false);
  };
  const syncPlayback = () => {
    if (disposed) return;
    if (!mayPlay()) { pause(); return; }
    if (failed || pending || !video.paused) return;
    const attempt = { cancelled: false };
    pending = attempt;
    const finish = (rejected) => {
      if (pending === attempt) pending = null;
      if (disposed || attempt.cancelled || !mayPlay()) {
        pause();
        // A later mouse entry may be waiting for this old request to settle.
        if (!disposed && mayPlay()) syncPlayback();
      } else if (rejected) {
        failed = true;
        pause();
      }
    };
    try {
      void Promise.resolve(video.play()).then(() => finish(false), () => finish(true));
    } catch {
      finish(true);
    }
  };
  const enter = (event) => {
    if (disposed || !enabled || event.pointerType !== "mouse") return;
    hovered = true;
    failed = false;
    syncPlayback();
  };
  const leave = (event) => {
    if (event.pointerType !== "mouse") return;
    hovered = false;
    syncPlayback();
  };
  const onPlaying = () => {
    if (!mayPlay() || failed || pending?.cancelled) { pause(); return; }
    reportPlaying(true);
  };
  const onStopped = () => reportPlaying(false);
  const onError = () => { failed = true; pause(); };
  const bindings = [
    [surface, "pointerenter", enter],
    [surface, "pointerleave", leave],
    [surface, "pointercancel", leave],
    [motion, "change", syncPlayback],
    [documentTarget, "visibilitychange", syncPlayback],
    [video, "canplay", syncPlayback],
    [video, "playing", onPlaying],
    [video, "pause", onStopped],
    [video, "waiting", onStopped],
    [video, "stalled", onStopped],
    [video, "emptied", onStopped],
    [video, "error", onError],
  ];
  bindings.forEach(([target, event, listener]) => target.addEventListener(event, listener));
  const observer = createObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    syncPlayback();
  }, { threshold: 0.1 });
  observer.observe(video);
  pause();

  return {
    setEnabled(value) {
      if (disposed) return;
      enabled = Boolean(value);
      if (!enabled) hovered = false;
      syncPlayback();
    },
    dispose() {
      if (disposed) return;
      observer.disconnect();
      bindings.forEach(([target, event, listener]) => target.removeEventListener(event, listener));
      pause();
      disposed = true;
    },
  };
}
