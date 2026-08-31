import test from "node:test";
import assert from "node:assert/strict";

import { CaptionPacer, boundCaption } from "../tools/device-simulator/caption-pacer.js";

test("caption deltas wait for playback before becoming visible", () => {
  const updates = [];
  const pacer = new CaptionPacer({
    autoStart: false,
    onUpdate: (text) => updates.push(text),
  });

  pacer.begin("response-1");
  pacer.push("response-1", "Hello there, friend.");
  assert.equal(pacer.visible, "");

  pacer.start("response-1");
  assert.equal(pacer.tick(), true);
  assert.equal(pacer.visible, "Hello ");
  assert.equal(updates.at(-1), "Hello ");
});

test("interruption discards pending text and rejects late deltas", () => {
  const pacer = new CaptionPacer({ autoStart: false });
  pacer.begin("response-1");
  pacer.push("response-1", "One two three four");
  pacer.start("response-1");
  pacer.tick();
  assert.equal(pacer.visible, "One ");

  pacer.interrupt("response-1");
  pacer.push("response-1", "five six");
  assert.equal(pacer.pending.length, 0);
  assert.equal(pacer.visible, "One");

  pacer.begin("response-2");
  pacer.push("response-2", "Fresh answer");
  pacer.start("response-2");
  pacer.flush("response-2");
  assert.equal(pacer.visible, "Fresh answer");
});

test("caption text stays bounded to the display budget", () => {
  const bounded = boundCaption("alpha beta gamma delta", 12);
  assert.equal(bounded, "gamma delta");
  assert.ok(bounded.length <= 12);

  assert.equal(boundCaption("alpha beta gamma", 10), "beta gamma");
});

test("the default caption buffer preserves a complete response for slow scrolling", () => {
  const pacer = new CaptionPacer({ autoStart: false });
  const response = "A deliberately long response segment. ".repeat(150).trim();

  pacer.begin("response-1");
  pacer.push("response-1", response);
  pacer.flush("response-1");

  assert.equal(pacer.visible, response);
  assert.ok(pacer.visible.length > 4_096);
});

test("a stale response delta cannot replace the active caption", () => {
  const pacer = new CaptionPacer({ autoStart: false });
  pacer.begin("response-old");
  pacer.push("response-old", "Old answer");

  pacer.begin("response-current");
  pacer.push("response-current", "Current answer");
  pacer.push("response-old", " stale suffix");

  assert.equal(pacer.activeResponseId, "response-current");
  assert.equal(pacer.pending.join(""), "Current answer");
  assert.equal(pacer.visible, "");
});

test("playback-end flush emits one complete caption update", () => {
  const updates = [];
  const pacer = new CaptionPacer({
    autoStart: false,
    onUpdate: (text) => updates.push(text),
  });
  pacer.begin("response-1");
  pacer.push("response-1", "One two three four");
  const updatesBeforeFlush = updates.length;

  pacer.flush("response-1");

  assert.equal(updates.length, updatesBeforeFlush + 1);
  assert.equal(updates.at(-1), "One two three four");
  assert.equal(pacer.pending.length, 0);
});
