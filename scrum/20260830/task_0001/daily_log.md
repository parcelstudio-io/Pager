# Task 0001 — daily log

Actual execution record. The [daily plan](daily_plan.md) is the intent; this file is what happened. Record real dates, orders, measurements, receipts, and deviations. Never rewrite the plan to match history — note the deviation here and, when a decision changes, add or amend an ADR.

## Day 1 — 2026-08-31

**Purchase made.** One M5Stack CoreS3, **K128 (full version, not the K128-LITE the plan specified)**.

| Field | Value |
|---|---|
| Source | [Amazon — M5Stack Official Store](https://www.amazon.com/M5Stack-CoreS3-ESP32S3-IoT-Develpment/dp/B0C7G5GPGC), Ships from Amazon |
| Price paid | $77.90 (list $59.90 direct / DigiKey) |
| Ordered | 2026-08-31 |
| ETA | 2026-09-02, free two-day |
| Returns | Free 30-day refund/replacement |
| Listing specs confirmed | ESP32-S3 240 MHz, 8 MB PSRAM, 16 MB flash, 2.0" capacitive touch, dual mic + speaker, IMU, RTC, camera |

**Deviation from plan, and why.** The plan and [ADR 0001](../../../docs/decisions/0001_use_esp32s3_interaction_mule.md) specified the CoreS3 Lite at $44.90. Two things changed the choice:

1. *Variant.* The full K128 carries a 500 mAh cell against the Lite's 200 mAh and adds expansion, for $15 at list. Since this board is a development tool rather than a product part, the decision was made on asymmetry: overpaying $15 costs $15, whereas a Lite lacking reachable GPIO would have cost a second board plus roughly a week of blocked Day 8–12 work.
2. *Channel.* DigiKey (authorized, 118 units, list price) was rejected on delivery time. Amazon's M5Stack Official Store carried an $18 premium but delivered free in two days and is still the manufacturer's own storefront, so authenticity is intact and returns are covered. List-plus-overnight from a distributor would have cost more than $77.90.

Recorded as an [amendment to ADR 0001](../../../docs/decisions/0001_use_esp32s3_interaction_mule.md) rather than a new record, because the compute decision itself is unchanged — the CoreS3 family shares one schematic, and the ES7210 / AW88298 / MIC3 echo-reference audio path this project depends on is identical across variants.

**Still open from Day 1.** The USB-C data cable was not part of this order; confirm a known-good data-capable cable is on hand before the board arrives, since power-only cables produce misleading flash and debug failures.

**Carry into Day 6 incoming inspection.**

- Confirm actual box contents — base module present or absent, battery capacity as marked. The Amazon listing's "what's in the box" field is an auto-generated feature dump and is not evidence.
- Enumerate which GPIO are free and physically reachable, and whether a second I²S bus can be routed out, since Day 8 gates the acoustic-mule order on exactly that.
- Photograph packaging and board revision; place the opaque camera cover before first boot.

## Day 2 — 2026-08-31 implementation ready; live acceptance pending

**Implemented.** Added the zero-dependency localhost session broker and browser device simulator described in the [V1 high-level design](../../../docs/prototype/0001_v1_high_level_design.md). The slice keeps the standard API key server-side, uses the unified WebRTC session flow, models input/output independently for full duplex, provides one start/stop action, and places the sliding assistant caption below the face.

**Offline evidence.** Nineteen automated tests pass for the server-owned session configuration, key/origin/static-file boundaries, disconnect cleanup, caption pacing/interruption, media teardown, stale-event rejection, full-duplex state overlap, and response completion. Syntax, whitespace, local-link, localhost runtime, and initial visual smoke checks also pass.

**Not yet claimed.** No real API key was available in the workspace, so the ten-exchange live conversation, voice interruption, timing trace, and actual provider transcript/audio event sequence remain unchecked. Complete the laptop acceptance checklist in the [beginner build guide](../../../docs/prototype/0002_v1_beginner_build_guide.md) before marking Day 2's live exit condition complete. The K128 hardware checks remain pending its arrival.

### Day 2 continuation — curious eyes and contextual prompt seam

**Implemented.** Split each eye into an activity rig, blinking round shell, and gaze-owning pupil, then added a deterministic local expression director. It composes actual session/input/output activity, validated expiring affect, host-reported battery energy when available, and randomized ambient mood. The face starts calm and centered. Eligible idle time produces its first synchronized gesture after 3–5 seconds, then uses 6–12 second centered pauses between 1.6–2.4 second look-up, look-down, side-to-side look-around, or clockwise/counterclockwise roll gestures. Every gesture returns to center; speech, thinking, faults, low battery, hidden state, and reduced-motion preference cancel them. Capture indication remains outside this cosmetic layer.

Added the root `prompt/mochi-realtime.ftl` template beginning `You are a companion` and a zero-dependency server renderer. It strictly reconstructs allowlisted user facts, server-selected history, retrieval/search results, and device context as escaped JSON under category/final-size limits. The localhost session broker obtains that context only from a server-side provider and still accepts SDP only from the browser. Default localhost context honestly reports history/user data unavailable and search not requested; production authentication, consent, finalization, retrieval, and durable history remain unimplemented.

**Browser regression and root cause.** The first browser integration could leave the eyes motionless and the conversation button inert. The director stored the browser timer function and invoked it as an instance method, incorrectly making the director the timer's receiver. Because the app constructed that statically imported director during top-level initialization, the failure occurred before the Start/Stop listener was installed. The fix wraps timer calls so they never receive the director as `this`, binds Start/Stop first, and dynamically loads expression as an optional enhancement. Import or initialization failure now leaves the initial centered static face and a sanitized diagnostic without disabling conversation control.

**Evidence.** The expanded suite passes 51 automated tests, including the browser-timer receiver regression, optional face-controller load ordering/fallback and runtime update/dispose isolation, first/repeat idle timing, center return, injected timer/random expression priorities, cancellation and stale-callback rejection, reduced-motion and low-battery-while-charging suppression, bounded context-retrieval timeout, template/schema/injection/credential/URL checks, and proof that browser SDP cannot override the server-rendered Realtime instructions. Syntax and whitespace checks pass. A configured headless-browser smoke test used a fake microphone, received a 200 SDP answer from OpenAI Realtime, reached `Live · full duplex`, and returned to private idle on Stop while a separate idle sample observed synchronized `center → look-up → center` motion with no runtime exception. A spoken exchange, rendered-audio acceptance, and CoreS3 behavior remain pending.
