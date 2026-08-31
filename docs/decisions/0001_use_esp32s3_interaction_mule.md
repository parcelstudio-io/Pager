# ADR 0001 — Use an ESP32-S3 integrated interaction mule

Status: Accepted for EVT  
Date: 2026-08-30

## Context

We need to learn whether the face, touch, audio path, network streaming, latency, and personality make a compelling companion. A bare MCU plus separate screen, microphones, amplifier, speaker, charger, and battery creates many wiring variables before those product questions can be answered. A Linux SBC offers familiar software but adds boot time, power, storage integrity, supply, and size concerns.

## Decision

Use one M5Stack CoreS3 Lite as the interaction mule. Its ESP32-S3, 2-inch touch screen, dual microphones, codec/amplifier/speaker, Wi-Fi/BLE, PSRAM, flash, and small battery provide a compact known assembly. Use a desktop LVGL simulator in parallel for face work. Keep the final compute module open until measurements exist.

The device performs local UI, input, audio capture/playback, buffering, connectivity, credentials, and diagnostics. It does not run the language model.

## Why

- It collapses a week of breadboard integration into a reproducible starting point.
- Its 54 mm square face fits inside the maximum product envelope and supports the intended expressive UI.
- ESP32-S3 has enough memory and peripherals for compressed streaming and a local state machine.
- Embedded boot time and power are more representative of the eventual pager than a Pi-class board.

## Consequences

- Its 200 mAh battery is not a runtime prototype.
- The built-in camera is out of MVP scope: omit its driver/clock initialization and cover the aperture opaquely during EVT; production hardware omits it.
- The board fixes some audio/layout choices, so later acoustic conclusions must be repeated on the custom geometry.
- ESP32-S3 supports BLE, not Bluetooth Classic/A2DP.
- We may later choose XIAO ESP32-S3 or a module-on-carrier design after pin, memory, thermal, and mechanical needs settle.

## Amendment — 2026-08-30: full-duplex validation load

[ADR 0006](0006_use_button_started_full_duplex_sessions.md) changes the interaction target without changing this mule selection. The CoreS3 must now be measured under simultaneous capture/playback, local AEC/VAD, codec, encrypted transport, UI, and barge-in load. Its feature list is not proof of product capability. Failure to retain the defined CPU, memory, audio-deadline, power, and acoustic margins triggers this record's compute/AEC revisit condition.

## Amendment — 2026-08-31: the full CoreS3 (K128) was purchased instead of the Lite

This record selected the K128-LITE. The unit actually bought on 2026-08-31 is the full **CoreS3, K128** — $77.90 from the M5Stack Official Store on Amazon (list $59.90; the premium bought free two-day delivery to New York against a 1–3 week ship from Shenzhen, and was still cheaper than list-plus-overnight from a distributor). Arrival 2026-09-02.

The variant change does not disturb this decision. M5Stack publishes one schematic across the family, so the ESP32-S3, 16 MB flash, 8 MB PSRAM, 2-inch 320 × 240 capacitive display, and — decisively — the ES7210 dual-microphone codec, AW88298 amplifier, and MIC3 post-amplifier echo-reference lane are identical to the Lite's. Every measurement this record exists to enable is unaffected, and firmware ports between variants unchanged.

What the K128 adds: a 500 mAh cell rather than 200 mAh, which materially improves untethered demonstration time (this record's "not a runtime prototype" consequence still stands — it is a better mule battery, not evidence for product runtime), plus M5Stack's base module and its expansion. Because the choice is a development-tool convenience rather than a product commitment, the extra $18 was judged against the asymmetry of being wrong: a Lite lacking accessible GPIO would have cost a second board plus a week of blocked Day 8–12 work.

Open item for Day 6 incoming inspection: confirm what the box actually contains (base module present or absent, battery capacity as marked) and enumerate which GPIO are free and physically reachable for the Day 12 external microphone, amplifier, and illuminated button. The Amazon listing's "what's in the box" text is an auto-generated feature dump and is not evidence of contents.

## Revisit when

Revisit if the MCU cannot sustain display animation plus audio transport, required codecs do not fit, secure OTA is untenable, AEC needs unavailable acceleration, or Bluetooth Classic becomes a non-negotiable product requirement.
