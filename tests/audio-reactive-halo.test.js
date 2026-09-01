import test from "node:test";
import assert from "node:assert/strict";

import {
  AudioReactiveHalo,
  audioFeatures,
} from "../tools/device-simulator/audio-reactive-halo.js";

function fakeElement() {
  const properties = new Map();
  return {
    properties,
    style: {
      setProperty(name, value) { properties.set(name, value); },
    },
  };
}

test("audio features separate loudness from spectral tone", () => {
  const silence = new Uint8Array(32).fill(128);
  assert.deepEqual(audioFeatures(silence, new Uint8Array(16)), {
    level: 0,
    tone: 0.5,
  });

  const loud = new Uint8Array(32).map((_, index) => index % 2 ? 240 : 16);
  const low = new Uint8Array(16);
  const high = new Uint8Array(16);
  low[2] = 255;
  high[13] = 255;
  const lowFeatures = audioFeatures(loud, low);
  const highFeatures = audioFeatures(loud, high);
  assert.ok(lowFeatures.level > 0.8);
  assert.equal(lowFeatures.level, highFeatures.level);
  assert.ok(lowFeatures.tone < highFeatures.tone);
});

test("halo paints bounded ivory-line geometry from audio features", () => {
  const element = fakeElement();
  const halo = new AudioReactiveHalo({ element });
  halo.paint(1, 0.8);

  assert.equal(element.properties.get("--halo-scale-x"), "1.1520");
  assert.equal(element.properties.get("--halo-scale-y"), "1.1880");
  assert.equal(element.properties.get("--halo-border-width"), "4.80px");
  assert.equal(element.properties.get("--halo-glow"), "34.00px");
  assert.equal(element.properties.get("--halo-shift-x"), "2.10px");
});

test("halo attachment samples only its supplied remote stream and resets", () => {
  const element = fakeElement();
  const pending = new Map();
  let nextFrame = 0;
  let connectedStream;
  let disconnected = false;
  let closed = false;
  const analyser = {
    fftSize: 0,
    frequencyBinCount: 16,
    smoothingTimeConstant: 0,
    getByteTimeDomainData(target) { target.fill(220); },
    getByteFrequencyData(target) { target.fill(0); target[10] = 255; },
    disconnect() {},
  };
  const context = {
    createAnalyser: () => analyser,
    createMediaStreamSource(stream) {
      connectedStream = stream;
      return {
        connect(target) { assert.equal(target, analyser); },
        disconnect() { disconnected = true; },
      };
    },
    resume: async () => {},
    close() { closed = true; },
  };
  const halo = new AudioReactiveHalo({
    element,
    createAudioContext: () => context,
    requestFrame(callback) {
      nextFrame += 1;
      pending.set(nextFrame, callback);
      return nextFrame;
    },
    cancelFrame(handle) { pending.delete(handle); },
  });
  const remoteStream = { id: "assistant-audio" };

  assert.equal(halo.attach(remoteStream), true);
  assert.equal(connectedStream, remoteStream);
  const callback = pending.get(1);
  pending.delete(1);
  callback();
  assert.ok(halo.level > 0);
  assert.equal(pending.size, 1);

  halo.stop();
  assert.equal(disconnected, true);
  assert.equal(closed, true);
  assert.equal(pending.size, 0);
  assert.equal(element.properties.get("--halo-scale-x"), "1.0000");
});

