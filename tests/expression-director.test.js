import test from "node:test";
import assert from "node:assert/strict";

import {
  ExpressionDirector,
  batteryEnergy,
  deriveFacePose,
} from "../tools/device-simulator/expression-director.js";

class FakeClock {
  constructor() {
    this.now = 0;
    this.nextId = 1;
    this.jobs = new Map();
  }

  schedule = (callback, delay) => {
    const id = this.nextId;
    this.nextId += 1;
    this.jobs.set(id, { at: this.now + delay, callback });
    return id;
  };

  cancel = (id) => {
    this.jobs.delete(id);
  };

  advance(milliseconds) {
    const target = this.now + milliseconds;
    while (true) {
      const pending = [...this.jobs.entries()]
        .filter(([, job]) => job.at <= target)
        .sort((left, right) => left[1].at - right[1].at || left[0] - right[0]);
      if (!pending.length) break;
      const [id, job] = pending[0];
      this.jobs.delete(id);
      this.now = job.at;
      job.callback();
    }
    this.now = target;
  }
}

function sequence(values, fallback = 0.5) {
  const remaining = [...values];
  return () => remaining.shift() ?? fallback;
}

test("face pose keeps activity, affect, and battery priorities independent", () => {
  const duplex = deriveFacePose({
    session: "live",
    input: "user_speaking",
    output: "playing",
    emotion: "neutral",
    mood: "calm",
  });
  assert.equal(duplex.activity, "duplex");
  assert.equal(duplex.expression, "curious");
  assert.equal(duplex.gazeMotion, "attentive");

  const thinking = deriveFacePose({
    session: "live",
    input: "quiet",
    output: "generating",
    emotion: "neutral",
    mood: "calm",
  });
  assert.equal(thinking.activity, "thinking");
  assert.equal(thinking.expression, "confused");
  assert.equal(thinking.gazeMotion, "thinking-scan");

  const connecting = deriveFacePose({
    session: "connecting",
    mood: "curious",
  });
  assert.equal(connecting.restGaze, "up");
  assert.equal(connecting.gazeMotion, "center");

  const explicit = deriveFacePose({
    emotion: "delighted",
    mood: "pensive",
    batteryPercent: 80,
  });
  assert.equal(explicit.expression, "delighted");

  const lowBattery = deriveFacePose({
    emotion: "delighted",
    mood: "playful",
    batteryPercent: 9,
  });
  assert.equal(lowBattery.energy, "critical");
  assert.equal(lowBattery.expression, "sleepy");
  assert.equal(lowBattery.gazeMotion, "down");

  const fault = deriveFacePose({ session: "error", batteryPercent: 100 });
  assert.equal(fault.activity, "fault");
  assert.equal(fault.expression, "concerned");
});

test("battery bands remain truthful while charging is an independent signal", () => {
  assert.equal(batteryEnergy(100), "normal");
  assert.equal(batteryEnergy(25), "low");
  assert.equal(batteryEnergy(10), "critical");
  const chargingCritical = deriveFacePose({ batteryPercent: 3, charging: true });
  assert.equal(chargingCritical.energy, "critical");
  assert.equal(chargingCritical.charging, true);
});

test("idle curiosity looks up, rolls, or looks down on an injected clock", () => {
  const clock = new FakeClock();
  const poses = [];
  const director = new ExpressionDirector({
    onPose: (pose) => poses.push(pose),
    schedule: clock.schedule,
    cancel: clock.cancel,
    // delay=5s, gesture=roll-around clockwise, next mood=curious
    random: sequence([0, 0.5, 0.2, 0.3, 0]),
  });

  assert.equal(poses.at(-1).activity, "idle");
  assert.equal(clock.jobs.size, 1);
  clock.advance(5_000);
  assert.equal(poses.at(-1).mood, "curious");
  assert.equal(poses.at(-1).gazeMotion, "roll-around");
  assert.equal(poses.at(-1).rollDirection, "clockwise");

  clock.advance(2_200);
  assert.equal(poses.at(-1).gazeMotion, "up");
  assert.equal(poses.at(-1).rollDirection, "none");
  assert.equal(clock.jobs.size, 1);
  director.dispose();
  assert.equal(clock.jobs.size, 0);
});

test("the idle random bands reach every curious gaze path", () => {
  for (const [gestureRoll, expectedMotion] of [
    [0.1, "look-up"],
    [0.5, "roll-around"],
    [0.9, "look-down"],
  ]) {
    const clock = new FakeClock();
    let pose;
    const director = new ExpressionDirector({
      onPose: (nextPose) => { pose = nextPose; },
      schedule: clock.schedule,
      cancel: clock.cancel,
      random: sequence([0, gestureRoll, 0, 0]),
    });
    clock.advance(5_000);
    assert.equal(pose.gazeMotion, expectedMotion);
    director.dispose();
  }
});

test("speech cancels an active idle gesture and stale callbacks cannot revive it", () => {
  const clock = new FakeClock();
  const poses = [];
  const director = new ExpressionDirector({
    onPose: (pose) => poses.push(pose),
    schedule: clock.schedule,
    // Deliberately leave cleared callbacks in the queue; generation tokens must reject them.
    cancel: () => {},
    random: sequence([0, 0.5, 0.8, 0.1]),
  });

  clock.advance(5_000);
  assert.equal(poses.at(-1).gazeMotion, "roll-around");
  director.update({ session: "live", input: "user_speaking", output: "idle" });
  assert.equal(poses.at(-1).activity, "listening");
  assert.equal(poses.at(-1).gazeMotion, "attentive");

  clock.advance(5_000);
  assert.equal(poses.at(-1).activity, "listening");
  assert.equal(poses.at(-1).gazeMotion, "attentive");
  director.dispose();
});

test("low battery, hidden pages, and reduced motion schedule no idle roll", () => {
  for (const context of [
    { batteryPercent: 20 },
    { batteryPercent: 3, charging: true },
    { visible: false },
    { reducedMotion: true },
  ]) {
    const clock = new FakeClock();
    const director = new ExpressionDirector({
      context,
      schedule: clock.schedule,
      cancel: clock.cancel,
    });
    assert.equal(clock.jobs.size, 0);
    director.dispose();
  }

  for (const patch of [
    { batteryPercent: 20 },
    { visible: false },
    { reducedMotion: true },
  ]) {
    const clock = new FakeClock();
    let pose;
    const director = new ExpressionDirector({
      onPose: (nextPose) => { pose = nextPose; },
      schedule: clock.schedule,
      cancel: clock.cancel,
      random: sequence([0, 0.5, 0]),
    });
    clock.advance(5_000);
    assert.equal(pose.gazeMotion, "roll-around");
    director.update(patch);
    assert.equal(
      ["look-up", "roll-around", "look-down"].includes(pose.gazeMotion),
      false,
    );
    assert.equal(clock.jobs.size, 0);
    director.dispose();
  }

  const reduced = deriveFacePose({
    session: "live",
    output: "generating",
    reducedMotion: true,
  });
  assert.equal(reduced.gazeMotion, "side");
});

test("validated emotion hints expire even while activity changes", () => {
  const clock = new FakeClock();
  const poses = [];
  const director = new ExpressionDirector({
    context: { mood: "calm", emotion: "concerned" },
    onPose: (pose) => poses.push(pose),
    schedule: clock.schedule,
    cancel: clock.cancel,
  });

  assert.equal(poses.at(-1).expression, "neutral");
  director.update({ emotion: "concerned" });
  assert.equal(poses.at(-1).expression, "neutral");
  director.setEmotion("delighted", { durationMs: 500 });
  assert.equal(poses.at(-1).expression, "delighted");
  director.update({ session: "connecting" });
  clock.advance(500);
  director.update({ session: "inactive" });
  assert.equal(poses.at(-1).expression, "neutral");
  director.dispose();
});
