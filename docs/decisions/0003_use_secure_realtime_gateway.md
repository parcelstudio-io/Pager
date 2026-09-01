# ADR 0003 — Use a secure Realtime gateway

Status: Accepted for EVT  
Date: 2026-08-30

## Context

The pager needs low-latency bidirectional audio with OpenAI Realtime, tool calls, optional memory, observability, and revocable device access. Putting a standard provider API key in extractable MCU firmware would expose the project account. Direct device-to-provider integration also couples firmware to a changing event protocol and makes policy, rate limits, model migration, and multi-device support harder.

## Decision

Connect the device to our secure backend using an authenticated TLS WebSocket and a revocable per-device identity. The backend opens a server-to-server Realtime WebSocket, owns the standard OpenAI API credential, translates device audio/events, enforces tool policy and limits, records latency/health metrics, and connects to opt-in memory services.

Start development with configuration-selectable `gpt-realtime-2.1-mini`; compare important conversations with `gpt-realtime-2.1`. Never hardcode a permanent model name in device firmware.

## Why

- OpenAI documents WebSocket as the server-to-server transport and says standard API keys belong on a secure backend.
- A gateway keeps provider credentials and unrestricted tools off a physically accessible device.
- It gives us one place for per-device authentication, quotas, schema validation, safety policy, codec normalization, tracing, and rollouts.
- It lets firmware maintain a small stable protocol while provider APIs and model choices evolve.

## Consequences

- The service adds one network hop and an operational dependency; its latency must be measured.
- We own gateway availability, cost controls, credential rotation, observability, and privacy controls.
- Device and server need versioned event schemas and backpressure behavior.
- Long-term memory is a separate opt-in service. Raw audio is not retained by default.
- Direct WebRTC with short-lived client credentials remains a possible later path for richer clients, not the first MCU design.

## Amendment — 2026-08-30: full-duplex gateway contract

[ADR 0006](0006_use_button_started_full_duplex_sessions.md) expands the device link to independently sequenced concurrent input/output media, bounded queues, VAD/control events, generation-aware late-packet rejection, and idempotent cancellation/truncation. The initial embedded AEC path is 16 kHz while OpenAI Realtime PCM is 24 kHz, so the gateway performs explicit measured 16↔24 kHz resampling and preserves sample-rate metadata.

The device reports a stable output ID plus the authoritative rendered sample count and rate. For each output chunk, the gateway retains the provider `item_id` and `content_index`; it converts the device cursor and calibrated fixed playback latency into `audio_end_ms`, sends `response.cancel` when needed, and emits `conversation.item.truncate` with the mapped `item_id`, `content_index`, and heard-audio boundary. Provider acknowledgement/error latency is measured separately from local audible-stop latency and cursor accuracy. Duplicate local/provider interruption races and retries must be idempotent.

## Amendment — 2026-08-31: the WebRTC revisit triggers have fired; the gateway stands on policy grounds

Two of this record's revisit conditions were re-evaluated and found satisfied (observed 2026-08-30/31). Direct device WebRTC is now a documented mainstream path on ESP32-S3: Espressif maintains [esp-webrtc-solution](https://github.com/espressif/esp-webrtc-solution) (v1.3.0, released 2026-08-26), whose `openai_demo` speaks the current Realtime API over WebRTC/Opus with AEC using short-lived client secrets (`POST /v1/realtime/client_secrets`) — no standard key on the device — and OpenAI's former embedded SDK repo ([openai/openai-realtime-embedded](https://github.com/openai/openai-realtime-embedded), dormant since 2025-03) now defers to it.

The gateway decision stands, but its justification changes: we keep the gateway because it centralizes tool policy, per-device revocable identity, quotas, opt-in memory and history, observability, and model migration — not because device WebRTC or constrained-device authentication is immature. During Gate A, measure the gateway's added latency against the `openai_demo` direct-WebRTC path on the same hardware; if the gateway hop alone prevents latency targets, this record's first revisit trigger applies.

## Amendment — 2026-08-31: caption/transcript contract

Requirement PR-07 (owner-mandated) makes a sliding live caption an MVP display element, so the gateway contract gains a transcript channel. The gateway subscribes to `response.output_audio_transcript.delta`/`.done` for assistant captions and forwards them to the device as versioned caption events keyed to the same `response_id`/`output_id` used for audio. After completed playback, the display continues left at the established pace until the line is fully off-screen; truncation or barge-in clears it immediately and blocks late deltas. When user-side captions are enabled, the gateway configures `session.audio.input.transcription` (model `gpt-live-transcribe` for streaming deltas, observed $0.017/min on 2026-08-30; `gpt-transcribe` when post-turn accuracy or language detection is preferred) and forwards `conversation.item.input_audio_transcription.delta`/`.completed`. One provider caveat still drives device behavior: `conversation.item.truncate` removes the unheard transcript from provider context but does not return a truncated transcript, so the device computes its heard boundary for cancellation and any opted-in durable history even though no interrupted caption remains on-screen. Note for configuration defaults: `gpt-realtime-2.1` is a reasoning model and provider guidance recommends starting voice agents at `reasoning.effort: low`.

## Amendment — 2026-08-31: the app is the gateway's second client

[ADR 0007](0007_use_companion_app_and_cloud_history_sync.md) and the detailed [companion-app architecture](../design/0002_companion_app_and_sync_architecture.md) add the companion app as a second authenticated client class. The gateway is the sole durable authority for account/device binding (including a monotonically increasing `binding_generation`), revocation, consent, non-secret configuration revisions, and opt-in conversation history. It issues short-lived, single-use claim tokens that the app delivers over authenticated BLE and the pager redeems over its own TLS connection.

Wi-Fi passwords, user-entered/custom APNs and derived modem profiles, PDP-auth credentials, and any future SIM PIN are an explicit exception: they travel directly from the foreground app to the pager inside the Security-2 BLE commissioning session and never transit or persist in Mochi's cloud. Signed public carrier-preset metadata may be distributed normally; the gateway otherwise receives only non-secret connection status and profile identifiers.

## Amendment — 2026-08-31: product retention and provider retention are separate

OpenAI Realtime conversation state is session-scoped inference state, not Mochi's durable history database. The gateway persists history only after the user's separate, default-off history consent, using the server-ordered and purgeable record contract in ADR 0007. It does not use `/v1/conversations` as product storage.

"History off" means Mochi does not create a durable transcript in systems it controls; it must not be advertised as zero provider retention by default. OpenAI states that API inputs and outputs are not used to train models unless the customer opts in, while default abuse-monitoring logs may retain content for up to 30 days. Eligible customers may apply for Modified Abuse Monitoring or Zero Data Retention, and endpoints such as `/v1/conversations` retain application state until deleted and are not Zero Data Retention eligible. Privacy copy and tests must distinguish Mochi-controlled storage from provider processing/retention and reflect the account's approved data-control configuration. See [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) and [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations).

## Revisit when

Revisit if the added hop prevents latency targets, or offline/local inference becomes a product requirement. The former conditions about constrained-device authentication and embedded WebRTC practicality fired in 2026-08 (see amendment) and were resolved in favor of keeping the gateway.

## Amendment — 2026-08-31: server-owned prompt assembly

[ADR 0009](0009_use_server_owned_contextual_prompt_assembly.md) makes the gateway the only prompt-assembly authority. It selects separately authorized history, user, retrieval, and device context; renders the versioned constrained `.ftl` template; and sends the result as Realtime session instructions. Browsers and pagers cannot supply or override that context, rendered prompts are not routine log payloads, and provider/model instructions never replace server-side tool or capture authorization.

## Primary references

- [Realtime API with WebSocket](https://developers.openai.com/api/docs/guides/realtime-websocket)
- [Realtime interruption and truncation](https://developers.openai.com/api/docs/guides/realtime-conversations#interruption-and-truncation)
- [Realtime transcription (caption events and models)](https://developers.openai.com/api/docs/guides/realtime-transcription)
- [`gpt-realtime-2.1-mini`](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini)
- [`gpt-realtime-2.1`](https://developers.openai.com/api/docs/models/gpt-realtime-2.1)
- [Espressif esp-webrtc-solution `openai_demo`](https://github.com/espressif/esp-webrtc-solution/tree/main/solutions/openai_demo)
