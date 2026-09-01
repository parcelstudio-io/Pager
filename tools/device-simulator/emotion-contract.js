export const PAGER_EMOTION_TOOL_NAME = "set_pager_emotion";

export const PAGER_EMOTIONS = Object.freeze([
  "neutral", "happy", "curious", "delighted", "joyful", "excited",
  "affectionate", "amused", "proud", "surprised", "startled", "confused",
  "pensive", "skeptical", "suspicious", "concerned", "worried", "sad",
  "disappointed", "angry", "frustrated", "embarrassed", "shy", "sleepy",
  "bored", "focused", "determined", "relieved",
]);

const PAGER_EMOTION_VALUES = new Set(PAGER_EMOTIONS);

export const PAGER_EMOTION_TOOL = Object.freeze({
  type: "function",
  name: PAGER_EMOTION_TOOL_NAME,
  description:
    "Set Mochi's temporary eye expression before speaking. This changes only cosmetic eye animation and never listening, power, battery, or safety state.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      emotion: {
        type: "string",
        enum: PAGER_EMOTIONS,
        description: "The single eye expression that best fits the upcoming spoken response.",
      },
      duration_ms: {
        type: "integer",
        minimum: 2_000,
        maximum: 30_000,
        description: "How long the expression should remain before returning to local state.",
      },
    },
    required: ["emotion"],
  },
});

export function parsePagerEmotionToolEvent(event) {
  if (
    event?.type !== "response.function_call_arguments.done" ||
    (event.name || event.item?.name) !== PAGER_EMOTION_TOOL_NAME
  ) return null;

  const callId = event.call_id || event.item?.call_id;
  if (typeof callId !== "string" || !callId) return null;

  let args;
  try {
    args = JSON.parse(event.arguments || event.item?.arguments || "{}");
  } catch {
    return { callId, error: "invalid_arguments" };
  }
  if (!PAGER_EMOTION_VALUES.has(args.emotion)) {
    return { callId, error: "unsupported_emotion" };
  }

  const requestedDuration = Number(args.duration_ms);
  const durationMs = Number.isFinite(requestedDuration)
    ? Math.min(30_000, Math.max(2_000, Math.round(requestedDuration)))
    : 8_000;
  return { callId, emotion: args.emotion, durationMs };
}

