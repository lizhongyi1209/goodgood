import test from "node:test";
import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { attachCanvasVideoPreviewPlayback } from "../features/canvas/canvas-video-preview-playback.mjs";

class PreviewVideo extends EventTarget {
  paused = true;
  playCalls = 0;
  pauseCalls = 0;
  playResult = () => Promise.resolve();

  play() {
    this.playCalls += 1;
    return this.playResult().then(() => {
      this.paused = false;
      this.dispatchEvent(new Event("play"));
    });
  }

  pause() { this.pauseCalls += 1; this.paused = true; }
}

function surface({ reduced = false, visibility = "visible", manualOnly = false } = {}) {
  const page = Object.assign(new EventTarget(), { visibilityState: visibility });
  const reducedMotion = Object.assign(new EventTarget(), { matches: reduced });
  const video = new PreviewVideo();
  const playback = attachCanvasVideoPreviewPlayback(video, { page, reducedMotion, manualOnly });
  return { page, reducedMotion, video, playback };
}

test("hover starts playback, leaving pauses, and canplay does not duplicate a request", async () => {
  const { video, playback } = surface();
  assert.equal(video.playCalls, 0);
  playback.setHovering(true);
  video.dispatchEvent(new Event("canplay"));
  assert.equal(video.playCalls, 1);
  await setImmediate();
  assert.equal(video.paused, false);
  playback.setHovering(false);
  assert.equal(video.paused, true);
  video.dispatchEvent(new Event("canplay"));
  assert.equal(video.playCalls, 1);
  playback.dispose();
});

test("page visibility pauses hover and resumes only while the surface is still hovered", async () => {
  const { video, playback, page } = surface();
  playback.setHovering(true);
  await setImmediate();
  page.visibilityState = "hidden";
  page.dispatchEvent(new Event("visibilitychange"));
  assert.equal(video.paused, true);
  page.visibilityState = "visible";
  page.dispatchEvent(new Event("visibilitychange"));
  await setImmediate();
  assert.equal(video.playCalls, 2);
  assert.equal(video.paused, false);
  playback.setHovering(false);
  page.visibilityState = "hidden";
  page.dispatchEvent(new Event("visibilitychange"));
  page.visibilityState = "visible";
  page.dispatchEvent(new Event("visibilitychange"));
  assert.equal(video.playCalls, 2);
  playback.dispose();
});

test("reduced motion blocks automatic playback but preserves an explicit play action", async () => {
  const { video, playback, reducedMotion } = surface({ reduced: true });
  playback.setHovering(true);
  video.dispatchEvent(new Event("canplay"));
  assert.equal(video.playCalls, 0);
  playback.play();
  await setImmediate();
  assert.equal(video.paused, false);
  playback.setHovering(false);
  assert.equal(video.paused, true);
  reducedMotion.matches = false;
  reducedMotion.dispatchEvent(new Event("change"));
  assert.equal(video.playCalls, 1);
  playback.setHovering(true);
  await setImmediate();
  reducedMotion.matches = true;
  reducedMotion.dispatchEvent(new Event("change"));
  assert.equal(video.paused, true);
  playback.setEnabled(false);
  playback.play();
  playback.setEnabled(true);
  assert.equal(video.paused, true);
  assert.equal(video.playCalls, 2);
  playback.dispose();
});

test("explicit pause stays paused through canplay until a new hover or play action", async () => {
  const { video, playback } = surface();
  playback.setHovering(true);
  await setImmediate();
  playback.pause();
  video.dispatchEvent(new Event("canplay"));
  playback.setHovering(true);
  assert.equal(video.paused, true);
  assert.equal(video.playCalls, 1);
  playback.play();
  await setImmediate();
  assert.equal(video.playCalls, 2);
  playback.pause();
  playback.setHovering(false);
  playback.setHovering(true);
  await setImmediate();
  assert.equal(video.playCalls, 3);
  playback.dispose();
});

test("a dialog or edit disables the background surface and prevents explicit playback", async () => {
  const { video, playback } = surface();
  playback.setHovering(true);
  await setImmediate();
  playback.setEnabled(false);
  assert.equal(video.paused, true);
  playback.play();
  video.dispatchEvent(new Event("canplay"));
  assert.equal(video.playCalls, 1);
  playback.dispose();

  const inactive = surface();
  inactive.playback.setEnabled(false);
  inactive.playback.play();
  inactive.playback.setEnabled(true);
  inactive.video.dispatchEvent(new Event("canplay"));
  assert.equal(inactive.video.playCalls, 0);
  assert.equal(inactive.video.paused, true);
  inactive.playback.dispose();
});

test("a late play resolution after leaving is paused again", async () => {
  const { video, playback } = surface();
  let finish;
  video.playResult = () => new Promise((resolve) => { finish = resolve; });
  playback.setHovering(true);
  playback.setHovering(false);
  finish();
  await setImmediate();
  assert.equal(video.paused, true);
  assert.equal(video.playCalls, 1);
  playback.dispose();
});

test("a rejected play remains available for explicit retry without treating media as unreadable", async () => {
  const { video, playback } = surface();
  video.playResult = () => Promise.reject(new Error("Autoplay was denied"));
  playback.setHovering(true);
  await setImmediate();
  assert.equal(video.paused, true);
  video.dispatchEvent(new Event("canplay"));
  assert.equal(video.playCalls, 1);
  video.playResult = () => Promise.resolve();
  playback.play();
  await setImmediate();
  assert.equal(video.paused, false);
  assert.equal(video.playCalls, 2);
  playback.dispose();
});

test("synchronous play failure is contained and can be retried", async () => {
  const { video, playback } = surface();
  video.playResult = () => { throw new Error("Not ready"); };
  assert.doesNotThrow(() => playback.setHovering(true));
  assert.equal(video.paused, true);
  video.playResult = () => Promise.resolve();
  playback.play();
  await setImmediate();
  assert.equal(video.paused, false);
  playback.dispose();
});

test("source replacement and disposal stop the old surface, detach listeners, and ignore late play", async () => {
  const old = surface();
  let finish;
  old.video.playResult = () => new Promise((resolve) => { finish = resolve; });
  old.playback.setHovering(true);
  old.playback.dispose();
  const disposedPauses = old.video.pauseCalls;
  old.video.dispatchEvent(new Event("canplay"));
  old.page.dispatchEvent(new Event("visibilitychange"));
  old.reducedMotion.dispatchEvent(new Event("change"));
  old.playback.play();
  old.playback.setHovering(true);
  assert.equal(old.video.playCalls, 1);
  assert.equal(old.video.pauseCalls, disposedPauses);
  const current = surface();
  current.playback.setHovering(true);
  finish();
  await setImmediate();
  assert.equal(old.video.paused, true);
  assert.equal(current.video.paused, false);
  const pauses = old.video.pauseCalls;
  old.playback.dispose();
  assert.equal(old.video.pauseCalls, pauses);
  current.playback.dispose();
});

test("manual result playback ignores hover while preserving explicit playback and pause", async () => {
  const { video, playback } = surface({ manualOnly: true, reduced: true });
  playback.setHovering(true);
  video.dispatchEvent(new Event("canplay"));
  assert.equal(video.playCalls, 0);
  playback.play();
  await setImmediate();
  assert.equal(video.paused, false);
  playback.setHovering(false);
  assert.equal(video.paused, false);
  video.dispatchEvent(new Event("canplay"));
  assert.equal(video.playCalls, 1);
  playback.pause();
  playback.setHovering(true);
  video.dispatchEvent(new Event("canplay"));
  assert.equal(video.paused, true);
  assert.equal(video.playCalls, 1);
  playback.dispose();
});

test("manual result playback stays paused after hiding or closing a viewer", async () => {
  const { video, playback, page } = surface({ manualOnly: true });
  playback.play();
  await setImmediate();
  page.visibilityState = "hidden";
  page.dispatchEvent(new Event("visibilitychange"));
  assert.equal(video.paused, true);
  page.visibilityState = "visible";
  page.dispatchEvent(new Event("visibilitychange"));
  assert.equal(video.playCalls, 1);
  playback.play();
  await setImmediate();
  playback.setEnabled(false);
  playback.play();
  assert.equal(video.paused, true);
  playback.setEnabled(true);
  video.dispatchEvent(new Event("canplay"));
  assert.equal(video.playCalls, 2);
  assert.equal(video.paused, true);
  playback.dispose();
});

test("manual mode contains rejected and late plays without starting an automatic retry", async () => {
  const { video, playback } = surface({ manualOnly: true });
  video.playResult = () => Promise.reject(new Error("Not ready"));
  playback.play();
  await setImmediate();
  playback.setHovering(true);
  video.dispatchEvent(new Event("canplay"));
  assert.equal(video.playCalls, 1);
  assert.equal(video.paused, true);
  let finish;
  video.playResult = () => new Promise((resolve) => { finish = resolve; });
  playback.play();
  playback.dispose();
  finish();
  await setImmediate();
  assert.equal(video.playCalls, 2);
  assert.equal(video.paused, true);
});
