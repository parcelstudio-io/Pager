# ADR 0004 — Start with push-to-talk and BLE

Status: Accepted for EVT  
Date: 2026-08-30

## Context

The inspiration video feels voice-first and hands-free, but an always-open microphone and simultaneous loudspeaker create acoustic echo, false voice activity, interruption, power, privacy, and noisy-room problems. ESP32-S3 provides Bluetooth Low Energy but not Bluetooth Classic, which rules out ordinary A2DP headset support on this compute choice.

## Decision

Use touchscreen hold-to-talk on the CoreS3 Lite: hold begins capture, release sends, and another touch interrupts playback. Do not repurpose its power button, because the [vendor control documentation](https://docs.m5stack.com/en/core/CoreS3-Lite) assigns a long hold to shutdown. Add a product-like external top GPIO button on the relocatable acoustic mule and later carrier before judging ergonomics. Use BLE for provisioning and low-bandwidth accessories.

Include a mechanically latching microphone-kill slider and an indicator electrically coupled to physical mute state, such as a second switch pole or hardwired mute-latch output. Application software must not be able to falsely clear it.

After the half-duplex audio and enclosure pass, evaluate local VAD, wake phrase, full-duplex barge-in, and AEC as separate experiments.

## Why

- Push-to-talk makes turn boundaries and privacy obvious while exposing basic capture, streaming, playback, and latency failures.
- It avoids pretending that a demo-board microphone/speaker layout proves product acoustics.
- A deliberate AEC gate can compare software processing with a dedicated reference such as ReSpeaker Lite.
- BLE handles phone-assisted onboarding with much less scope than supporting consumer audio profiles.

## Consequences

- EVT is less magical than the inspiration video.
- The top control becomes a critical ergonomic component.
- The protocol must support output interruption from day one.
- Headphone users cannot assume A2DP support.
- A later hands-free decision will depend on privacy research, current draw, false-accept rate, acoustic return loss, and user tests.

## Revisit when

Revisit after the enclosed acoustic mule can quantify echo/noise and the team can demonstrate reliable barge-in, or if hands-free/A2DP is a launch requirement strong enough to justify a Linux-class or different Bluetooth architecture.
