# ADR 0010 — Use local hierarchical expression arbitration

Status: Accepted for EVT
Date: 2026-08-31

## Context

Two round eyes must communicate conversation activity, affect, battery condition, and a curious personality at the same time. A single exclusive animation state would make full-duplex overlap impossible and could let a random or model-requested expression hide an actual fault or listening state. Network-dependent animation would also make physical interaction feel delayed.

## Decision

A local expression director combines four orthogonal channels:

1. authoritative activity (`fault`, `connecting`, `duplex`, `listening`, `speaking`, `thinking`, `idle`);
2. an allowlisted, expiring affect hint selected from the shared 28-value emotion contract, ranging from `neutral`, `happy`, and `curious` through alert, reflective, social, negative, tired, and focused cues;
3. battery capacity energy (`normal`, `low`, `critical`) plus an independent charging flag/glow; and
4. an ambient mood (`calm`, `curious`, `playful`, `pensive`, `tired`, or locally randomized `auto`).

These channels compose rather than following one global animation priority. Activity always owns the truthful conversation motion. Battery capacity always owns energy/openness; charging adds a glow without hiding low capacity. Within expression geometry, fault/low capacity wins, followed by validated affect, an activity-derived default, and ambient mood. Within coordinated pupil/aperture gaze, active conversation motion wins over static affect or idle curiosity. Capture status remains a separate hardware/session truth: no eye pose may turn the amber/cyan/off indicator on, imply microphone capture, or override the conversation button.

The resting face starts calm and centered. A subtle continuous layer keeps the outer eyes alive and changes cadence and amplitude by emotion; it is deliberately smaller than gaze motion. While fully idle, normal-powered, visible, and motion-enabled, the director waits 3–5 randomized seconds before its first large gesture and 6–12 randomized seconds between later gestures. Each 1.6–2.4 second gesture moves both pupils and ivory apertures together: look up, down, side to side, toward any of four corners, or scan clockwise/counterclockwise. Every gesture returns to center. Speech, thinking, connection state, a fault, low battery, page hiding, or reduced-motion preference cancels large curiosity immediately. Reduced-motion preference disables both layers. All randomness and timers are injectable for deterministic tests. Low/critical battery suppresses random idle motion and gives the resting face a lower gaze, reduced openness, lower brightness, and less animation energy; truthful active-conversation movement may still take precedence.

CSS animation ownership is layered: an eye rig owns conversation movement, a gaze carrier owns the larger aperture shift, an alive-motion carrier owns persistent emotion cadence, the ivory eye shape owns geometry and blinking, and each dark pupil owns precise gaze within its aperture. This prevents concurrent animations from replacing each other's transforms. The Realtime `set_pager_emotion` function may feed only a value from the shared allowlist and a bounded expiry; it cannot directly supply CSS, capture, power, battery, connectivity, or status values. Function-call output is acknowledged before the model continues speaking, so metadata such as `pager_emotion: happy` is never speech or caption text. The product describes these as expressive cues or moods, not proof that the model literally feels emotion.

Expression is a cosmetic enhancement, not a dependency of the privacy or conversation path. V1-A binds Start/Stop and renders a calm centered fallback before it dynamically loads the director. Import or initialization failure marks that optional controller unavailable and retains the fallback. A later timer/animation fault may stop cosmetic motion but cannot remove the already-wired button, session reducer, caption, or capture indicator. Supplied browser timer functions are called through wrappers so they are never accidentally invoked with the director instance as their receiver.

## Why

- Local arbitration reacts immediately and still works offline.
- Orthogonal signals correctly represent user/assistant overlap in a full-duplex session.
- Bounded curiosity adds character without becoming constant distraction.
- Explicit priority, expiry, cancellation, and reduced-motion rules keep behavior truthful and testable.

## Consequences

- The device firmware needs a small deterministic director and an authoritative PMIC/fuel-gauge input. The browser prototype may use the optional host Battery Status API but must tolerate its absence.
- Expression assets cannot write capture/session indicators. Reviews test both visual character and privacy-state truth.
- The browser simulator must preserve conversation controls and a static centered face when optional expression code is unavailable.
- Product research must tune frequency and poses; random motion is configuration within these safety bounds, not an unbounded model choice.

## Revisit when

Revisit the expression vocabulary after user testing or if the CoreS3 frame/audio budget cannot sustain the layered animations. Preserve the priority and truth boundaries even if the art changes.
