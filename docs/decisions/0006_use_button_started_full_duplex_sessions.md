# ADR 0006 — Use button-started full-duplex conversation sessions

Status: Accepted for EVT

Date: 2026-08-30

Qualification: Product target; capability not yet validated

Supersedes: interaction portion of [ADR 0004](0004_start_with_push_to_talk_and_ble.md)

Current reading: the 2026-08-31 amendments at the end supersede every user-facing push-to-talk, `mode`, held-button, dedicated microphone-kill, fallback-validation, and low-bandwidth-accessory statement in the original body. Shipping behavior has one conversation-button start/stop contract plus the power switch defined by ADR 0008; MVP BLE is foreground provisioning/recovery, network tests, and bounded diagnostics only.

## Context

Mochi should feel like a live conversation, not a sequence of voice messages. The desired behavior is the pattern demonstrated by ChatGPT Live: once a conversation is active, the user can speak while the assistant is speaking and that new speech can interrupt the response. Requiring a press and release for every utterance breaks that experience.

Full duplex does not mean an ambiguous microphone that is active all day, nor does it remove internal speech segmentation. It means that capture and playback remain active concurrently inside a deliberately opened session. Voice activity and semantic turn detection still identify speech segments for the model.

The hardware path is plausible but unproven as a product. M5Stack describes the CoreS3 Lite's ES7210 dual-microphone and AW88298 speaker path as a full-duplex audio solution. Its schematic and reference firmware expose a synchronized speaker-reference input through ES7210 MIC3 alongside simultaneous I2S receive/transmit. ESP32-S3 has simultaneous I2S capability, and Espressif supplies full-duplex AEC modes. None of those facts proves acceptable echo cancellation in Mochi's enclosure, at its speaker volume, while the display, network, codec, and UI are also running.

## Decision

Make a visibly active, button-started full-duplex session the EVT product target:

- In the default full-duplex mode, from private idle, one press of the top conversation button requests a live session. The local face and button indicator show amber `CONNECTING`; only after authentication and the local capture gate are ready do they switch to cyan `LIVE` and permit the first microphone frame. They never wait for model output.
- While `LIVE`, the microphone capture and speaker playback pipelines run concurrently. The user does not press between utterances.
- A second press, including while connecting or reconnecting, closes the live session locally. The device first gates microphone capture, clears playback, cancels and truncates any active response when reachable, and then returns to private idle. This control cannot depend on a gateway/provider acknowledgement. Outside cyan full-duplex `LIVE`, microphone frames can leave only during an explicitly held, cyan-indicated push-to-talk fallback capture.
- In the default full-duplex mode, the button indicator is owned by the device capture/session state, not the model: off means no live-session intent and capture closed; amber means connecting/reconnecting with uplink gated; steady or breathing cyan means capture is actually live. The face conveys the same state without relying on color alone. The separately labelled fallback uses the indicator semantics defined below.
- The mechanically latching microphone-kill slider remains the independent privacy authority. Engaging it physically gates capture, terminates any live-session intent locally, clears playback, turns the conversation-button light off, and shows the `MUTED` face with its electrically coupled amber/red indicator. Disengaging it returns to private idle and never resumes capture automatically; a fresh conversation-button press is required. A start press while killed cannot open a session. This control overrides software, network, and model.

Within a live session, use concurrent media pipelines and composable state rather than one exclusive turn state:

```text
session: inactive | connecting | live | reconnecting
input:   killed | gated | quiet | user_speaking
output:  idle | generating | playing
mode:    full_duplex | push_to_talk_fallback
```

`user_speaking + playing` is valid for the short interval while a barge-in propagates. The face may animate speech output while simultaneously showing that it hears the user. `session=live + input=killed` is not a stable combination: the hardware-kill edge transitions the session to inactive.

The embedded audio front end receives both the microphone signal and a synchronized render reference. On the CoreS3 mule, use and verify the board's ES7210 MIC3 speaker-feedback lane rather than assuming a software PCM tap describes the post-amplifier path. A custom mule/carrier must explicitly document whether its AEC reference is post-amplifier analog feedback, rendered digital PCM, or both. Align and gain-stage the reference, establish full-duplex AEC first, then A/B noise suppression and conservative gain control rather than enabling an opaque processing stack. Send the resulting near-end stream continuously in bounded frames.

Current ESP-SR full-duplex AEC is 16 kHz while the current OpenAI Realtime PCM interface uses 24 kHz. Start with a measured 16 kHz device audio/AEC path and perform explicit 16↔24 kHz resampling in the gateway; do not hide rate conversion inside an unspecified codec step. Local VAD exists for fast UI and barge-in response; provider semantic VAD remains configuration-driven and decides when to create a response.

For a speech-driven interruption:

1. Local post-AEC VAD detects near-end speech during playback and immediately ramps down and clears the device jitter buffer. Because the CoreS3 capture and render path shares audio clocks, TX DMA continues feeding silence; barge-in must not tear down the clock needed by microphone RX.
2. The device reports the stable active output ID plus the number and rate of samples actually rendered, not merely received.
3. The gateway maps that output ID to the provider `item_id` and `content_index`, converts the cursor and calibrated fixed output latency to `audio_end_ms`, rejects later audio for the cancelled response, propagates cancellation, and emits `conversation.item.truncate` at the heard boundary so unheard words do not remain in context.
4. Capture continues without a new button press; end-of-speech detection creates the next response.

The device protocol therefore carries independent input sequence numbers, `input_segment_id`, `response_id`, a stable `output_id`, output sequence numbers, rendered sample count/rate, VAD events, cancellation, and idempotent truncation acknowledgements. The gateway adapter owns the provider `item_id`/`content_index` mapping and `audio_end_ms` conversion. Local audible-stop latency, render-boundary accuracy, and provider acknowledgement/error latency are three separate measurements. Tool side effects already executed are not undone by an interruption; consequential tools require explicit confirmation and idempotency controls.

Keep push-to-talk as an explicit diagnostic and degraded fallback using the same secure transport. Enter or exit it only through a clearly labelled on-device settings/service control while capture is closed; an AEC failure closes the full-duplex session before offering fallback and never changes the button gesture mid-session. The normal second-press-to-stop rule is scoped to default full-duplex mode. In fallback, the face persistently labels `PUSH TO TALK`; holding the conversation button starts cyan-indicated capture and releasing sends, while the button is off between utterances and amber while its transport connects. The labelled settings/service control closes the fallback transport and returns to private idle. Hardware kill closes capture and prevents a hold from starting it. The product must never silently call a half-duplex session full duplex. A failed AEC gate is a failed product-target gate that reopens acoustics, audio-front-end, or compute selection.

Connecting and reconnecting are fail-closed: amber means microphone uplink is gated and raw samples are discarded rather than buffered. Any recoverable route, gateway, or provider transport/session failure that enters `reconnecting` starts one non-extendable grace timer of at most 10 seconds; retries and changes in failure cause cannot reset it. A surviving live-session intent may return to cyan `LIVE` only if a new authenticated provider session is ready inside that window. Expiry clears the intent, turns the indicator off, and returns to private idle; a later connection cannot resume capture without a fresh press. Because OpenAI currently limits a Realtime session to 60 minutes, renew before that provider limit using a new `session_epoch`; gate capture during the handoff, carry forward only committed context, and return to private idle if renewal fails.

BLE remains limited to provisioning and low-bandwidth accessories. ESP32-S3 still does not provide Bluetooth Classic/A2DP.

## Why

- One deliberate start/stop control makes microphone state legible while removing per-turn button friction.
- Continuous input permits natural corrections and voice barge-in. For MVP, confirmed near-end speech during playback means “interrupt”; distinguishing a non-interrupting backchannel is a later policy experiment.
- Local playback stopping feels immediate; provider cancellation and truncation keep cost and conversation context aligned with what the user actually heard.
- Building the playback-reference, identifiers, queues, and metrics now avoids an architectural rewrite after a half-duplex prototype hardens.
- The CoreS3 Lite is a credible feasibility mule because its documented audio path is full duplex, while the acoustic gate prevents that label from being mistaken for product evidence.

## Consequences

- AEC, clock/delay alignment, double-talk behavior, and enclosure acoustics move from future polish into Gate A.
- Continuous capture, AEC, and simultaneous network/audio work increase CPU, memory, bandwidth, current, and thermal load.
- The UI state model, latency metrics, and protocol can no longer be organized around a single `turn_id` or mutually exclusive `LISTENING`/`SPEAKING` states.
- False VAD starts can interrupt good responses; missed VAD starts make Mochi talk over the user. Both need measured thresholds and noisy-room tests.
- Privacy depends on a truthful live indicator, immediate stop behavior, and the separate hardware kill control.
- Push-to-talk remains available for diagnosis and degraded use but does not satisfy the full-duplex EVT acceptance gate.

## Validation gate

Before the interaction architecture passes:

- demonstrate a 65-minute button-opened session that crosses a provider-session renewal without DMA overflow, playback underflow, missed audio-processing deadlines, watchdog reset, context replay, or stale audio after cancellation;
- prove speech-driven barge-in at multiple user positions and safe speaker volumes, including double-talk, with measured local-stop and upstream-cancel latency;
- pass a labelled endpoint corpus covering internal pauses, fillers, corrections, silence, and nonspeech noise without exceeding the early-cutoff, missed-endpoint, or spurious-response requirements, and report non-addressed background-speech behavior separately;
- measure false barge-ins from assistant-only playback, background speech, noise, handling, and enclosure vibration;
- log capture/render clock alignment, AEC reference delay, residual echo, CPU, internal RAM, PSRAM, queue depth, network bytes, current, and temperature; retain at least 20% measured CPU headroom under the worst permitted concurrent load and define a safe internal/DMA-memory floor from mule measurements;
- verify that one stop-button press and the hardware kill control each cease uplink audio under network/provider faults; and
- demonstrate the visibly distinct push-to-talk fallback without counting it as a full-duplex pass.

## Amendment — 2026-08-31: sliding live caption

Requirement PR-07 adds an owner-mandated sliding caption below the face. The device protocol therefore also carries caption text deltas keyed to the same `response_id`/`output_id` as audio (assistant captions from `response.output_audio_transcript.delta`/`.done`; optional user captions from `conversation.item.input_audio_transcription.delta`/`.completed`, enabled via `session.audio.input.transcription`). Transcript deltas can run ahead of rendered audio, so the device paces or trails the caption against playback, and on barge-in it trims the displayed caption to the heard boundary itself — the provider truncates its context but does not send back a truncated transcript. Caption first-render latency and caption/audio drift join the measured metrics.

## Amendment — 2026-08-31: two physical controls

[ADR 0008](0008_use_exactly_two_physical_controls.md) supersedes this record's microphone-kill-slider paragraphs. The independent privacy authority becomes the latching power slide switch (off physically de-energizes the system), and the truthfulness guarantee moves to the carrier's single capture-enable net driving both the microphone gate and the cyan indicator. The `input: killed` state and `MUTED` face are replaced by power-off; everything else in the session/interaction model is unchanged. The hardware-kill fault-injection tests become power-switch and capture-enable-net tests.

## Amendment — 2026-08-31: no shipping push-to-talk mode

The owner's latest two-control requirement also supersedes this record's user-facing push-to-talk fallback, `mode` state, held-button gesture, and fallback validation bullet. In every shipping product state, the conversation button has one stable meaning: press once to request a full-duplex session and press again to stop it. Holding the button does not silently change capture semantics. If AEC or another full-duplex gate fails, the device closes capture, returns to private idle, and reports the fault; a half-duplex interaction is not offered as degraded product behavior.

Push-to-talk may remain only in a developer-only firmware target or external test fixture to isolate transport and AEC faults. It is inaccessible in production builds, is not a third physical control or product interaction, and cannot satisfy any EVT product-acceptance gate. The detailed boot-only setup chord and two-control behavior are defined by [ADR 0008](0008_use_exactly_two_physical_controls.md).

## Amendment — 2026-08-31: accessory BLE is deferred

[ADR 0007](0007_use_companion_app_and_cloud_history_sync.md) supersedes this record's low-bandwidth-accessory scope. MVP BLE is a foreground, time-bounded provisioning/recovery and diagnostic transport that shuts down before live audio. Accessory pairing, conversation audio, history transport, and Bluetooth Classic/A2DP are outside the MVP.

## Amendment — 2026-08-31: published AEC baselines for the validation gate

For comparison against mule measurements (not as a substitute for them): Espressif's published ESP32-S3 figures are AEC `FD_LOW_COST` ≈ 19.6% CPU, 30.9 KB internal RAM, 90.0 KB PSRAM at 16 kHz (6.28 ms per 32 ms frame); `VOIP_LOW_COST` ≈ 27.3% CPU. Combined with Opus encode and Wi-Fi/TLS/display load, the 20% headroom target is plausible but tight on one S3 core — which is why the gate demands measurement.

## Revisit when

Revisit the acoustic layout, audio front end, or compute choice if the enclosed mule cannot meet the barge-in and false-trigger requirements with measured resource headroom. Revisit session activation only if user research shows that a button-started live window is still too ambiguous or burdensome; do not add background always-listening by implication.

## Primary references

- [ChatGPT Voice — Live listens and speaks simultaneously](https://help.openai.com/en/articles/20001274-chatgpt-voice)
- [OpenAI voice-agent architecture](https://developers.openai.com/api/docs/guides/voice-agents)
- [OpenAI Realtime interruption and truncation](https://developers.openai.com/api/docs/guides/realtime-conversations#interruption-and-truncation)
- [OpenAI Realtime voice activity detection](https://developers.openai.com/api/docs/guides/realtime-vad)
- [M5Stack CoreS3 Lite audio architecture](https://docs.m5stack.com/en/core/CoreS3-Lite)
- [M5Stack CoreS3 duplex/reference-channel implementation](https://github.com/m5stack/StackChan/blob/main/firmware/main/hal/board/cores3_audio_codec.cc)
- [Espressif ESP32-S3 acoustic echo cancellation](https://docs.espressif.com/projects/esp-sr/en/latest/esp32s3/acoustic_echo_cancellation/README.html)
- [Espressif ESP32-S3 I2S driver](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/peripherals/i2s.html)
