import test from "node:test";
import assert from "node:assert/strict";
import { advanceCanvasVideoGenerationProgress as advance } from "../features/canvas/canvas-video-generation-progress.mjs";

const status = (state, progress = null, attemptKey = "owner:page:request-1") => ({ attemptKey, state, progress });

test("unreported waiting progresses conservatively without declaring a real percentage or finishing", () => {
  let frame = advance(null, status("queued"));
  for (const [state, cap] of [["queued", 14], ["submitting", 22], ["running", 90], ["saving", 99]]) {
    const previous = frame.value;
    frame = advance(frame, status(state));
    assert.ok(frame.value >= previous);
    const initial = frame.value;
    frame = advance(frame, status(state), 60_000);
    assert.ok(frame.value > initial);
    assert.ok(frame.value <= cap);
    frame = advance(frame, status(state), 86_400_000);
    assert.ok(frame.value <= cap);
    assert.ok(frame.value < 100);
    assert.equal(frame.reported, null);
  }
});

test("reported progress takes authority, stays stable when omitted, and ignores older lower reports", () => {
  let frame = advance(null, status("running"));
  frame = advance(frame, status("running"), 600_000);
  assert.ok(frame.value > 80);
  frame = advance(frame, status("running", 36));
  assert.equal(frame.value, 36);
  assert.equal(frame.reported, 36);
  frame = advance(frame, status("running"), 600_000);
  assert.equal(frame.value, 36);
  frame = advance(frame, status("running", 24));
  assert.equal(frame.value, 36);
  frame = advance(frame, status("running", 72));
  assert.equal(frame.value, 72);
  frame = advance(frame, status("saving"));
  assert.equal(frame.value, 72);
  assert.equal(frame.reported, 72);
});

test("a reported zero is real and upstream 100 cannot imply delivery before success", () => {
  let frame = advance(null, status("running", 0));
  frame = advance(frame, status("running"), 600_000);
  assert.equal(frame.value, 0);
  assert.equal(frame.reported, 0);
  frame = advance(frame, status("saving", 100));
  assert.equal(frame.value, 99);
  frame = advance(frame, status("succeeded"));
  assert.equal(frame.value, 100);
});

test("concurrent tasks, another page and retries start with their own progress and leave old frames intact", () => {
  const previous = Object.freeze(advance(null, status("running", 73)));
  for (const attemptKey of ["owner:page:request-2", "owner:other-page:request-1", "other-owner:page:request-1", "owner:page:retry-1"]) {
    const frame = advance(previous, status("queued", null, attemptKey), 600_000);
    assert.equal(frame.reported, null);
    assert.ok(frame.value <= 14);
    assert.equal(frame.elapsedMs, 0);
    assert.equal(frame.attemptKey, attemptKey);
  }
  assert.equal(previous.value, 73);
  assert.equal(previous.reported, 73);
});

test("missing attempts and failure or ambiguous states do not simulate success", () => {
  const previous = advance(null, status("saving", 99));
  assert.equal(advance(null, status("queued", null, "")), null);
  for (const state of ["failed", "save_failed", "submission_unknown"]) {
    assert.equal(advance(previous, status(state, 100), 600_000), null);
  }
  for (const progress of [Number.NaN, Number.POSITIVE_INFINITY, -1, 101, "50"]) {
    const frame = advance(null, status("running", progress));
    assert.equal(frame.reported, null);
    assert.ok(Number.isFinite(frame.value));
    assert.ok(frame.value < 100);
  }
  const frame = advance(null, status("running"));
  for (const elapsed of [Number.NaN, Number.POSITIVE_INFINITY, -2000]) {
    const next = advance(frame, status("running"), elapsed);
    assert.equal(next.value, frame.value);
    assert.equal(next.elapsedMs, 0);
  }
});
