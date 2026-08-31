# 0001 — Mochi Pager product concept

Status: Concept selected for EVT  
Date: 2026-08-30  
Maximum envelope: 95 × 60 × 30 mm

## The idea

Mochi is a small voice companion that feels more like a friendly pager than a shrunken phone. Its screen is primarily a face, not an app grid. It reacts instantly when touched or spoken to, maintains a recognizable personality, and makes its listening, thinking, speaking, muted, and offline states legible without demanding attention.

The reference prototype gets one thing exactly right: two luminous eyes and a little motion create more character than a dense UI. Mochi keeps that clarity while replacing the exposed brass frame and cell with a safe rounded enclosure, explicit privacy controls, measurable acoustics, and a service architecture we own.

![Mochi Pager concept views](assets/mochi_pager_concept.svg)

## Physical language

- Rounded pebble/pager body with a matte cream, mint, coral, or lavender shell and an optional replaceable silicone bumper.
- Black approximately 1.7–2.0-inch display window occupies most of the front, pending product geometry. The CoreS3 mule fixes only its EVT screen at 2 inches. The normal view has two high-contrast eyes, a small mouth only when it adds expression, and one compact status line.
- Two microphone ports sit away from the speaker path. A lower-front or lower-side speaker grille points toward the user without hiding behind a hand.
- The product has a large top push-to-talk/action button; volume buttons live on one side. Gate A uses touchscreen hold-to-talk because the CoreS3 Lite's side power button must not be repurposed. A product-like external GPIO button is added on the acoustic mule before ergonomic judgment.
- A separate, mechanically latching microphone-kill slider physically interrupts or gates microphone capture. An amber/red indicator is electrically coupled to that state, such as through a second switch pole or hardwired mute-latch output, so application software cannot falsely clear it.
- USB-C is on the bottom. A lanyard eye and removable back clip support the pager metaphor.
- No camera is part of the MVP. During EVT, physically cover the interaction mule's camera aperture and omit camera drivers/permissions; production hardware omits the sensor entirely.

The public shared answer proposes 95 × 60 × 30 mm; Mochi adopts that as a maximum rather than attributing “maximum” to the source. The EVT stretch target is approximately 80 × 56 × 26 mm, subject to real component, antenna, acoustic-cavity, and battery measurements. Comfort and RF performance take precedence over hitting the stretch dimensions.

The reference footage does not show a discernible mouth or smile. Mochi's mouth, cheek, and smile states are original additions.

## Character and expression system

The face must never wait on the network to acknowledge a physical action. A local state machine drives 30 fps animation and receives optional emotional accents from the assistant.

| State | Immediate visual behavior | Source of truth |
|---|---|---|
| Booting | Eyes stretch awake; short progress arc | Device |
| Idle | Slow breathing motion and irregular blinks | Device |
| Listening | Eyes widen and lean toward a tiny input meter | Button/VAD |
| Thinking | Eyes glance upward; three subtle dots travel | Conversation state |
| Speaking | Mouth/cheeks respond to local audio amplitude | Audio output |
| Delighted | Crescent eyes and a brief smile/bounce | Assistant accent |
| Confused | One eye tilts; question mark appears briefly | Assistant accent/error |
| Muted | Zipped mouth plus hardwired mute indicator | Physical switch |
| Offline | Cloud breaks into two pieces; face remains usable | Network manager |
| Low battery | Sleepy eyelids and unobtrusive battery mark | Power manager |

The assistant may call a constrained `set_expression` tool, but connectivity, mute, battery, and conversational states always win. This avoids a cheerful face when the microphone is muted or the network has failed.

## First interaction model

EVT starts with push-to-talk and half-duplex turn taking. Touchscreen hold/release is the first mule input; an external product-like top button replaces it for the acoustic/mechanical mule. Holding wakes the face and begins capture; releasing commits the utterance. A new touch/press interrupts playback. This is less magical than always-listening full duplex, but it gives us deterministic privacy and separates basic audio transport from the genuinely difficult acoustic echo-cancellation problem.

After acoustic and privacy gates pass, we can evaluate hands-free voice activity detection, a local wake phrase, and barge-in. BLE is for onboarding and low-bandwidth accessories in the MVP. ESP32-S3 does not support Bluetooth Classic, so ordinary A2DP headphones are explicitly outside the first architecture.

## System shape

```text
 touch / PTT / microphones
           |
           v
 +------------------------+       Wi-Fi first, 4G failover
 | Mochi device           |============== TLS WebSocket =============+
 | local face + audio I/O |                                           |
 | credentials + metrics  |                                           v
 +------------------------+                              +-------------------------+
           ^                                            | Our device gateway      |
           |                                            | auth, codec, policy,    |
           | audio + state                              | tools, metrics, routing |
           +--------------------------------------------+-----------+-------------+
                                                                  / \
                                                                 /   \
                                                                v     v
                                                   OpenAI Realtime   opt-in memory/
                                                   API               tool services
```

The device holds a per-device credential, never a standard OpenAI API key. The gateway authenticates devices, rate-limits use, keeps provider credentials private, normalizes audio and events, exposes only allowed tools, and makes provider/model changes possible without reflashing every pager.

For development, `gpt-realtime-2.1-mini` is the cost-conscious baseline and `gpt-realtime-2.1` is the quality comparison. The model name stays configuration-driven because model availability and pricing change. The product connects to the OpenAI API; a ChatGPT subscription is not the device backend.

## Connectivity and memory

Wi-Fi is preferred because it is cheaper, cooler, and easier to validate. A phone hotspot is the first cellular-backhaul experience test; it does not validate Mochi's onboard modem, RF, power, carrier compatibility, or failover. Standalone LTE Cat 4 is introduced as an external bench modem/power mule only after the voice experience works over Wi-Fi. Its 56 × 65 mm-class HAT is not an enclosure part. Before carrier freeze, the selected embedded host must prove one exact modem interface under simultaneous encrypted voice, display, and audio load.

When a route fails, Mochi cancels rather than replays the incomplete turn, shows reconnecting, establishes a new authenticated transport/application session, reconstructs only committed conversational state, and returns to idle. This avoids duplicating a side-effecting tool call. Full 5G is deferred: current modules impose several antennas, USB 3, multi-amp supply peaks, thermal design, cost, and certification burden without improving the core interaction enough at pager scale.

Local storage contains firmware, face assets, settings, encrypted credentials, and a bounded diagnostic ring buffer. It is not long-term conversational memory. Server-side memory is opt-in and stores compact user facts or summaries, not raw microphone audio by default. The user gets visible controls to inspect, forget, or disable memory. GPS/GNSS remains optional and off unless a concrete feature justifies its privacy and power cost.

## MVP experience narrative

1. The user powers Mochi on; it stretches awake and reconnects to known Wi-Fi.
2. Holding the touchscreen region on the first mule—or the top button on the product-like mule—makes the eyes attentive immediately.
3. The user asks a question and releases. Recognized text may scroll in a compact line while the eyes think.
4. Mochi answers aloud; its face moves with the output amplitude and an occasional model-selected accent.
5. Pressing again interrupts speech. Sliding the mute switch immediately closes capture and illuminates the physical indicator.
6. If Wi-Fi disappears, the face explains the change, attempts cellular failover when fitted, and recovers without losing its personality.

## What makes this an EVT rather than a toy demo

The acceptance demo includes a ten-turn conversation, interruption, physical mute, offline/reconnect behavior, Wi-Fi and phone-hotspot measurements, and recorded latency/current/data-use evidence. It must work inside an insulating enclosure with an intact protected cell. The exterior is never an electrical ground, and antenna clearance is designed rather than improvised.

Related decisions: [compute mule](../decisions/0001_use_esp32s3_interaction_mule.md), [connectivity](../decisions/0002_use_wifi_first_and_4g_lte_failover.md), [gateway](../decisions/0003_use_secure_realtime_gateway.md), [interaction](../decisions/0004_start_with_push_to_talk_and_ble.md), and [PCB strategy](../decisions/0005_build_modular_carrier_before_integrated_rf.md).
