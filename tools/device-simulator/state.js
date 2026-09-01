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

const SAFE_OPTIONAL_ERROR_NAMES = new Set([
  "Error",
  "AbortError",
  "EvalError",
  "InvalidStateError",
  "NotSupportedError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError",
]);

function safeOptionalErrorName(error) {
  return SAFE_OPTIONAL_ERROR_NAMES.has(error?.name) ? error.name : "Error";
}

// Optional presentation code must never take down the conversation controls.
// This adapter deliberately exposes no controller reference, clears it before
// cleanup, and reports only an allowlisted error class rather than a message.
export function createGuardedOptionalController({ onUnavailable = () => {} } = {}) {
  let controller = null;

  function reportUnavailable(error) {
    try {
      onUnavailable(safeOptionalErrorName(error));
    } catch {
      // A diagnostic callback is optional too and must stay outside core state.
    }
  }

  function fail(error) {
    const failedController = controller;
    controller = null;
    try {
      failedController?.dispose?.();
    } catch {
      // Cleanup is best-effort; preserve the original sanitized failure class.
    }
    reportUnavailable(error);
    return false;
  }

  return Object.freeze({
    attach(nextController) {
      try {
        if (
          !nextController ||
          typeof nextController.update !== "function" ||
          typeof nextController.dispose !== "function"
        ) {
          return fail(new TypeError("Invalid optional controller"));
        }
      } catch (error) {
        return fail(error);
      }
      controller = nextController;
      return true;
    },

    update(patch) {
      if (!controller) return false;
      try {
        controller.update(patch);
        return true;
      } catch (error) {
        return fail(error);
      }
    },

    dispose() {
      if (!controller) return true;
      const disposedController = controller;
      controller = null;
      try {
        disposedController.dispose();
        return true;
      } catch (error) {
        reportUnavailable(error);
        return false;
      }
    },

    markUnavailable(error) {
      return fail(error);
    },
  });
}

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
