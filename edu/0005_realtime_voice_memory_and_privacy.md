# 0005 — Realtime voice, memory, and privacy

A convincing voice companion is a streaming distributed system. It cannot wait to upload a whole recording, run batch speech recognition, generate a paragraph, synthesize the paragraph, and download a file. Audio and state move incrementally while turn detection, interruption, tools, safety, and UI remain coordinated.

## The realtime pipeline

At a high level:

```text
microphone -> framing/codec -> secure uplink -> realtime model
                                             -> tools/memory policy
speaker   <- jitter/codec  <- secure downlink <- streamed audio
```

Important concepts:

- **VAD (voice activity detection):** estimates when speech starts/stops. It is not a wake word and can trigger on noise.
- **Turn detection:** decides when the user has yielded. Push-to-talk makes this explicit; server VAD infers it.
- **Barge-in:** lets new user speech interrupt assistant output. It requires local detection plus cancellation of playback, queued audio, model generation, and tool work.
- **Jitter buffer:** smooths uneven packet arrival by holding a small amount of audio. More depth resists jitter but increases latency.
- **AEC:** removes the known speaker signal from the microphone path so the system can hear the user while speaking.
- **Backpressure:** defines what happens when a consumer is slower than the incoming stream. Bounded queues must drop, cancel, or degrade intentionally rather than exhaust memory.

For EVT, hold-to-talk avoids uncertain end-of-turn and separates capture from playback. Press-to-interrupt still tests the cancellation architecture required for future barge-in.

## Why a gateway belongs between device and model

A standard OpenAI API key is a powerful server secret. MCU flash and firmware images are physically obtainable, so the device instead authenticates to our gateway with a unique, revocable identity. The gateway holds the provider key and creates the server-to-server Realtime connection.

The gateway also provides:

- device authorization, quotas, and abuse controls;
- a stable versioned device protocol;
- audio format/resampling/codec adaptation;
- prompt, voice, model, and rollout configuration;
- tool allowlists, argument validation, timeouts, and audit;
- turn-level timings and health metrics;
- memory consent and retention enforcement.

It adds a hop, so deploy it near the model service and measure its processing/queue time. Keep it horizontally scalable where possible, but recognize that a live conversation has session state. A connection/session coordinator can route a reconnect or reconstruct only the minimum needed context.

OpenAI documents WebSockets for server-to-server Realtime use and says standard API keys should be kept on a secure backend. Browser/mobile clients usually use WebRTC with short-lived client credentials; that pattern can be evaluated later but does not remove device policy/tool concerns.

## Model behavior versus device behavior

The model owns language, voice, and constrained affect suggestions. The device owns truthful operational state. This separation prevents hallucinated UI: the model cannot claim a microphone is live, clear mute, conceal offline status, or fabricate battery/location state.

Prompts should describe the persona, verbosity, interruption style, and tool boundaries. Test them in the Realtime Playground before hardware. Keep prompts/model names server-configured and versioned. Evaluate with a repeatable conversation set, not only a charming demo.

Tool calls are requests, never authority. For every tool:

1. Define a narrow JSON schema and reject unknown fields.
2. Bind permissions to user and device, not model prose.
3. Make side effects idempotent or require confirmation.
4. Set timeout, retry, and maximum result size.
5. Return sanitized structured results.
6. Audit the decision without storing unrelated conversation content.

## Three kinds of “memory”

The word hides different systems:

### Working context

Recent conversation content needed to make the current exchange coherent. It is sent with or retained in the live session and has token/cost limits. It should expire with the session unless policy says otherwise.

### User memory

Durable facts such as preferred name, units, or favorite briefing style. Store small structured facts or summaries only after opt-in. Associate each item with provenance, creation time, purpose, and deletion state. Avoid treating model-generated summaries as unquestionable truth.

### Device storage

Firmware, expression assets, configuration, encrypted credentials, update metadata, and a bounded diagnostic ring. It is not the right place for a long transcript: the device can be lost, flash has finite endurance, and local data is harder to govern centrally.

Raw audio is especially sensitive and expensive. The baseline is to stream it for the live interaction and not retain it in our service. If debugging requires samples, use an explicit, time-bounded diagnostic consent flow and aggressive deletion.

## Privacy as visible product behavior

Privacy is credible when users can perceive and control it:

- a latching hardware mute and a light electrically coupled to its physical state so software cannot falsely clear it;
- no camera in MVP;
- push-to-talk at first, rather than ambiguous always-listening;
- a clear difference between muted, offline, and listening faces;
- inspect/forget/disable controls for durable memory;
- location absent or disabled until a feature needs it;
- no secrets, raw audio, or transcript content in routine logs;
- per-device credentials that can be revoked after loss.

Encryption in transit is necessary but incomplete. Minimize what exists, constrain who can access it, set deletion/retention rules, and test deletion. Keep telemetry useful by storing timestamps, frame counts, codec, network metrics, error codes, and latency rather than content.

## What to measure

For each turn record capture start/end, gateway receive, provider request/first event/first audio, device first audio/playback, cancellation, queue depth, bytes, route, and errors. For the product record false VAD/wake activations, successful interruption, reconnect time, data per minute, current, and thermal state. These measurements connect a subjective “it feels slow” report to an actionable subsystem.

See [ADR 0003](../docs/decisions/0003_use_secure_realtime_gateway.md) and the [product concept](../docs/design/0001_mochi_pager_product_concept.md).
