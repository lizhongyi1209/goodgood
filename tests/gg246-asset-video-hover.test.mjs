import assert from "node:assert/strict";
import test from "node:test";
import { attachAssetVideoHoverPlayback } from "../features/assets/asset-video-hover-playback.mjs";

class TrackedTarget extends EventTarget {
  listeners = new Map();
  addEventListener(type, listener) {
    super.addEventListener(type, listener);
    this.listeners.set(type, (this.listeners.get(type) ?? 0) + 1);
  }
  removeEventListener(type, listener) {
    super.removeEventListener(type, listener);
    this.listeners.set(type, (this.listeners.get(type) ?? 0) - 1);
  }
  fire(type, pointerType) {
    const event = new Event(type);
    if (pointerType) Object.defineProperty(event, "pointerType", { value: pointerType });
    this.dispatchEvent(event);
  }
}

class FakeVideo extends TrackedTarget {
  paused = true;
  requests = [];
  pauseCount = 0;
  throwOnPlay = false;
  play() {
    if (this.throwOnPlay) throw new Error("Playback blocked");
    return new Promise((resolve, reject) => this.requests.push({ resolve, reject }));
  }
  pause() {
    this.pauseCount += 1;
    const wasPlaying = !this.paused;
    this.paused = true;
    if (wasPlaying) this.fire("pause");
  }
  start() { this.paused = false; this.fire("playing"); }
}

function fixture({ enabled = true, reducedMotion = false } = {}) {
  const surface = new TrackedTarget();
  const video = new FakeVideo();
  const motion = new TrackedTarget();
  motion.matches = reducedMotion;
  const documentTarget = new TrackedTarget();
  documentTarget.visibilityState = "visible";
  const states = [];
  let intersect;
  let disconnected = false;
  const controller = attachAssetVideoHoverPlayback({
    surface, video, motion, documentTarget, onPlayingChange: (value) => states.push(value),
    createObserver(callback) {
      intersect = (visible) => callback([{ isIntersecting: visible }]);
      return { observe(target) { assert.equal(target, video); }, disconnect() { disconnected = true; } };
    },
  });
  controller.setEnabled(enabled);
  return {
    surface, video, motion, documentTarget, states, controller,
    intersect: (value) => intersect(value),
    enter: (pointer = "mouse") => surface.fire("pointerenter", pointer),
    leave: () => surface.fire("pointerleave", "mouse"),
    shownPlaying: () => states.at(-1) ?? false,
    isDisconnected: () => disconnected,
  };
}

const settle = async () => { await Promise.resolve(); await Promise.resolve(); };

test("GG-246 visibility, media readiness, keyboard focus and non-mouse pointers keep default preview paused", () => {
  const f = fixture();
  f.intersect(true);
  f.video.fire("canplay");
  f.surface.fire("focus");
  f.enter("touch");
  f.enter("pen");
  assert.equal(f.video.requests.length, 0);
  assert.equal(f.video.paused, true);
  assert.equal(f.shownPlaying(), false);
  f.controller.dispose();
});

test("GG-246 mouse hover requests playback only when the tile is visible and hides the icon on playing", async () => {
  const f = fixture();
  f.enter();
  assert.equal(f.video.requests.length, 0);
  f.intersect(true);
  assert.equal(f.video.requests.length, 1);
  assert.equal(f.shownPlaying(), false);
  f.video.requests[0].resolve();
  await settle();
  assert.equal(f.shownPlaying(), false, "a fulfilled play request is not an actual playing event");
  f.video.start();
  assert.equal(f.shownPlaying(), true);
  f.leave();
  assert.equal(f.video.paused, true);
  assert.equal(f.shownPlaying(), false);
  f.controller.dispose();
});

test("GG-246 canplay while loading does not issue concurrent play requests or hide the icon", () => {
  const f = fixture();
  f.intersect(true);
  f.enter();
  f.video.fire("canplay");
  f.intersect(true);
  f.documentTarget.fire("visibilitychange");
  assert.equal(f.video.requests.length, 1);
  assert.equal(f.shownPlaying(), false);
  f.controller.dispose();
});

test("GG-246 waiting and stalled previews keep the icon until actual playback resumes", async () => {
  const f = fixture();
  f.intersect(true);
  f.enter();
  f.video.start();
  f.video.requests[0].resolve();
  await settle();
  f.video.fire("waiting");
  assert.equal(f.shownPlaying(), false);
  f.video.fire("canplay");
  assert.equal(f.video.requests.length, 1);
  f.video.start();
  assert.equal(f.shownPlaying(), true);
  f.video.fire("stalled");
  assert.equal(f.shownPlaying(), false);
  f.controller.dispose();
});

test("GG-246 leaving while play is pending prevents a late playing event and promise from reviving video", async () => {
  const f = fixture();
  f.intersect(true);
  f.enter();
  f.leave();
  f.video.start();
  assert.equal(f.video.paused, true);
  f.video.requests[0].resolve();
  await settle();
  assert.equal(f.video.paused, true);
  assert.equal(f.video.requests.length, 1);
  assert.deepEqual(f.states, []);
  f.controller.dispose();
});

test("GG-246 a fresh mouse entry waits for a cancelled request before starting one new request", async () => {
  const f = fixture();
  f.intersect(true);
  f.enter();
  f.leave();
  f.enter();
  f.video.fire("canplay");
  assert.equal(f.video.requests.length, 1);
  f.video.start();
  assert.equal(f.video.paused, true, "the cancelled attempt cannot count as new hover playback");
  f.video.requests[0].reject(new Error("Interrupted"));
  await settle();
  assert.equal(f.video.requests.length, 2);
  f.video.start();
  f.video.requests[1].resolve();
  await settle();
  assert.equal(f.shownPlaying(), true);
  f.controller.dispose();
});

test("GG-246 rejection keeps the icon and avoids a retry loop until a fresh mouse entry", async () => {
  const f = fixture();
  f.intersect(true);
  f.enter();
  f.video.requests[0].reject(new Error("Browser denied playback"));
  await settle();
  assert.equal(f.video.paused, true);
  assert.equal(f.shownPlaying(), false);
  f.video.start();
  assert.equal(f.video.paused, true, "late playing after rejection remains paused");
  assert.equal(f.shownPlaying(), false);
  f.video.fire("canplay");
  f.intersect(true);
  assert.equal(f.video.requests.length, 1);
  f.leave();
  f.enter();
  assert.equal(f.video.requests.length, 2);
  f.controller.dispose();
});

test("GG-246 synchronous play errors and decode errors retain the paused affordance", () => {
  const f = fixture();
  f.video.throwOnPlay = true;
  f.intersect(true);
  assert.doesNotThrow(() => f.enter());
  assert.equal(f.shownPlaying(), false);
  f.video.throwOnPlay = false;
  f.leave();
  f.enter();
  f.video.start();
  f.video.fire("error");
  assert.equal(f.video.paused, true);
  assert.equal(f.shownPlaying(), false);
  f.controller.dispose();
});

test("GG-246 offscreen, page hidden and reduced motion pause preview and reject late playback", async () => {
  for (const stop of [
    (f) => f.intersect(false),
    (f) => { f.documentTarget.visibilityState = "hidden"; f.documentTarget.fire("visibilitychange"); },
    (f) => { f.motion.matches = true; f.motion.fire("change"); },
  ]) {
    const f = fixture();
    f.intersect(true);
    f.enter();
    f.video.start();
    stop(f);
    assert.equal(f.video.paused, true);
    assert.equal(f.shownPlaying(), false);
    f.video.start();
    f.video.requests[0].resolve();
    await settle();
    assert.equal(f.video.paused, true);
    assert.equal(f.video.requests.length, 1);
    f.controller.dispose();
  }
});

test("GG-246 reduced motion and disabled tiles reject mouse playback intent", async () => {
  const motion = fixture({ reducedMotion: true });
  motion.intersect(true);
  motion.enter();
  motion.video.fire("canplay");
  assert.equal(motion.video.requests.length, 0);
  motion.controller.dispose();

  const f = fixture({ enabled: false });
  f.intersect(true);
  f.enter();
  f.controller.setEnabled(true);
  assert.equal(f.video.requests.length, 0, "disabled entry does not become later playback intent");
  f.enter();
  f.video.start();
  f.controller.setEnabled(false);
  f.controller.setEnabled(true);
  f.video.requests[0].resolve();
  await settle();
  assert.equal(f.video.paused, true);
  assert.equal(f.video.requests.length, 1, "re-enabling requires a fresh mouse entry");
  f.controller.dispose();
});

test("GG-246 disposal disconnects every listener, pauses media and contains delayed playback", async () => {
  const f = fixture();
  f.intersect(true);
  f.enter();
  f.video.start();
  f.controller.dispose();
  assert.equal(f.video.paused, true);
  assert.equal(f.isDisconnected(), true);
  for (const target of [f.surface, f.video, f.motion, f.documentTarget]) {
    assert.ok([...target.listeners.values()].every((count) => count === 0));
  }
  const statesAfterDispose = [...f.states];
  f.video.start();
  f.enter();
  f.intersect(true);
  f.video.requests[0].resolve();
  await settle();
  assert.equal(f.video.paused, true);
  assert.equal(f.video.requests.length, 1);
  assert.deepEqual(f.states, statesAfterDispose);
  assert.doesNotThrow(() => f.controller.dispose());
});
