import {
  MAX_EYE_MOVEMENTS_PER_PLAN,
  PAGER_EMOTIONS,
  PAGER_EYE_MOVEMENTS,
  PAGER_EYE_MOVEMENT_INTERVAL_MS,
} from "../../config/pager-expression.js";

export const PAGER_EMOTION_TOOL_NAME = "set_pager_emotion";
export { PAGER_EMOTIONS, PAGER_EYE_MOVEMENTS };

const PAGER_EMOTION_VALUES = new Set(PAGER_EMOTIONS);
const PAGER_EYE_MOVEMENT_VALUES = new Set(PAGER_EYE_MOVEMENTS);

export const PAGER_EMOTION_TOOL = Object.freeze({
  type: "function",
  name: PAGER_EMOTION_TOOL_NAME,
  description:
    `Set Mochi's temporary eye expression and a locally timed gaze plan before speaking. Eye movements start every ${PAGER_EYE_MOVEMENT_INTERVAL_MS} ms. This changes only cosmetic animation and never listening, power, battery, or safety state.`,
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
      eye_movements: {
        type: "array",
        minItems: 1,
        maxItems: MAX_EYE_MOVEMENTS_PER_PLAN,
        items: {
          type: "string",
          enum: PAGER_EYE_MOVEMENTS,
        },
        description: `Ordered large-gaze commands. The device starts them ${PAGER_EYE_MOVEMENT_INTERVAL_MS} ms apart and owns exact timing.`,
      },
    },
    required: ["emotion", "eye_movements"],
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
  if (
    !Array.isArray(args.eye_movements) ||
    args.eye_movements.length < 1 ||
    args.eye_movements.length > MAX_EYE_MOVEMENTS_PER_PLAN ||
    args.eye_movements.some((movement) => !PAGER_EYE_MOVEMENT_VALUES.has(movement))
  ) {
    return { callId, error: "unsupported_eye_movements" };
  }

  const planDurationMs = Math.max(
    8_000,
    (args.eye_movements.length - 1) * PAGER_EYE_MOVEMENT_INTERVAL_MS + 2_400,
  );
  const requestedDuration = Number(args.duration_ms);
  const durationMs = Number.isFinite(requestedDuration)
    ? Math.min(30_000, Math.max(planDurationMs, Math.round(requestedDuration)))
    : Math.min(30_000, planDurationMs);
  return {
    callId,
    emotion: args.emotion,
    eyeMovements: [...args.eye_movements],
    eyeMovementIntervalMs: PAGER_EYE_MOVEMENT_INTERVAL_MS,
    durationMs,
  };
}
