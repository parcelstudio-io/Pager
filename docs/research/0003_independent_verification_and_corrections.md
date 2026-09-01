# 0003 — Independent verification and corrections

Status: Verification complete; corrections applied
Observed: 2026-08-30/31

The major load-bearing claims listed below were independently reviewed against live sources by a second reviewer, using parallel research passes whose material findings were then adversarially re-checked (a proposed correction was adopted only when a second, independent fetch of the primary source confirmed it). This document records what held, what changed, and what remains unverifiable; it is not a claim that every sentence in the repository was independently reproduced.

## What held (no change needed)

The original research was accurate on nearly every checked claim, including the obscure ones:

- **OpenAI Realtime**: model IDs `gpt-realtime-2.1` / `gpt-realtime-2.1-mini` (with audio pricing $32/$64 vs $10/$20 per 1M tokens — confirming the mini-as-baseline rationale at a ~3.2× spread), the 60-minute session limit, 24 kHz PCM16 as the only PCM rate (8 kHz G.711 is the sole alternative), `response.cancel`, `conversation.item.truncate` `{item_id, content_index, audio_end_ms}`, `server_vad`/`semantic_vad`, WebSocket-with-standard-key-on-backend guidance, and all six cited developers.openai.com URLs. One watch item: Azure's Realtime deployment still cuts sessions at 30 minutes — relevant only if the backend ever moves there.
- **M5Stack CoreS3 Lite**: exists (published 2025-07-18), SKU K128-LITE, $44.90, in stock; every spec matched (2-inch 320×240, 16 MB/8 MB, ES7210 + AW88298, 200 mAh, 54×54×16.5 mm, GC0308 camera present — so the cover/disable plan is necessary); the 6-second power-button hold; the `m5stack/StackChan` repo and `cores3_audio_codec.cc` (duplex TX/RX on one I²S port, `ES7210_SEL_MIC1|MIC2|MIC3`); and — verified to the schematic level — MIC3P/N connect to nets literally named `AEC_P`/`AEC_N`, coupled from the AW88298 outputs `SPK_VOP`/`SPK_VON`: the speaker-feedback reference is real, post-amplifier, and analog.
- **Cellular**: Waveshare SIM7600G-H HAT price/dimensions/antenna contents/5 V input; the SIM7600 hardware design guide's 3.4–4.2 V rail with 2 A transient requirement; Soracom plan-US $5 SIM with a 1 MB default allocation; Blues Notecard hardware-terms §10.5.3 telephony restrictions; Quectel RM520N ~30×52 mm; RG255C RedCap immaturity; Telit LE910Cx-NF US certification (2019 press release, line still shipping via Sixfab).
- **Small parts**: Adafruit 6049 (ICS-43434, $8.95), 3006 (MAX98357A, $5.95), 3923 (8 Ω 1 W, $1.95), 328 (2500 mAh, $14.95, 50×60×7.3 mm, no thermistor, ≤1.2 A charge); XIAO ESP32S3 $7.49; ReSpeaker Lite $24.90/35×86 mm/XU316/AEC-NS-AGC; Waveshare 27057 $14.99/240×280/33.13×41.13 mm; u-blox MAX-M10 current (GNSS was not part of the Trasna sale).
- **ESP32-S3 audio**: ESP-SR AEC is 16 kHz-only with dedicated full-duplex modes (`FD_LOW_COST` ≈ 19.6% CPU / 30.9 KB internal / 90 KB PSRAM); I²S full-duplex TX/RX sharing BCLK/WS; BLE 5 only, no Classic/A2DP.
- **Reference build audit**: video identity (with `[Satisfying]` prefix, published 2026-08-27), the guide's parts list including the “98357BGA” oddity, binary-only firmware via Google Drive + web.esphome.io with no source/license, xiaozhi.me configuration, and the upstream `78/xiaozhi-esp32` status (MIT, active, 4G precedent).

## What changed (corrections applied)

| Correction | Where applied |
|---|---|
| US prepaid data pricing was outdated: T-Mobile data-only is now $20/5 GB, $30/10 GB (+$25 one-time); AT&T from $35 (15 GB); Verizon from $40 (5 GB); MVNOs $10–15 | research 0001 |
| LEXI-R10 documentation is no longer stale: Trasna product page + R18 datasheet live; NA order code LEXI-R10401D (the module on the MIKROE NA Click) | research 0001 |
| SIM7600G-H annotated: not EOL but previous-generation; uncertified-IMEI T-Mobile rejections documented in the field; cheaper Cat-1 rehearsal (Waveshare SIM7670G ~$28) and certified-modem kit (Sixfab $140, Telit LE910C4-NF) named for Gate B | research 0001 |
| ADR 0003's WebRTC stance was stale: Espressif `esp-webrtc-solution` v1.3.0 (2026-08-26) runs the current Realtime API on ESP32-S3 over WebRTC/Opus/AEC with ephemeral client secrets; OpenAI's embedded repo defers to it. Two revisit triggers fired; the gateway now stands on policy grounds, with a Gate A latency comparison against the direct path | ADR 0003 amendment |
| Concrete Opus numbers added: `esp_audio_codec` v2.6.2, 20–510 kbps CBR; 16 kHz mono voice at ~20–24 kbps ≈ 9–11 MB/h per direction vs 173 MB/h raw PCM — changes UART/PPP feasibility and data-plan sizing | ADR 0005 amendment, edu 0002 |
| ESP-IDF 6.0 renamed provisioning: `wifi_provisioning` removed from core → `network_provisioning` component (v1.2.4); Security 2 is SRP6a + AES-GCM and recommended for production. Security defaults differ across releases, so firmware/app must explicitly compile out or reject Security 0/1 | ADR 0007 |
| The initial Starlink conclusion was too broad. A standard terminal remains only external Wi-Fi, but Starlink now advertises Direct-to-Cell IoT plans through participating carriers and compatibility with suitable Release-10+ Cat-1/Cat-1-bis/Cat-4 modems. It is a conditional carrier experiment, not a generic Starlink APN or MVP dependency | ADR 0002 amendment, research 0001 |
| Realtime conversation state is session-scoped, not a cross-device history database. OpenAI API data is not used for training by default, but default abuse-monitoring logs may retain content for up to 30 days; approved MAM/ZDR changes that posture, while `/v1/conversations` retains application state until deleted and is not ZDR eligible | ADR 0003/0007, design 0002 |
| BLE background constraints and its provisioning RAM cost make it the foreground commissioning/recovery link, not the live-audio or history transport. The gateway is the durable binding/config/history authority; Wi-Fi/APN secrets remain BLE-only | ADR 0007, design 0002 |
| Reference build presumed half-duplex: upstream xiaozhi README ties realtime full duplex to AEC-capable hardware, which the ESP32-C3 + INMP441 + MAX98357A path lacks | research 0002 |
| Switch price drift: JS102011SAQN $0.85, PTS645VL39-2 LFS ~$0.31 | research 0001 |
| Dead UN 38.3 URL replaced with the Rev.8 (2023) + Amendment 1 (2025) page | edu 0004 |
| Reconnect timers made uniformly two-tier: 15 s transport restore (NW-02a) with a deliberately tighter 10 s capture-reopen deadline (NW-02c) now cited consistently in the design narrative, edu 0001, and plan Days 11/13 | design 0001, edu 0001, daily plan |

## What was added (owner requirements that were missing entirely)

Three of the product owner's explicit requirements had no coverage anywhere in the repository; they now do:

1. **Sliding caption below the face** → PR-07, design elements, ADR 0003/0006 caption amendments (driven by `response.output_audio_transcript.delta`/`.done`; optional user captions via `session.audio.input.transcription` with `gpt-live-transcribe`, $0.017/min; the display clears immediately on interruption while the device still computes its heard boundary because the provider does not send a truncated transcript back).
2. **Companion mobile app with BLE provisioning, cellular configuration, and conversation history** → [ADR 0007](../decisions/0007_use_companion_app_and_cloud_history_sync.md) and the detailed [sync architecture](../design/0002_companion_app_and_sync_architecture.md): Security-2 foreground commissioning; BLE-only Wi-Fi/APN secrets; gateway-authoritative binding/config/history; opaque-cursor, idempotent, purgeable history sync; and explicit provider-retention disclosure.
3. **Exactly two physical controls** → [ADR 0008](../decisions/0008_use_exactly_two_physical_controls.md), superseding the mic-kill slider, side volume buttons, and shipping push-to-talk fallback. The conversation button always starts/stops a full-duplex session in normal operation; the power slide switch physically de-energizes the system; a boot-only chord enters capture-gated recovery without transferring ownership.

## Unverifiable (kept hedged, do not treat as confirmed)

- The shared ChatGPT page body (title confirmed; the 95×60×30 mm content renders only for logged-in browsers) — snapshot it.
- xiaozhi.me's “Open Source” tier wording (JS app; not fetchable anonymously).
- The reference build's exact module identities beyond the ESP32-C3 and 0.96-inch OLED (AliExpress links login-gated; item IDs recorded in research 0002).
- The guide's wiring-diagram GPIO assignments (image only).
- platform.openai.com pages return 403 to anonymous fetches (valid for logged-in users; not dead).

Prices and stock were observed 2026-08-30/31 and, as research 0001 already mandates, must be rechecked at checkout.
