# 0005 — Realtime voice, memory, and privacy

A convincing voice companion is a streaming distributed system. It cannot wait to upload a whole recording, run batch speech recognition, generate a paragraph, synthesize the paragraph, and download a file. Audio and state move incrementally while turn detection, interruption, tools, safety, and UI remain coordinated.

## The realtime pipeline

At a high level:

```text
microphone -> AEC/VAD -> framing/codec -> secure uplink -> realtime model
               ^                                           -> tools/memory policy
               | rendered reference
speaker   <- jitter/codec  <- secure downlink <- streamed audio
caption   <- paced text    <- secure downlink <- transcript deltas
```

Important concepts:

- **VAD (voice activity detection):** estimates when speech starts/stops. It is not a wake word and can trigger on noise.
- **Turn detection:** segments continuous session audio when the user appears to have yielded. It remains necessary even when the UI never asks for a per-turn button press.
- **Barge-in:** lets new user speech interrupt assistant output. It requires post-AEC local detection, immediate generation-scoped playback clearing, upstream response cancellation, and removal of unheard output from conversation context. Tool work has separate transaction semantics and is not automatically rolled back.
- **Jitter buffer:** smooths uneven packet arrival by holding a small amount of audio. More depth resists jitter but increases latency.
- **AEC:** removes the known speaker signal from the microphone path so the system can hear the user while speaking.
- **Backpressure:** defines what happens when a consumer is slower than the incoming stream. Bounded queues must drop, cancel, or degrade intentionally rather than exhaust memory.

For EVT, one deliberate button press opens a visibly live session and another closes it. Capture and playback remain concurrent inside that window; local AEC/VAD and provider semantic VAD support automatic endpointing and barge-in. There is no user-facing hold-to-talk or fallback mode: if full duplex becomes untrustworthy, firmware closes the session and returns to private idle. A developer fixture may still gate capture for controlled AEC comparisons, but that behavior is neither shipping interaction nor acceptance path.

While `LIVE`, the display slides a live caption below the face (PR-07). Assistant captions ride the provider's incremental transcript events (`response.output_audio_transcript.delta`/`.done`); optional user captions require enabling input transcription via the session's `audio.input.transcription` configuration (model `gpt-live-transcribe` for streaming deltas, `gpt-transcribe` for post-turn accuracy). The gateway forwards these as versioned caption events keyed to the active response. Two subtleties: transcript deltas can run ahead of rendered audio, so the device paces the caption against the playback cursor; and on barge-in the device trims the caption to the heard boundary itself, because the provider removes unplayed transcript from its context but does not send a truncated transcript back.

The user's button-latched live intent is not the same object as one provider connection. OpenAI documents a Realtime Session as stateful interaction containing a current Conversation and its Items/Responses, and currently limits a session to 60 minutes. That provider state is ephemeral working context, not Mochi's product database. A longer live window must renew early under a new `session_epoch`: show amber and gate/discard input during the authenticated handoff, carry forward only committed context, then restore cyan `LIVE`. A failed renewal returns to private idle rather than silently listening or buffering speech. See the official [Realtime conversations guide](https://developers.openai.com/api/docs/guides/realtime-conversations).

## Why a gateway belongs between device and model

A standard OpenAI API key is a powerful server secret. MCU flash and firmware images are physically obtainable, so the device instead authenticates to our gateway with a unique, revocable identity. The gateway holds the provider key and creates the server-to-server Realtime connection.

The gateway also provides:

- device authorization, quotas, and abuse controls;
- a stable versioned device protocol;
- audio format/resampling/codec adaptation;
- prompt, voice, model, and rollout configuration;
- tool allowlists, argument validation, timeouts, and audit;
- independent input-segment, response-generation, playback-cursor, interruption, and health metrics;
- memory consent and retention enforcement;
- opt-in conversation-history storage and companion-app sync under the same consent rules ([ADR 0007](../docs/decisions/0007_use_companion_app_and_cloud_history_sync.md)).

It adds a hop, so deploy it near the model service and measure its processing/queue time. Keep it horizontally scalable where possible, but recognize that a live conversation has session state. A connection/session coordinator can route a reconnect or reconstruct only the minimum needed context.

OpenAI documents WebSockets for server-to-server Realtime use and says standard API keys should be kept on a secure backend. Browser/mobile clients usually use WebRTC with short-lived client credentials; that pattern can be evaluated later but does not remove device policy/tool concerns.

## Model behavior versus device behavior

The model owns language, voice, and constrained affect suggestions. The device owns truthful operational state. This separation prevents hallucinated UI: the model cannot claim a microphone is live, override the capture gate, conceal offline status, or fabricate battery/location state.

Prompts should describe the persona, verbosity, interruption style, and tool boundaries. Test them in the Realtime Playground before hardware. Keep prompts/model names server-configured and versioned. Evaluate with a repeatable conversation set, not only a charming demo.

Tool calls are requests, never authority. For every tool:

1. Define a narrow JSON schema and reject unknown fields.
2. Bind permissions to user and device, not model prose.
3. Make side effects idempotent or require confirmation.
4. Set timeout, retry, and maximum result size.
5. Return sanitized structured results.
6. Audit the decision without storing unrelated conversation content.

## Four kinds of “memory”

The word hides different systems:

### Working context

Recent conversation content needed to make the current exchange coherent. It is sent with or retained in the live Realtime session and has token/cost limits. Mochi treats it as session-scoped and reconstructs only committed context after renewal or reconnect; it is never the cross-session history authority.

### User memory

Durable facts such as preferred name, units, or favorite briefing style. Store small structured facts or summaries only after opt-in. Associate each item with provenance, creation time, purpose, deletion state, and any source history-event IDs. Deleting the source history defaults to cascading a derived fact; preserving an individually confirmed fact requires an explicit keep choice. Turning future history saving off does not silently toggle the separate memory consent. Avoid treating model-generated summaries as unquestionable truth.

### Conversation history

Readable transcripts of past sessions. This is neither working context, nor distilled user facts, nor device data — it is its own durable class with its own opt-in (default off). When future saving is enabled, it lives server-side behind the gateway, keyed per account, and the companion app reads it over authenticated HTTPS with inspect, export, forget, and disable controls. Turning future saving off prevents new durable transcript records; existing retained history remains viewable until the user separately deletes it.

The gateway is the sole durable writer. It commits finalized machine transcripts and, for interrupted assistant speech, only the prefix known to have been heard (or an `interrupted` marker when alignment is uncertain). Tool history is a sanitized user-visible action/status, never an arbitrary provider payload. Each event has a stable idempotency ID and gateway-assigned `server_seq`; apps fetch changes after an opaque cursor. Deletes remove content and propagate content-free tombstones. The server retains those tombstones through the maximum valid cursor age, exposes `oldest_available_seq`, and rejects an older cursor so the client must authenticate and fully reconcile before showing restored data. This prevents a long-offline or restored cache from resurrecting a deletion without relying on device clocks or last-write-wins guesses.

The app cache is encrypted per account with a device-bound, non-synchronizing database key held in iOS Keychain or Android Keystore-backed storage where supported; both cache and key are excluded from OS backup. A restored database without its key is discarded, and any restored/expired cursor reconciles from the server before content is shown. Account deletion revokes server access immediately, but no service can instantly erase bytes on a disconnected phone. An offline app may display an already authorized cache only until its signed, installation-bound authorization lease expires—at most 24 hours. Same-boot validation uses monotonic elapsed time and wall time; clock rollback or boot/time discontinuity without rollback-resistant platform time fails closed. The app then locks the cache until server contact and purges it when an authoritative deletion/revocation or revoked-credential response arrives. Product copy must disclose that reconnect/lease boundary rather than promise instantaneous remote erasure.

Mochi-controlled storage and provider-side handling are separate promises. OpenAI states that API data is not used to train models unless the customer opts in, while default abuse-monitoring logs may retain content for up to 30 days; eligible customers can apply for Modified Abuse Monitoring or Zero Data Retention. Product privacy copy must describe the project's actual OpenAI data-control status and must not turn “Mochi stores no history” into a claim of zero provider retention. See OpenAI's [data-controls guide](https://developers.openai.com/api/docs/guides/your-data).

### Device storage

Firmware, expression assets, non-secret configuration, locally encrypted network credentials, update metadata, and a bounded content-free diagnostic ring. It is not the right place for a long transcript: the device can be lost, flash has finite endurance, and local data is harder to govern centrally. Durable history therefore lives behind the gateway and syncs to the app's encrypted, account-scoped cache — never over BLE, which carries only nearby provisioning/recovery and bounded diagnostics. BLE carries neither conversation audio nor transcript content, and general Bluetooth accessories are deferred beyond the MVP.

Raw audio is especially sensitive and expensive. The baseline is to stream it for the live interaction and not retain it in our service — a rule the history opt-in does not change: consented history is committed transcript text, never raw audio by default. If debugging requires samples, use an explicit, time-bounded diagnostic consent flow and aggressive deletion.

## Privacy as visible product behavior

Privacy is credible when users can perceive and control it:

- exactly two physical controls ([ADR 0008](../docs/decisions/0008_use_exactly_two_physical_controls.md)): the conversation button, and a latching power switch whose off position physically de-energizes the device — power-off is the hardware microphone kill, USB/debug/modem paths must not back-power it, and power-on never resumes capture without a fresh button press;
- a capture-enable command net on the carrier that is biased inactive before GPIO configuration and through reset, boot, crash/watchdog, recovery, and OTA, and that gates the microphone path and drives the cyan light from the same command so firmware cannot assert them independently; electrical/component faults still require tests, and only verified hard power-off is hardware-certain;
- no camera in MVP;
- a deliberate conversation button that opens/closes a persistently indicated live session, with continuous uplink only during cyan `LIVE`;
- no remote-listen command and no alternate button gesture: the app cannot start capture, and a full-duplex failure closes the session;
- a clear difference between off, offline, and listening faces;
- inspect/export/forget/disable controls for durable memory and for opt-in conversation history, exposed in the companion app;
- location absent or disabled until a feature needs it;
- no secrets, raw audio, or transcript content in routine logs;
- per-device credentials that can be revoked after loss.

Encryption in transit is necessary but incomplete. Minimize what exists, constrain who can access it, set deletion/retention rules, and test deletion. Keep telemetry useful by storing timestamps, frame counts, codec, network metrics, error codes, and latency rather than content.

## What to measure

For each input segment and response record local/server speech start/end, AEC reference delay and residual echo, gateway receive, provider response/first audio, device receipt, first and last rendered sample, caption first-render latency and caption/audio drift, cancellation/truncation acknowledgement, independent queue depths, bytes, route, and errors. For the product record false and missed barge-ins, stale-output count, forced-private-idle transitions, reconnect time, data per live minute, current, and thermal state. These measurements connect a subjective “it talks over me” or “it feels slow” report to an actionable subsystem.

See [ADR 0003](../docs/decisions/0003_use_secure_realtime_gateway.md), [ADR 0006](../docs/decisions/0006_use_button_started_full_duplex_sessions.md), the [companion-app and synchronization architecture](../docs/design/0002_companion_app_and_sync_architecture.md), and the [product concept](../docs/design/0001_mochi_pager_product_concept.md).
