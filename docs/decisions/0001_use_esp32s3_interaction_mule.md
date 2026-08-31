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

## Revisit when

Revisit if the MCU cannot sustain display animation plus audio transport, required codecs do not fit, secure OTA is untenable, AEC needs unavailable acceleration, or Bluetooth Classic becomes a non-negotiable product requirement.
