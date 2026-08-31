# ADR 0010 — Use local hierarchical expression arbitration

Status: Accepted for EVT
Date: 2026-08-31

## Context

Two round eyes must communicate conversation activity, affect, battery condition, and a curious personality at the same time. A single exclusive animation state would make full-duplex overlap impossible and could let a random or model-requested expression hide an actual fault or listening state. Network-dependent animation would also make physical interaction feel delayed.

## Decision

A local expression director combines four orthogonal channels:

1. authoritative activity (`fault`, `connecting`, `duplex`, `listening`, `speaking`, `thinking`, `idle`);
2. an allowlisted, expiring affect hint (`neutral`, `curious`, `delighted`, `confused`, `concerned`, `sleepy`);
3. battery capacity energy (`normal`, `low`, `critical`) plus an independent charging flag/glow; and
4. an ambient mood (`calm`, `curious`, `playful`, `pensive`, `tired`, or locally randomized `auto`).

These channels compose rather than following one global animation priority. Activity always owns the truthful conversation motion. Battery capacity always owns energy/openness; charging adds a glow without hiding low capacity. Within expression geometry, fault/low capacity wins, followed by validated affect, an activity-derived default, and ambient mood. Within pupil gaze, active conversation motion wins over static affect or idle curiosity. Capture status remains a separate hardware/session truth: no eye pose may turn the amber/cyan/off indicator on, imply microphone capture, or override the conversation button.

While fully idle, normal-powered, visible, and motion-enabled, the director waits a randomized 5–9 seconds and performs one bounded curious gesture: look up, roll around clockwise/counter-clockwise, or look down. The 1.7–2.2 second gesture ends at a stable gaze and is cancelled immediately by speech, thinking, connection state, a fault, low battery, page hiding, or reduced-motion preference. All randomness and timers are injectable for deterministic tests. Low/critical battery suppresses random idle motion and gives the resting face a lower gaze, reduced openness, lower brightness, and less animation energy; truthful active-conversation movement may still take precedence.

CSS animation ownership is layered: an eye rig owns conversation movement, the eye shell owns blinking and geometry, and the pupil owns gaze/thinking/curious motion. This prevents concurrent animations from replacing each other's transforms. A future `set_expression` tool may feed only validated values with a short expiry; it cannot directly supply CSS, timing, capture, power, or status values. The product describes these as expressive cues or moods, not proof that the model literally feels emotion.

## Why

- Local arbitration reacts immediately and still works offline.
- Orthogonal signals correctly represent user/assistant overlap in a full-duplex session.
- Bounded curiosity adds character without becoming constant distraction.
- Explicit priority, expiry, cancellation, and reduced-motion rules keep behavior truthful and testable.

## Consequences

- The device firmware needs a small deterministic director and an authoritative PMIC/fuel-gauge input. The browser prototype may use the optional host Battery Status API but must tolerate its absence.
- Expression assets cannot write capture/session indicators. Reviews test both visual character and privacy-state truth.
- Product research must tune frequency and poses; random motion is configuration within these safety bounds, not an unbounded model choice.

## Revisit when

Revisit the expression vocabulary after user testing or if the CoreS3 frame/audio budget cannot sustain the layered animations. Preserve the priority and truth boundaries even if the art changes.
