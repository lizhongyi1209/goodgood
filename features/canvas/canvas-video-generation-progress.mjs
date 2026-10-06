const phases = Object.freeze({
  queued: { start: 3, cap: 14, pace: 45_000 },
  submitting: { start: 14, cap: 22, pace: 30_000 },
  running: { start: 22, cap: 90, pace: 150_000 },
  saving: { start: 96, cap: 99, pace: 45_000 },
});

// This is presentation state only; never write it into a job or a saved canvas.
export function advanceCanvasVideoGenerationProgress(previous, input, elapsedMs = 0) {
  if (!input.attemptKey) return null;
  if (input.state === "succeeded") {
    return { attemptKey: input.attemptKey, state: input.state, value: 100,
      reported: 100, elapsedMs: 0, startValue: 100 };
  }
  const phase = phases[input.state];
  if (!phase) return null;
  const prior = previous?.attemptKey === input.attemptKey ? previous : null;
  const samePhase = prior?.state === input.state;
  const delta = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const elapsed = Math.min(86_400_000, samePhase ? prior.elapsedMs + delta : 0);
  const startValue = samePhase ? prior.startValue : Math.max(phase.start, prior?.value ?? 0);
  const reported = typeof input.progress === "number" && Number.isFinite(input.progress)
    && input.progress >= 0 && input.progress <= 100
    ? Math.max(prior?.reported ?? 0, input.progress)
    : prior?.reported ?? null;
  const estimated = startValue + Math.max(0, phase.cap - startValue) * (1 - Math.exp(-elapsed / phase.pace));
  const value = reported !== null ? Math.min(99, reported)
    : Math.min(99, Math.max(prior?.value ?? 0, estimated));
  return { attemptKey: input.attemptKey, state: input.state, value, reported,
    elapsedMs: elapsed, startValue };
}
