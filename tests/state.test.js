import test from "node:test";
import assert from "node:assert/strict";

import {
  INPUT,
  OUTPUT,
  SESSION,
  deriveView,
  initialState,
  reduceState,
} from "../tools/device-simulator/state.js";

test("state supports full-duplex overlap and an immediate local stop", () => {
  let state = initialState();
  state = reduceState(state, { type: "start", epoch: 1 });
  assert.equal(state.session, SESSION.CONNECTING);
  assert.equal(state.input, INPUT.GATED);
  assert.equal(deriveView(state).indicator, "amber");

  state = reduceState(state, { type: "connected", epoch: 1 });
  state = reduceState(state, { type: "output_started", epoch: 1 });
  state = reduceState(state, { type: "user_speech_started", epoch: 1 });
  assert.equal(state.session, SESSION.LIVE);
  assert.equal(state.input, INPUT.USER_SPEAKING);
  assert.equal(state.output, OUTPUT.PLAYING);
  assert.equal(deriveView(state).indicator, "cyan");
  assert.equal(deriveView(state).status, "Live · interrupting");

  state = reduceState(state, { type: "stop", epoch: 2 });
  assert.deepEqual(state, {
    epoch: 2,
    session: SESSION.INACTIVE,
    input: INPUT.GATED,
    output: OUTPUT.IDLE,
    error: null,
  });
});

test("events from a stopped session epoch cannot resurrect capture", () => {
  let state = reduceState(initialState(), { type: "start", epoch: 1 });
  state = reduceState(state, { type: "stop", epoch: 2 });

  const afterLateConnect = reduceState(state, { type: "connected", epoch: 1 });
  const afterLateSpeech = reduceState(afterLateConnect, {
    type: "user_speech_started",
    epoch: 1,
  });
  assert.equal(afterLateSpeech, state);
  assert.equal(afterLateSpeech.session, SESSION.INACTIVE);
  assert.equal(afterLateSpeech.input, INPUT.GATED);
});

test("failed setup gates input and offers a fresh start", () => {
  let state = reduceState(initialState(), { type: "start", epoch: 4 });
  state = reduceState(state, {
    type: "failed",
    epoch: 4,
    message: "Microphone permission was denied",
  });

  assert.equal(state.session, SESSION.ERROR);
  assert.equal(state.input, INPUT.GATED);
  assert.equal(deriveView(state).indicator, "red");
  assert.equal(deriveView(state).buttonLabel, "Start listening");
});

test("response completion clears thinking but never cuts active playback", () => {
  let state = reduceState(initialState(), { type: "start", epoch: 1 });
  state = reduceState(state, { type: "connected", epoch: 1 });
  state = reduceState(state, { type: "response_created", epoch: 1 });
  assert.equal(state.output, OUTPUT.GENERATING);

  state = reduceState(state, { type: "response_done", epoch: 1 });
  assert.equal(state.output, OUTPUT.IDLE);

  state = reduceState(state, { type: "response_created", epoch: 1 });
  state = reduceState(state, { type: "output_started", epoch: 1 });
  state = reduceState(state, { type: "response_done", epoch: 1 });
  assert.equal(state.output, OUTPUT.PLAYING);
});
