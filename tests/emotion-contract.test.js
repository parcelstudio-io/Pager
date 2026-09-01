import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  PAGER_EMOTIONS,
  PAGER_EMOTION_TOOL,
  parsePagerEmotionToolEvent,
} from "../tools/device-simulator/emotion-contract.js";

test("pager emotion tool exposes a broad closed vocabulary", () => {
  assert.equal(PAGER_EMOTIONS.length, 28);
  assert.equal(PAGER_EMOTIONS.includes("happy"), true);
  assert.deepEqual(
    PAGER_EMOTION_TOOL.parameters.properties.emotion.enum,
    PAGER_EMOTIONS,
  );
  assert.equal(PAGER_EMOTION_TOOL.parameters.additionalProperties, false);
});

test("pager emotion events parse and clamp duration", () => {
  assert.deepEqual(parsePagerEmotionToolEvent({
    type: "response.function_call_arguments.done",
    name: "set_pager_emotion",
    call_id: "call_1",
    arguments: JSON.stringify({ emotion: "happy", duration_ms: 90_000 }),
  }), {
    callId: "call_1",
    emotion: "happy",
    durationMs: 30_000,
  });

  assert.deepEqual(parsePagerEmotionToolEvent({
    type: "response.function_call_arguments.done",
    name: "set_pager_emotion",
    call_id: "call_2",
    arguments: JSON.stringify({ emotion: "sleepy" }),
  }), {
    callId: "call_2",
    emotion: "sleepy",
    durationMs: 8_000,
  });
});

test("pager emotion parser rejects malformed and unrelated calls", () => {
  assert.equal(parsePagerEmotionToolEvent({ type: "response.done" }), null);
  assert.deepEqual(parsePagerEmotionToolEvent({
    type: "response.function_call_arguments.done",
    name: "set_pager_emotion",
    call_id: "call_bad",
    arguments: "not-json",
  }), { callId: "call_bad", error: "invalid_arguments" });
  assert.deepEqual(parsePagerEmotionToolEvent({
    type: "response.function_call_arguments.done",
    name: "set_pager_emotion",
    call_id: "call_unknown",
    arguments: JSON.stringify({ emotion: "invented" }),
  }), { callId: "call_unknown", error: "unsupported_emotion" });
});

test("every non-neutral emotion has explicit eye geometry", async () => {
  const styles = await readFile("tools/device-simulator/styles.css", "utf8");
  for (const emotion of PAGER_EMOTIONS.filter((value) => value !== "neutral")) {
    assert.equal(
      styles.includes(`[data-expression="${emotion}"]`),
      true,
      `missing CSS geometry for ${emotion}`,
    );
  }
  assert.equal(styles.includes(".pupil"), true);
  assert.equal(styles.includes("background: var(--cream)"), true);
});
