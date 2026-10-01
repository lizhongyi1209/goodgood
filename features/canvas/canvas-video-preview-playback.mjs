// Keep media playback tied to its current surface, including pending play() calls.
export function attachCanvasVideoPreviewPlayback(video, { page, reducedMotion }) {
  let hovering = false;
  let enabled = true;
  let explicit = false;
  let pausedByUser = false;
  let rejected = false;
  let disposed = false;
  let epoch = 0;
  let pending = null;

  const shouldPlay = () => !disposed && enabled && !rejected && page.visibilityState === "visible"
    && (explicit || (hovering && !pausedByUser && !reducedMotion.matches));

  const sync = () => {
    if (!shouldPlay()) {
      epoch += 1;
      pending = null;
      video.pause();
      return;
    }
    if (pending !== null || !video.paused) return;
    const request = ++epoch;
    pending = request;
    const failed = () => {
      if (disposed || request !== epoch) return;
      pending = null;
      explicit = false;
      rejected = true;
      video.pause();
    };
    try {
      Promise.resolve(video.play()).then(() => {
        if (pending === request) pending = null;
        // A play request can settle after leaving, disabling or unmounting.
        if (!shouldPlay()) video.pause();
      }, failed);
    } catch {
      failed();
    }
  };
  const visible = () => {
    if (page.visibilityState !== "visible") explicit = false;
    sync();
  };
  const started = () => { if (!shouldPlay()) video.pause(); };

  video.addEventListener("canplay", sync);
  video.addEventListener("play", started);
  page.addEventListener("visibilitychange", visible);
  reducedMotion.addEventListener("change", sync);

  return {
    setHovering(value) {
      if (disposed) return;
      if (value && !hovering) { pausedByUser = false; rejected = false; }
      hovering = value;
      if (!value) explicit = false;
      sync();
    },
    setEnabled(value) {
      if (disposed) return;
      enabled = value;
      if (!value) explicit = false;
      sync();
    },
    play() {
      if (disposed || !enabled || page.visibilityState !== "visible") return;
      explicit = true;
      pausedByUser = false;
      rejected = false;
      sync();
    },
    pause() {
      if (disposed) return;
      explicit = false;
      pausedByUser = true;
      sync();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      video.removeEventListener("canplay", sync);
      video.removeEventListener("play", started);
      page.removeEventListener("visibilitychange", visible);
      reducedMotion.removeEventListener("change", sync);
      sync();
    },
  };
}
