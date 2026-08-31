import test from "node:test";
import assert from "node:assert/strict";

import {
  CaptionMotion,
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

test("caption offset keeps short text centered and pins long text to the live edge", () => {
  assert.equal(captionOffset(280, 320), 0);
  assert.equal(captionOffset(520, 320), 200);
  assert.equal(captionOffset(Number.NaN, 320), 0);
  assert.equal(captionOffset(100, -20), 100);
});

test("caption motion cancels stale frames and resets without a slide-back", () => {
  const caption = fakeCaption();
  const frames = new Map();
  const cancelled = [];
  let nextFrame = 0;
  const motion = new CaptionMotion({
    caption,
    viewport: { clientWidth: 320 },
    requestFrame: (callback) => {
      nextFrame += 1;
      frames.set(nextFrame, callback);
      return nextFrame;
    },
    cancelFrame: (handle) => cancelled.push(handle),
  });

  motion.render("A growing spoken caption");
  motion.render("A growing spoken caption keeps moving");
  assert.deepEqual(cancelled, [1]);
  assert.equal(caption.dataset.motion, "active");

  frames.get(2)();
  assert.equal(caption.properties.get("--caption-offset"), "-200px");

  motion.render("");
  assert.equal(caption.dataset.motion, "idle");
  assert.equal(caption.textContent, "Captions appear here");
  assert.equal(caption.properties.get("--caption-offset"), "0px");

  caption.scrollWidth = 280;
  motion.render("Short caption");
  frames.get(3)();
  assert.equal(caption.properties.get("--caption-offset"), "0px");
});
