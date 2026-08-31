import { CaptionPacer } from "./caption-pacer.js";
import { closeMediaSession, watchAudioTrackEnds } from "./media.js";
import {
  SESSION,
  deriveView,
  initialState,
  reduceState,
} from "./state.js";

const screen = document.querySelector("#screen");
const status = document.querySelector("#status");
const indicator = document.querySelector("#indicator");
const button = document.querySelector("#conversation-button");
const captionViewport = document.querySelector("#caption-viewport");
const caption = document.querySelector("#caption");
const remoteAudio = document.querySelector("#remote-audio");
const READY_TIMEOUT_MS = 30_000;

let state = initialState();
let nextEpoch = 0;
let activeSession = null;

function renderCaption(text) {
  const shown = text || "Captions appear here";
  caption.textContent = shown;
  caption.classList.toggle("caption-empty", !text);

  requestAnimationFrame(() => {
    const overflow = Math.max(0, caption.scrollWidth - captionViewport.clientWidth);
    caption.style.transform = `translateX(-${overflow}px)`;
  });
}

const captionPacer = new CaptionPacer({ onUpdate: renderCaption });

function render() {
  const view = deriveView(state);
  status.textContent = view.status;
  indicator.dataset.color = view.indicator;
  button.textContent = view.buttonLabel;
  button.dataset.indicator = view.indicator;
  screen.dataset.session = state.session;
  screen.dataset.input = state.input;
  screen.dataset.output = state.output;
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

function handleRealtimeEvent(session, event) {
  if (!isCurrent(session)) return;
  const epoch = session.epoch;

  switch (event.type) {
    case "session.created":
      session.sessionCreated = true;
      maybeOpenCapture(session);
      break;

    case "input_audio_buffer.speech_started":
      captionPacer.interrupt();
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
      const responseId = responseIdFor(event);
      captionPacer.push(responseId, event.delta || "");
      break;
    }

    case "response.output_audio_transcript.done":
      break;

    case "output_audio_buffer.started":
      captionPacer.start(responseIdFor(event));
      dispatch({ type: "output_started", epoch });
      break;

    case "output_audio_buffer.cleared":
      captionPacer.interrupt();
      dispatch({ type: "output_stopped", epoch });
      break;

    case "output_audio_buffer.stopped":
      captionPacer.flush(responseIdFor(event));
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

window.addEventListener("pagehide", () => {
  stopSession();
  captionPacer.dispose();
});

render();
