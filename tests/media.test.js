import test from "node:test";
import assert from "node:assert/strict";

import {
  closeMediaSession,
  watchAudioTrackEnds,
} from "../tools/device-simulator/media.js";

test("an ended microphone track reports one fail-closed event", () => {
  const track = new EventTarget();
  let failures = 0;

  watchAudioTrackEnds(
    { getAudioTracks: () => [track] },
    () => { failures += 1; },
  );
  track.dispatchEvent(new Event("ended"));
  track.dispatchEvent(new Event("ended"));

  assert.equal(failures, 1);
});

test("a track acquired after Stop is still disabled and stopped", () => {
  let peerCloses = 0;
  const session = {
    stream: null,
    remoteStream: {},
    peerConnection: { close: () => { peerCloses += 1; } },
    dataChannel: { close: () => {} },
    closed: false,
  };

  closeMediaSession(session, { srcObject: null });
  assert.equal(session.closed, true);
  assert.equal(peerCloses, 1);

  let trackStops = 0;
  const lateTrack = {
    enabled: true,
    stop: () => { trackStops += 1; },
  };
  session.stream = { getTracks: () => [lateTrack] };
  closeMediaSession(session, { srcObject: null });

  assert.equal(lateTrack.enabled, false);
  assert.equal(trackStops, 1);
  assert.equal(peerCloses, 1);
});

test("closing a session detaches its remote audio stream", () => {
  const remoteStream = {};
  const audio = { srcObject: remoteStream };
  const session = {
    stream: { getTracks: () => [] },
    remoteStream,
    peerConnection: { close: () => {} },
    dataChannel: { close: () => {} },
    closed: false,
  };

  closeMediaSession(session, audio);
  assert.equal(audio.srcObject, null);
});

test("closing a session clears its readiness deadline", () => {
  let fired = false;
  let requestAborts = 0;
  const session = {
    stream: { getTracks: () => [] },
    peerConnection: { close: () => {} },
    dataChannel: { close: () => {} },
    requestController: { abort: () => { requestAborts += 1; } },
    readyTimeout: setTimeout(() => { fired = true; }, 10),
    closed: false,
  };

  closeMediaSession(session, null);

  assert.equal(session.readyTimeout, null);
  assert.equal(session.requestController, null);
  assert.equal(requestAborts, 1);
  return new Promise((resolve) => {
    setTimeout(() => {
      assert.equal(fired, false);
      resolve();
    }, 20);
  });
});
