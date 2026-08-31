export const SESSION = Object.freeze({
  INACTIVE: "inactive",
  CONNECTING: "connecting",
  LIVE: "live",
  ERROR: "error",
});

export const INPUT = Object.freeze({
  GATED: "gated",
  QUIET: "quiet",
  USER_SPEAKING: "user_speaking",
});

export const OUTPUT = Object.freeze({
  IDLE: "idle",
  GENERATING: "generating",
  PLAYING: "playing",
});

export function initialState() {
  return {
    epoch: 0,
    session: SESSION.INACTIVE,
    input: INPUT.GATED,
    output: OUTPUT.IDLE,
    error: null,
  };
}

function belongsToCurrentEpoch(state, event) {
  return event.epoch === undefined || event.epoch === state.epoch;
}

export function reduceState(state, event) {
  if (event.type === "start") {
    if (!Number.isInteger(event.epoch) || event.epoch <= state.epoch) {
      return state;
    }

    return {
      epoch: event.epoch,
      session: SESSION.CONNECTING,
      input: INPUT.GATED,
      output: OUTPUT.IDLE,
      error: null,
    };
  }

  if (event.type === "stop") {
    if (!Number.isInteger(event.epoch) || event.epoch <= state.epoch) {
      return state;
    }

    return {
      epoch: event.epoch,
      session: SESSION.INACTIVE,
      input: INPUT.GATED,
      output: OUTPUT.IDLE,
      error: null,
    };
  }

  if (!belongsToCurrentEpoch(state, event)) {
    return state;
  }

  switch (event.type) {
    case "connected":
      if (state.session !== SESSION.CONNECTING) return state;
      return { ...state, session: SESSION.LIVE, input: INPUT.QUIET };

    case "user_speech_started":
      if (state.session !== SESSION.LIVE) return state;
      return { ...state, input: INPUT.USER_SPEAKING };

    case "user_speech_stopped":
      if (state.session !== SESSION.LIVE) return state;
      return { ...state, input: INPUT.QUIET };

    case "response_created":
      if (state.session !== SESSION.LIVE) return state;
      return { ...state, output: OUTPUT.GENERATING };

    case "output_started":
      if (state.session !== SESSION.LIVE) return state;
      return { ...state, output: OUTPUT.PLAYING };

    case "response_done":
      if (state.session !== SESSION.LIVE || state.output !== OUTPUT.GENERATING) {
        return state;
      }
      return { ...state, output: OUTPUT.IDLE };

    case "output_stopped":
      if (state.session !== SESSION.LIVE) return state;
      return { ...state, output: OUTPUT.IDLE };

    case "failed":
      return {
        ...state,
        session: SESSION.ERROR,
        input: INPUT.GATED,
        output: OUTPUT.IDLE,
        error: event.message || "Session unavailable",
      };

    default:
      return state;
  }
}

export function deriveView(state) {
  if (state.session === SESSION.CONNECTING) {
    return {
      indicator: "amber",
      buttonLabel: "Stop listening",
      status: "Connecting · microphone gated",
    };
  }

  if (state.session === SESSION.ERROR) {
    return {
      indicator: "red",
      buttonLabel: "Start listening",
      status: state.error || "Session unavailable",
    };
  }

  if (state.session === SESSION.LIVE) {
    let status = "Live · full duplex";
    if (state.input === INPUT.USER_SPEAKING && state.output === OUTPUT.PLAYING) {
      status = "Live · interrupting";
    } else if (state.input === INPUT.USER_SPEAKING) {
      status = "Live · you are speaking";
    } else if (state.output === OUTPUT.PLAYING) {
      status = "Live · Mochi is speaking";
    } else if (state.output === OUTPUT.GENERATING) {
      status = "Live · thinking";
    }

    return {
      indicator: "cyan",
      buttonLabel: "Stop listening",
      status,
    };
  }

  return {
    indicator: "off",
    buttonLabel: "Start listening",
    status: "Private · not listening",
  };
}
