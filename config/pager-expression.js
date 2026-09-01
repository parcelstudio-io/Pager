// Canonical prompt and runtime contract for model-selected eye expression.
// Large Mochi gestures last up to 2.4 seconds, so a 4-second start-to-start
// cadence leaves a visible fixation instead of making the face look restless.
export const PAGER_EYE_MOVEMENT_INTERVAL_MS = 4_000;
export const MAX_EYE_MOVEMENTS_PER_PLAN = 6;

export const PAGER_EMOTIONS = Object.freeze([
  "neutral", "happy", "curious", "delighted", "joyful", "excited",
  "affectionate", "amused", "proud", "surprised", "startled", "confused",
  "pensive", "skeptical", "suspicious", "concerned", "worried", "sad",
  "disappointed", "angry", "frustrated", "embarrassed", "shy", "sleepy",
  "bored", "focused", "determined", "relieved",
]);

export const PAGER_EYE_MOVEMENTS = Object.freeze([
  "center",
  "look-up",
  "look-down",
  "look-upper-right",
  "look-lower-right",
  "look-lower-left",
  "look-upper-left",
  "look-around-clockwise",
  "look-around-counterclockwise",
  "roll-clockwise",
  "roll-counterclockwise",
]);

export const PAGER_EXPRESSION_PROMPT_CONFIG = Object.freeze({
  version: 1,
  eyeMovementIntervalMs: PAGER_EYE_MOVEMENT_INTERVAL_MS,
  maxEyeMovementsPerPlan: MAX_EYE_MOVEMENTS_PER_PLAN,
  emotions: PAGER_EMOTIONS,
  eyeMovements: PAGER_EYE_MOVEMENTS,
});
