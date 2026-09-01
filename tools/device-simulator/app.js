import { CaptionPacer } from "./caption-pacer.js";
import { CaptionMotion } from "./caption-motion.js";
import { AudioReactiveHalo } from "./audio-reactive-halo.js";
import { closeMediaSession, watchAudioTrackEnds } from "./media.js";
import { parsePagerEmotionToolEvent } from "./emotion-contract.js";
import {
  SESSION,
  createGuardedOptionalController,
  deriveView,
  initialState,
  reduceState,
} from "./state.js";

const screen = document.querySelector("#screen");
const status = document.querySelector("#status");
const batteryStatus = document.querySelector("#battery-status");
const indicator = document.querySelector("#indicator");
const button = document.querySelector("#conversation-button");
const captionViewport = document.querySelector("#caption-viewport");
const caption = document.querySelector("#caption");
const listeningHalo = document.querySelector(".listening-halo");
const remoteAudio = document.querySelector("#remote-audio");
const READY_TIMEOUT_MS = 30_000;

let state = initialState();
let nextEpoch = 0;
let activeSession = null;
let pageDisposed = false;
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
let faceContext = {
  mood: "auto",
  visible: !document.hidden,
  reducedMotion: motionPreference.matches,
};

const faceController = createGuardedOptionalController({
  onUnavailable: (errorName) => {
    screen.dataset.faceController = "unavailable";
    console.warn("Optional face animation is unavailable", {
      name: errorName,
    });
  },
});

const audioHalo = new AudioReactiveHalo({
  element: listeningHalo,
  reducedMotion: () => motionPreference.matches,
});

function applyFacePose(pose) {
  screen.dataset.faceActivity = pose.activity;
  screen.dataset.expression = pose.expression;
  screen.dataset.mood = pose.mood;
  screen.dataset.energy = pose.energy;
  screen.dataset.charging = String(pose.charging);
  screen.dataset.restGaze = pose.restGaze;
  screen.dataset.gazeMotion = pose.gazeMotion;
  screen.dataset.rollDirection = pose.rollDirection;
  const nextBatteryStatus = pose.energy === "critical"
    ? `Battery critical${pose.charging ? " and charging" : ""}`
    : pose.energy === "low"
      ? `Battery low${pose.charging ? " and charging" : ""}`
      : pose.charging
        ? "Battery charging"
        : "Battery normal";
  if (batteryStatus.textContent !== nextBatteryStatus) {
    batteryStatus.textContent = nextBatteryStatus;
  }
}

function updateFaceContext(patch) {
  faceContext = { ...faceContext, ...patch };
  faceController.update(patch);
}

async function initializeFaceController() {
  screen.dataset.faceController = "loading";

  try {
    const { ExpressionDirector } = await import("./expression-director.js");
    if (pageDisposed) return;

    const controller = new ExpressionDirector({
      onPose: applyFacePose,
      context: faceContext,
    });
    if (pageDisposed) {
      faceController.attach(controller);
      faceController.dispose();
      return;
    }

    if (!faceController.attach(controller)) return;
    screen.dataset.faceController = "ready";
    render();
  } catch (error) {
    if (pageDisposed) return;
    faceController.markUnavailable(error);
  }
}

const captionMotion = new CaptionMotion({ caption, viewport: captionViewport });
const captionPacer = new CaptionPacer({
  onUpdate: (text) => captionMotion.render(text),
});

function render() {
  const view = deriveView(state);
  status.textContent = view.status;
  indicator.dataset.listening = String(state.session === SESSION.LIVE);
  button.textContent = view.buttonLabel;
  button.dataset.indicator = view.indicator;
  screen.dataset.session = state.session;
  screen.dataset.input = state.input;
  screen.dataset.output = state.output;
  updateFaceContext({
    session: state.session,
    input: state.input,
    output: state.output,
  });
}

function dispatch(event) {
  state = reduceState(state, event);
  render();
}

function isCurrent(session) {
  return activeSession === session && session.epoch === state.epoch;
}

function setTracksEnabled(stream, enabled) {
  for (const track of stream?.getAudioTracks() || []) track.enabled = enabled;
}

function closeResources(session) {
  if (session?.remoteStream && remoteAudio.srcObject === session.remoteStream) {
    audioHalo.stop();
  }
  closeMediaSession(session, remoteAudio);
}

function stopSession() {
  const session = activeSession;
  activeSession = null;
  closeResources(session);
  captionPacer.reset();
  remoteAudio.pause();
  remoteAudio.srcObject = null;
  nextEpoch += 1;
  dispatch({ type: "stop", epoch: nextEpoch });
}

function failSession(session, message) {
  if (!isCurrent(session)) {
    closeResources(session);
    return;
  }

  activeSession = null;
  closeResources(session);
  captionPacer.reset();
  remoteAudio.pause();
  remoteAudio.srcObject = null;
  dispatch({ type: "failed", epoch: session.epoch, message });
}

function readableError(error) {
  if (error?.name === "NotAllowedError") return "Microphone permission was denied";
  if (error?.name === "NotFoundError") return "No microphone was found";
  if (error?.name === "AbortError") return "The connection timed out";
  return error?.message || "Could not start the live session";
}

function responseIdFor(event) {
  return event.response_id || event.response?.id || null;
}

function activeResponseIdFor(session, event) {
  return responseIdFor(event) || session.currentResponseId;
}

function interruptCaption() {
  captionPacer.interrupt();
}

function maybeOpenCapture(session) {
  if (!isCurrent(session) || !session.dataChannelOpen || !session.sessionCreated) return;
  if (state.session !== SESSION.CONNECTING) return;

  clearTimeout(session.readyTimeout);
  session.readyTimeout = null;
  dispatch({ type: "connected", epoch: session.epoch });
  requestAnimationFrame(() => {
    // The first frame paints cyan before any microphone track can be enabled.
    requestAnimationFrame(() => {
      if (isCurrent(session) && state.session === SESSION.LIVE) {
        setTracksEnabled(session.stream, true);
      }
    });
  });
}

function sendRealtimeEvent(session, event) {
  if (!isCurrent(session) || session.dataChannel?.readyState !== "open") return false;
  session.dataChannel.send(JSON.stringify(event));
  return true;
}

function handlePagerEmotionTool(session, event) {
  const toolCall = parsePagerEmotionToolEvent(event);
  if (!toolCall) return false;

  const accepted = !toolCall.error && faceController.setEmotion(
    toolCall.emotion,
    { durationMs: toolCall.durationMs },
  );
  const output = accepted
    ? {
        ok: true,
        emotion: toolCall.emotion,
        next: "speak_response_without_another_emotion_call",
      }
    : {
        ok: false,
        error: toolCall.error || "expression_controller_unavailable",
        next: "speak_response_without_another_emotion_call",
      };

  sendRealtimeEvent(session, {
    type: "conversation.item.create",
    item: {
      type: "function_call_output",
      call_id: toolCall.callId,
      output: JSON.stringify(output),
    },
  });
  sendRealtimeEvent(session, { type: "response.create" });
  return true;
}

function handleRealtimeEvent(session, event) {
  if (!isCurrent(session)) return;
  if (handlePagerEmotionTool(session, event)) return;
  const epoch = session.epoch;

  switch (event.type) {
    case "session.created":
      session.sessionCreated = true;
      maybeOpenCapture(session);
      break;

    case "input_audio_buffer.speech_started":
      interruptCaption();
      dispatch({ type: "user_speech_started", epoch });
      break;

    case "input_audio_buffer.speech_stopped":
      dispatch({ type: "user_speech_stopped", epoch });
      break;

    case "response.created": {
      const responseId = responseIdFor(event);
      if (responseId) {
        session.currentResponseId = responseId;
        captionPacer.begin(responseId);
      }
      dispatch({ type: "response_created", epoch });
      break;
    }

    case "response.output_audio_transcript.delta": {
      const responseId = activeResponseIdFor(session, event);
      captionPacer.push(responseId, event.delta || "");
      break;
    }

    case "response.output_audio_transcript.done":
      break;

    case "output_audio_buffer.started":
      captionPacer.start(activeResponseIdFor(session, event));
      dispatch({ type: "output_started", epoch });
      break;

    case "output_audio_buffer.cleared":
      interruptCaption();
      dispatch({ type: "output_stopped", epoch });
      break;

    case "output_audio_buffer.stopped":
      captionPacer.flush(activeResponseIdFor(session, event));
      captionMotion.complete();
      dispatch({ type: "output_stopped", epoch });
      break;

    case "response.done": {
      // WebRTC may still be draining buffered audio. The buffer stopped/cleared
      // events own PLAYING/caption lifetime. A response with no playback still
      // needs to leave GENERATING, and its ID must match the current response.
      const responseId = responseIdFor(event);
      if (responseId && responseId === session.currentResponseId) {
        dispatch({ type: "response_done", epoch });
      }
      break;
    }

    case "error":
      failSession(session, event.error?.message || "Realtime session error");
      break;

    default:
      break;
  }
}

async function startSession() {
  nextEpoch += 1;
  const epoch = nextEpoch;
  dispatch({ type: "start", epoch });

  const session = {
    epoch,
    peerConnection: null,
    dataChannel: null,
    stream: null,
    remoteStream: null,
    dataChannelOpen: false,
    sessionCreated: false,
    currentResponseId: null,
    requestController: null,
    readyTimeout: null,
    closed: false,
  };
  activeSession = session;
  session.readyTimeout = setTimeout(() => {
    failSession(session, "Realtime connection timed out");
  }, READY_TIMEOUT_MS);

  try {
    session.peerConnection = new RTCPeerConnection();
    session.peerConnection.addEventListener("connectionstatechange", () => {
      if (["disconnected", "failed", "closed"].includes(
        session.peerConnection.connectionState,
      )) {
        failSession(session, "Realtime connection failed");
      }
    });

    session.peerConnection.addEventListener("track", (event) => {
      if (!isCurrent(session)) return;
      session.remoteStream = event.streams[0];
      remoteAudio.srcObject = session.remoteStream;
      audioHalo.attach(session.remoteStream);
      remoteAudio.play().catch(() => {
        failSession(session, "Browser blocked assistant audio playback");
      });
    });

    session.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    if (!isCurrent(session)) {
      closeResources(session);
      return;
    }

    setTracksEnabled(session.stream, false);
    watchAudioTrackEnds(session.stream, () => {
      if (isCurrent(session)) {
        failSession(session, "Microphone became unavailable");
      }
    });
    for (const track of session.stream.getAudioTracks()) {
      session.peerConnection.addTrack(track, session.stream);
    }

    session.dataChannel = session.peerConnection.createDataChannel("oai-events");
    session.dataChannel.addEventListener("message", (message) => {
      try {
        handleRealtimeEvent(session, JSON.parse(message.data));
      } catch {
        failSession(session, "Received an unreadable Realtime event");
      }
    });
    session.dataChannel.addEventListener("open", () => {
      if (!isCurrent(session)) return;
      session.dataChannelOpen = true;
      maybeOpenCapture(session);
    });
    session.dataChannel.addEventListener("close", () => {
      if (isCurrent(session)) {
        failSession(session, "Realtime session closed");
      }
    });

    const offer = await session.peerConnection.createOffer();
    await session.peerConnection.setLocalDescription(offer);

    session.requestController = new AbortController();
    const response = await fetch("/session", {
      method: "POST",
      headers: { "Content-Type": "application/sdp" },
      body: offer.sdp,
      signal: session.requestController.signal,
    });

    if (!response.ok) {
      let message = `Session setup failed (${response.status})`;
      try {
        const payload = await response.json();
        if (payload.error) message = payload.error;
      } catch {
        // The status-based message is enough for this V1 path.
      }
      throw new Error(message);
    }

    const answer = { type: "answer", sdp: await response.text() };
    if (!isCurrent(session)) {
      closeResources(session);
      return;
    }
    await session.peerConnection.setRemoteDescription(answer);
  } catch (error) {
    failSession(session, readableError(error));
  }
}

button.addEventListener("click", () => {
  if (state.session === SESSION.CONNECTING || state.session === SESSION.LIVE) {
    stopSession();
  } else {
    startSession();
  }
});

function syncMotionPreference() {
  updateFaceContext({ reducedMotion: motionPreference.matches });
}

function syncVisibility() {
  updateFaceContext({ visible: !document.hidden });
}

motionPreference.addEventListener("change", syncMotionPreference);
document.addEventListener("visibilitychange", syncVisibility);

let releaseBatteryMonitor = () => {};
if (typeof navigator.getBattery === "function") {
  navigator.getBattery().then((battery) => {
    if (pageDisposed) return;
    const syncBattery = () => {
      updateFaceContext({
        batteryPercent: battery.level * 100,
        charging: battery.charging,
      });
    };
    battery.addEventListener("levelchange", syncBattery);
    battery.addEventListener("chargingchange", syncBattery);
    syncBattery();
    releaseBatteryMonitor = () => {
      battery.removeEventListener("levelchange", syncBattery);
      battery.removeEventListener("chargingchange", syncBattery);
    };
  }).catch(() => {
    // Battery status is optional; the prototype keeps its neutral energy pose.
  });
}

window.addEventListener("pagehide", () => {
  pageDisposed = true;
  stopSession();
  captionPacer.dispose();
  captionMotion.dispose();
  faceController.dispose();
  releaseBatteryMonitor();
  motionPreference.removeEventListener("change", syncMotionPreference);
  document.removeEventListener("visibilitychange", syncVisibility);
});

render();
initializeFaceController();
