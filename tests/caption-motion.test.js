import test from "node:test";
import assert from "node:assert/strict";

import {
  CaptionMotion,
  advanceCaptionOffset,
  captionOffset,
} from "../tools/device-simulator/caption-motion.js";

function fakeCaption() {
  const properties = new Map();
  return {
    textContent: "",
    scrollWidth: 520,
    dataset: {},
    classList: {
      toggle: (name, enabled) => properties.set(`class:${name}`, enabled),
    },
    style: {
      setProperty: (name, value) => properties.set(name, value),
    },
    properties,
  };
}

function fakeFrames() {
  const pending = new Map();
  const cancelled = [];
  let nextFrame = 0;

  return {
    pending,
    cancelled,
    requestFrame(callback) {
      nextFrame += 1;
      pending.set(nextFrame, callback);
      return nextFrame;
    },
    cancelFrame(handle) {
      cancelled.push(handle);
      pending.delete(handle);
    },
    run(handle, timestamp) {
      const callback = pending.get(handle);
      assert.ok(callback, `frame ${handle} should be pending`);
      pending.delete(handle);
      callback(timestamp);
    },
    nextHandle() {
      return pending.keys().next().value;
    },
  };
}

test("caption offset keeps short text fixed and measures long overflow", () => {
  assert.equal(captionOffset(280, 320), 0);
  assert.equal(captionOffset(520, 320), 200);
  assert.equal(captionOffset(Number.NaN, 320), 0);
  assert.equal(captionOffset(100, -20), 100);
});

test("caption offset advances at one constant, clamped pixel rate", () => {
  assert.equal(advanceCaptionOffset(0, 200, 250, 100, 250), 25);
  assert.equal(advanceCaptionOffset(25, 200, 250, 100, 250), 50);
  assert.equal(advanceCaptionOffset(190, 200, 250, 100, 250), 200);
  assert.equal(advanceCaptionOffset(20, 200, 5_000, 60, 250), 20);
  assert.equal(advanceCaptionOffset(20, 200, -10, 60, 50), 20);
  assert.equal(advanceCaptionOffset(20, 200, Number.NaN, 60, 50), 20);
});

test("caption keeps a constant velocity when the target grows mid-scroll", () => {
  const caption = fakeCaption();
  const frames = fakeFrames();
  const motion = new CaptionMotion({
    caption,
    viewport: { clientWidth: 320 },
    speedPxPerSecond: 100,
    maxFrameDeltaMs: 250,
    requestFrame: (callback) => frames.requestFrame(callback),
    cancelFrame: (handle) => frames.cancelFrame(handle),
  });

  motion.render("A growing spoken caption");
  frames.run(frames.nextHandle(), 0);
  frames.run(frames.nextHandle(), 250);
  assert.equal(caption.properties.get("--caption-offset"), "-25px");

  caption.scrollWidth = 720;
  motion.render("A growing spoken caption with a much farther target");
  assert.equal(frames.pending.size, 1);
  frames.run(frames.nextHandle(), 500);
  assert.equal(caption.properties.get("--caption-offset"), "-50px");
  assert.equal(motion.targetOffset, 400);
});

test("caption lands exactly on its target and stops scheduling frames", () => {
  const caption = fakeCaption();
  caption.scrollWidth = 350;
  const frames = fakeFrames();
  const motion = new CaptionMotion({
    caption,
    viewport: { clientWidth: 320 },
    speedPxPerSecond: 100,
    maxFrameDeltaMs: 500,
    requestFrame: (callback) => frames.requestFrame(callback),
    cancelFrame: (handle) => frames.cancelFrame(handle),
  });

  motion.render("A slightly overflowing caption");
  frames.run(frames.nextHandle(), 0);
  frames.run(frames.nextHandle(), 500);

  assert.equal(caption.properties.get("--caption-offset"), "-30px");
  assert.equal(motion.lastTimestamp, null);
  assert.equal(frames.pending.size, 0);
});

test("caption reset cancels motion and rejects a stale frame", () => {
  const caption = fakeCaption();
  const frames = fakeFrames();
  const motion = new CaptionMotion({
    caption,
    viewport: { clientWidth: 320 },
    requestFrame: (callback) => frames.requestFrame(callback),
    cancelFrame: (handle) => frames.cancelFrame(handle),
  });

  motion.render("A growing spoken caption");
  const staleCallback = frames.pending.get(frames.nextHandle());
  motion.render("");

  assert.deepEqual(frames.cancelled, [1]);
  assert.equal(caption.dataset.motion, "idle");
  assert.equal(caption.textContent, "");
  assert.equal(caption.properties.get("--caption-offset"), "0px");

  staleCallback(1_000);
  assert.equal(caption.properties.get("--caption-offset"), "0px");
  assert.equal(frames.pending.size, 0);
});

test("caption freeze stops an interrupted response at its rendered position", () => {
  const caption = fakeCaption();
  const frames = fakeFrames();
  const motion = new CaptionMotion({
    caption,
    viewport: { clientWidth: 320 },
    speedPxPerSecond: 100,
    maxFrameDeltaMs: 250,
    requestFrame: (callback) => frames.requestFrame(callback),
    cancelFrame: (handle) => frames.cancelFrame(handle),
  });

  motion.render("A response that will be interrupted while it scrolls");
  frames.run(frames.nextHandle(), 0);
  frames.run(frames.nextHandle(), 250);
  const staleCallback = frames.pending.get(frames.nextHandle());
  motion.freeze();

  assert.equal(caption.properties.get("--caption-offset"), "-25px");
  assert.equal(motion.targetOffset, 25);
  assert.equal(frames.pending.size, 0);

  staleCallback(500);
  assert.equal(caption.properties.get("--caption-offset"), "-25px");
  assert.equal(frames.pending.size, 0);
});

test("reduced motion snaps to the latest measured target", () => {
  const caption = fakeCaption();
  const frames = fakeFrames();
  const motion = new CaptionMotion({
    caption,
    viewport: { clientWidth: 320 },
    reducedMotion: true,
    requestFrame: (callback) => frames.requestFrame(callback),
    cancelFrame: (handle) => frames.cancelFrame(handle),
  });

  motion.render("A caption that should not animate");
  frames.run(frames.nextHandle(), 0);

  assert.equal(caption.properties.get("--caption-offset"), "-200px");
  assert.equal(frames.pending.size, 0);
});

test("short active captions stay at zero and dispose invalidates work", () => {
  const caption = fakeCaption();
  caption.scrollWidth = 280;
  const frames = fakeFrames();
  const motion = new CaptionMotion({
    caption,
    viewport: { clientWidth: 320 },
    requestFrame: (callback) => frames.requestFrame(callback),
    cancelFrame: (handle) => frames.cancelFrame(handle),
  });

  motion.render("Short caption");
  frames.run(frames.nextHandle(), 0);
  assert.equal(caption.properties.get("--caption-offset"), "0px");

  caption.scrollWidth = 520;
  motion.render("Now this caption is long");
  const staleCallback = frames.pending.get(frames.nextHandle());
  motion.dispose();
  staleCallback(1_000);

  assert.deepEqual(frames.cancelled, [2]);
  assert.equal(frames.pending.size, 0);
  assert.equal(caption.properties.get("--caption-offset"), "0px");
});

test("a viewport resize remeasures and clamps a stale overflow target", () => {
  const caption = fakeCaption();
  const viewport = { clientWidth: 320 };
  const frames = fakeFrames();
  let resizeCallback;
  let observedViewport;
  let disconnected = false;
  const motion = new CaptionMotion({
    caption,
    viewport,
    speedPxPerSecond: 100,
    maxFrameDeltaMs: 500,
    resizeObserverFactory: (callback) => {
      resizeCallback = callback;
      return {
        observe(value) {
          observedViewport = value;
        },
        disconnect() {
          disconnected = true;
        },
      };
    },
    requestFrame: (callback) => frames.requestFrame(callback),
    cancelFrame: (handle) => frames.cancelFrame(handle),
  });

  motion.render("A caption that initially has substantial overflow");
  frames.run(frames.nextHandle(), 0);
  frames.run(frames.nextHandle(), 500);
  assert.equal(caption.properties.get("--caption-offset"), "-50px");

  viewport.clientWidth = 500;
  resizeCallback();
  frames.run(frames.nextHandle(), 600);

  assert.equal(observedViewport, viewport);
  assert.equal(motion.targetOffset, 20);
  assert.equal(caption.properties.get("--caption-offset"), "-20px");
  assert.equal(frames.pending.size, 0);

  motion.dispose();
  assert.equal(disconnected, true);
});
