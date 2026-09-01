import { PAGER_EMOTIONS } from "./emotion-contract.js";

const SESSION_VALUES = new Set(["inactive", "connecting", "live", "error"]);
const INPUT_VALUES = new Set(["gated", "quiet", "user_speaking"]);
const OUTPUT_VALUES = new Set(["idle", "generating", "playing"]);

export const EMOTIONS = PAGER_EMOTIONS;

export const MOODS = Object.freeze([
  "auto",
  "calm",
  "curious",
  "playful",
  "pensive",
  "tired",
]);

const EMOTION_VALUES = new Set(EMOTIONS);
const MOOD_VALUES = new Set(MOODS);
const IDLE_MOODS = Object.freeze(["calm", "curious", "playful", "pensive"]);
// Introduce the personality soon after startup, then leave the centered gaze
// dominant so the face feels attentive instead of restless.
const FIRST_IDLE_DELAY_MIN_MS = 3_000;
const FIRST_IDLE_DELAY_RANGE_MS = 2_000;
const REPEAT_IDLE_DELAY_MIN_MS = 6_000;
const REPEAT_IDLE_DELAY_RANGE_MS = 6_000;
const GESTURE_DURATION_MS = Object.freeze({
  "look-up": 1_600,
  "look-upper-right": 1_900,
  "look-lower-right": 1_900,
  "look-lower-left": 1_900,
  "look-upper-left": 1_900,
  "look-around": 2_000,
  "roll-around": 2_400,
  "look-down": 1_600,
});

const DEFAULT_CONTEXT = Object.freeze({
  session: "inactive",
  input: "gated",
  output: "idle",
  emotion: "neutral",
  batteryPercent: 100,
  charging: false,
  mood: "auto",
  visible: true,
  reducedMotion: false,
});

function finitePercent(value, fallback = 100) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(0, value));
}

function booleanOr(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeContext(context = {}, previous = DEFAULT_CONTEXT) {
  return {
    session: SESSION_VALUES.has(context.session) ? context.session : previous.session,
    input: INPUT_VALUES.has(context.input) ? context.input : previous.input,
    output: OUTPUT_VALUES.has(context.output) ? context.output : previous.output,
    emotion: EMOTION_VALUES.has(context.emotion) ? context.emotion : previous.emotion,
    batteryPercent: context.batteryPercent === undefined
      ? previous.batteryPercent
      : finitePercent(context.batteryPercent, previous.batteryPercent),
    charging: booleanOr(context.charging, previous.charging),
    mood: MOOD_VALUES.has(context.mood) ? context.mood : previous.mood,
    visible: booleanOr(context.visible, previous.visible),
    reducedMotion: booleanOr(context.reducedMotion, previous.reducedMotion),
  };
}

function contextsMatch(left, right) {
  return Object.keys(DEFAULT_CONTEXT).every((key) => left[key] === right[key]);
}

function deriveActivity({ session, input, output }) {
  if (session === "error") return "fault";
  if (session === "connecting") return "connecting";
  if (session !== "live") return "idle";
  if (input === "user_speaking" && output === "playing") return "duplex";
  if (input === "user_speaking") return "listening";
  if (output === "playing") return "speaking";
  if (output === "generating") return "thinking";
  return "idle";
}

export function batteryEnergy(batteryPercent) {
  if (finitePercent(batteryPercent) <= 10) return "critical";
  if (finitePercent(batteryPercent) <= 25) return "low";
  return "normal";
}

function moodExpression(mood) {
  if (mood === "curious") return "curious";
  if (mood === "playful") return "amused";
  if (mood === "pensive") return "pensive";
  if (mood === "tired") return "sleepy";
  return "neutral";
}

function deriveExpression(context, activity, energy) {
  if (activity === "fault") return "concerned";
  if (energy === "critical") return "sleepy";
  if (energy === "low") return "concerned";
  if (context.emotion !== "neutral") return context.emotion;
  if (activity === "duplex" || activity === "listening") return "curious";
  if (activity === "speaking") return "delighted";
  if (activity === "thinking") return "confused";
  return moodExpression(context.mood);
}

function staticGazeFor(expression) {
  if (["curious", "excited", "proud", "surprised"].includes(expression)) return "up";
  if ([
    "concerned",
    "worried",
    "sad",
    "disappointed",
    "embarrassed",
    "shy",
    "sleepy",
    "bored",
  ].includes(expression)) return "down";
  if (["amused", "confused", "pensive", "skeptical", "suspicious"].includes(expression)) {
    return "side";
  }
  return "center";
}

function restingGazeFor(context, activity, energy) {
  if (energy !== "normal" || activity === "fault") return "down";

  // An explicit, short-lived emotion is allowed to carry a gaze. Ambient moods
  // only change the eye shape; otherwise they made the idle eyes park upward
  // between gestures instead of returning to a calm, centered resting pose.
  if (context.emotion !== "neutral") return staticGazeFor(context.emotion);
  if (activity === "thinking") return "side";
  return "center";
}

export function deriveFacePose(context = {}, idleGesture = null) {
  const normalized = normalizeContext(context);
  const activity = deriveActivity(normalized);
  const energy = batteryEnergy(normalized.batteryPercent);
  const expression = deriveExpression(normalized, activity, energy);

  const restGaze = restingGazeFor(normalized, activity, energy);
  let gazeMotion = restGaze;
  let rollDirection = "none";

  if (!normalized.reducedMotion) {
    if (activity === "duplex" || activity === "listening") {
      gazeMotion = "attentive";
    } else if (activity === "thinking") {
      gazeMotion = "thinking-scan";
    } else if (activity === "speaking" || activity === "connecting") {
      gazeMotion = "center";
    } else if (activity === "idle" && idleGesture) {
      gazeMotion = idleGesture.motion;
      rollDirection = idleGesture.direction || "clockwise";
    }
  }

  return Object.freeze({
    activity,
    expression,
    mood: normalized.mood,
    energy,
    charging: normalized.charging,
    restGaze,
    gazeMotion,
    rollDirection,
  });
}

function idleEligible(context, pose) {
  return (
    context.visible &&
    !context.reducedMotion &&
    context.emotion === "neutral" &&
    pose.activity === "idle" &&
    pose.energy === "normal"
  );
}

function clampRandom(value) {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(0.999999, Math.max(0, value));
}

function chooseIdleGesture(random) {
  const gestureRoll = clampRandom(random());
  let motion = "look-down";
  if (gestureRoll < 0.14) motion = "look-up";
  else if (gestureRoll < 0.28) motion = "look-upper-right";
  else if (gestureRoll < 0.42) motion = "look-lower-right";
  else if (gestureRoll < 0.56) motion = "look-lower-left";
  else if (gestureRoll < 0.70) motion = "look-upper-left";
  else if (gestureRoll < 0.82) motion = "look-around";
  else if (gestureRoll < 0.94) motion = "roll-around";

  return {
    motion,
    direction: clampRandom(random()) < 0.5 ? "clockwise" : "counterclockwise",
  };
}

export class ExpressionDirector {
  constructor({
    onPose = () => {},
    random = Math.random,
    schedule = setTimeout,
    cancel = clearTimeout,
    context = {},
  } = {}) {
    this.onPose = onPose;
    this.random = random;
    // Browser timer functions require their native receiver in some engines.
    // Calling a stored setTimeout as `this.schedule()` changes that receiver, so
    // keep our own methods as wrappers and invoke the supplied callbacks unbound.
    this.schedule = (callback, delay) => schedule(callback, delay);
    this.cancel = (timer) => cancel(timer);
    // Affect is transient by contract; setEmotion() is its only ingress.
    this.context = normalizeContext({ ...context, emotion: "neutral" });
    // Auto mood begins calm. Curiosity is expressed by the first scheduled eye
    // gesture, not by making the initial/resting gaze look upward.
    this.ambientMood = this.context.mood === "auto" ? "calm" : this.context.mood;
    this.idleGesture = null;
    this.idleTimer = null;
    this.gestureTimer = null;
    this.emotionTimer = null;
    this.generation = 0;
    this.emotionGeneration = 0;
    this.hasShownIdleGesture = false;
    this.disposed = false;
    this.pose = null;

    this.reconcile();
  }

  effectiveContext() {
    return {
      ...this.context,
      mood: this.context.mood === "auto" ? this.ambientMood : this.context.mood,
    };
  }

  emitPose() {
    this.pose = deriveFacePose(this.effectiveContext(), this.idleGesture);
    this.onPose(this.pose);
    return this.pose;
  }

  clearMotionTimers() {
    if (this.idleTimer !== null) this.cancel(this.idleTimer);
    if (this.gestureTimer !== null) this.cancel(this.gestureTimer);
    this.idleTimer = null;
    this.gestureTimer = null;
  }

  scheduleIdleGesture() {
    const pose = this.pose || this.emitPose();
    if (!idleEligible(this.context, pose) || this.disposed) return;

    const token = this.generation;
    const delay = this.hasShownIdleGesture
      ? REPEAT_IDLE_DELAY_MIN_MS + clampRandom(this.random()) * REPEAT_IDLE_DELAY_RANGE_MS
      : FIRST_IDLE_DELAY_MIN_MS + clampRandom(this.random()) * FIRST_IDLE_DELAY_RANGE_MS;
    this.idleTimer = this.schedule(() => {
      this.idleTimer = null;
      if (this.disposed || token !== this.generation) return;
      if (!idleEligible(this.context, this.pose)) return;

      this.hasShownIdleGesture = true;
      this.idleGesture = chooseIdleGesture(this.random);
      this.emitPose();
      const duration = GESTURE_DURATION_MS[this.idleGesture.motion];
      this.gestureTimer = this.schedule(() => {
        this.gestureTimer = null;
        if (this.disposed || token !== this.generation) return;
        this.idleGesture = null;
        if (this.context.mood === "auto") {
          const moodIndex = Math.floor(clampRandom(this.random()) * IDLE_MOODS.length);
          this.ambientMood = IDLE_MOODS[moodIndex];
        }
        this.emitPose();
        this.scheduleIdleGesture();
      }, duration);
    }, delay);
  }

  reconcile() {
    this.clearMotionTimers();
    this.idleGesture = null;
    this.emitPose();
    this.scheduleIdleGesture();
    return this.pose;
  }

  #applyContextPatch(patch = {}, { acceptEmotion = false } = {}) {
    if (this.disposed) return this.pose;
    const acceptedPatch = { ...patch };
    if (!acceptEmotion) delete acceptedPatch.emotion;

    if (
      acceptEmotion &&
      Object.hasOwn(acceptedPatch, "emotion") &&
      EMOTION_VALUES.has(acceptedPatch.emotion)
    ) {
      if (this.emotionTimer !== null) this.cancel(this.emotionTimer);
      this.emotionTimer = null;
      this.emotionGeneration += 1;
    }
    const next = normalizeContext({ ...this.context, ...acceptedPatch }, this.context);
    if (contextsMatch(next, this.context)) return this.pose;

    if (
      acceptedPatch.mood !== undefined &&
      next.mood !== this.context.mood &&
      next.mood !== "auto"
    ) {
      this.ambientMood = next.mood;
    }
    this.context = next;
    this.generation += 1;
    return this.reconcile();
  }

  update(patch = {}) {
    return this.#applyContextPatch(patch);
  }

  setEmotion(emotion, { durationMs = 6_000 } = {}) {
    if (!EMOTION_VALUES.has(emotion)) return this.pose;
    this.#applyContextPatch({ emotion }, { acceptEmotion: true });
    if (emotion === "neutral" || this.disposed) return this.pose;

    const token = this.emotionGeneration;
    const duration = Math.min(30_000, Math.max(500, Number(durationMs) || 6_000));
    this.emotionTimer = this.schedule(() => {
      this.emotionTimer = null;
      if (this.disposed || token !== this.emotionGeneration) return;
      this.#applyContextPatch({ emotion: "neutral" }, { acceptEmotion: true });
    }, duration);
    return this.pose;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.generation += 1;
    this.emotionGeneration += 1;
    this.clearMotionTimers();
    if (this.emotionTimer !== null) this.cancel(this.emotionTimer);
    this.emotionTimer = null;
  }
}
