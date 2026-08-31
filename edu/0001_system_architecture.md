# 0001 — System architecture: from a button press to a live conversation

Hardware architecture is easiest to understand as a set of failure and timing boundaries. A companion that “talks to ChatGPT” is not one program. It is a local real-time appliance, two unreliable networks, a security boundary, a probabilistic model, and several services cooperating while the user expects one character.

## The five planes

### 1. Interaction plane

The device owns anything that must feel immediate: toggling the live session from the conversation button, drawing the face and its sliding caption, stopping playback on barge-in, and showing offline state. These actions cannot wait for a round trip. In software terms, treat this as a local state machine with hard latency expectations, not a view that passively renders cloud state.

For Mochi, one button edge moves the session from `INACTIVE` through `CONNECTING` (input `GATED`) to `LIVE`; the next closes it. Inside `LIVE`, input can be `QUIET` or `USER_SPEAKING` while output independently can be `IDLE`, `GENERATING`, or `PLAYING`. `USER_SPEAKING + PLAYING` is valid while barge-in propagates. The product exposes exactly two physical controls ([ADR 0008](../docs/decisions/0008_use_exactly_two_physical_controls.md)): the conversation button and a latching power switch whose off position physically de-energizes the system — the hardware privacy authority. A normal power-on returns to private idle and never resumes capture without a fresh button press; an unclaimed first boot or the deliberate recovery boot chord may instead enter capture-gated setup. The assistant may suggest “delighted,” but it cannot override capture, safety, or connectivity truth.

The carrier's capture-enable command is biased inactive before firmware configures a GPIO and stays inactive through reset, boot, crash/watchdog, recovery, and OTA. Firmware may assert the coupled gate/indicator command only after authenticated live-session readiness, then waits the measured electrical/codec settling interval before sending the first microphone frame. This is a fail-low path: loss of control drives capture closed, while the latching power switch remains the stronger hardware-certain kill.

### 2. Media plane

Microphone samples arrive at a fixed clock while returned audio is decoded and played against a synchronized render clock. The paths run concurrently. Before uplink, the microphone path uses a documented render reference and calibrated delay—post-amplifier analog feedback, rendered digital PCM, or both—then applies noise/gain processing, buffering, and any resampling/compression. If network code blocks either media task, the result is not a slow page—it is lost speech, a click, a gap, or a buffer overflow.

This suggests separate tasks and bounded queues:

```text
microphone -> AEC/NS -> capture queue -> encoder/uplink
                   ^
                   | synchronized render reference + playback cursor
network -> response-scoped jitter queue -> decoder/limiter -> speaker
```

Queues absorb short scheduling differences but create latency when oversized. Record fill level, underflow, overflow, and timestamps. “Add buffering” is a trade, not a universal fix.

### 3. Control plane

Small versioned events describe session open/close, capture truth, VAD, response generation, playback progress, transcript deltas for the live caption, interruption/truncation, expression accents, configuration, errors, and health. Keep these distinct from audio frames. A versioned device protocol lets the backend adapt to provider events without reflashing all hardware.

An event should contain a type, schema version, `conversation_id`, `session_epoch`, the relevant `input_segment_id` or `response_id`, an independent stream sequence, and a device timestamp. Playback acknowledgements use samples actually rendered, not bytes received or queued. This resembles distributed-service tracing because that is exactly what it is.

### 4. Connectivity plane

The network manager knows Wi-Fi and, later, cellular. It chooses a route, detects real reachability rather than mere link association, reconnects with bounded backoff, and reports state to the face. It should not know OpenAI's event schema. Separation lets us test network failure by swapping a fake transport under the media/control layers. This plane also owns first-run provisioning: before any IP route exists, the companion app delivers Wi-Fi and cellular credentials through Espressif protocomm Security 2 over BLE ([ADR 0007](../docs/decisions/0007_use_companion_app_and_cloud_history_sync.md)). Security 0/1 are rejected. Custom Wi-Fi/APN values and cellular authentication secrets stay in the pager's encrypted credential store and never enter Mochi's cloud or the app's persistent storage; public signed carrier-preset metadata may ship with the product or synchronize from the service.

Setup is an explicit capture-gated state, not a third shipping control. A factory-fresh pager enters it automatically. On a claimed pager, the app entry works only while the pager is online and private-idle: a signed-in app sends an authenticated gateway request, and the gateway authorizes the pager to advertise for a bounded window. Offline network repair instead starts from the touchscreen while private-idle or by holding the conversation button while sliding power on for eight seconds. That boot-only chord plus the current binding's recovery proof can repair local networks, but cannot transfer an owned cloud binding or reveal prior history; factory-package proof works only for first unclaimed setup and is disabled after initial claim. Account-loss transfer is a separate server-authorized recovery requiring account verification and a factory-key-signed physical-proof challenge. After release or an authorized generation change, the pager closes capture and purges every prior-binding credential, recovery verifier, config cache, caption, media queue, working-context item, volatile transcript, Wi-Fi password, and custom cellular/APN/authentication profile before setup. Only immutable factory identity remains, and the next binding receives a newly rotated recovery proof. BLE then shuts down after provisioning and never carries live audio or conversation history.

Wi-Fi preferred plus LTE failover sounds simple but changes IP addresses, NAT mappings, RTT, jitter, and cost. Re-establishing the secure device and provider sessions is an explicit transition: show amber reconnecting, close microphone uplink, discard raw/uncommitted input and queued output, select a route with hysteresis when needed, perform DNS/TLS/authentication again, and reconstruct only committed context. Any recoverable route, gateway, or provider transport/session failure that enters `reconnecting` starts one non-extendable 10-second capture-reopen timer (NW-02c) — deliberately tighter than the 15-second NW-02a transport-restore bound, because listening again is a privacy event held to a stricter deadline than reconnecting is. Reopen capture and restore cyan `LIVE` only if authentication and provider readiness finish before its deadline. At expiry, clear live intent, turn off, and require a fresh press even if connectivity later returns. Never buffer speech across the outage or automatically replay speech or a possibly side-effecting tool action.

### 5. Service plane

Our gateway authenticates the pager, owns the OpenAI API credential, rate-limits use, translates audio and events, forwards transcript deltas for the caption, constrains tools, and records timing. It also serves the companion app as a second authenticated client: account binding, non-secret versioned configuration, and opt-in conversation history all flow through it — the device never talks to the app's history store directly. Both app and pager configuration mutations carry an idempotency ID, binding generation, and base revision; the gateway orders accepted revisions. It orders durable history with a server sequence and cursor, deduplicates source retries before assigning event IDs, and distributes content-free deletion tombstones. Tombstones live through the maximum valid cursor age; a cursor older than the gateway's `oldest_available_seq` must perform an authenticated full reconciliation. The app is an authenticated encrypted cache; the pager is authoritative only for physical capture/playback state. OpenAI Realtime provides the ephemeral live speech-to-speech session, not Mochi's durable history database. Separate tool and memory services handle only allowed side effects and opted-in facts.

Never give the model arbitrary network or database access. Tool calls are untrusted proposals: validate the name, schema, authorization, idempotency, timeout, and result size before execution.

## Walking a live session

1. A conversation-button edge is debounced. The local face shows opening within 100 ms; capture begins only after the session becomes visibly `LIVE`.
2. The audio task continuously sends AEC-cleaned microphone frames through a bounded queue while the live session is active.
3. The device sends authenticated control and input media to our gateway over TLS WebSocket. Provider semantic VAD emits speech-start/stop events and creates responses.
4. The model emits audio and perhaps tool calls. The gateway validates calls and tags every audio chunk with its response generation before streaming it back.
5. The device fills a small response-scoped jitter buffer, begins playback, feeds a synchronized render reference to AEC (the CoreS3 uses its MIC3 speaker-feedback lane), counts rendered samples, drives mouth/cheek animation from local amplitude, and slides the caption below the face from gateway-forwarded transcript deltas, paced against the playback cursor. Capture continues.
6. If post-AEC local VAD detects the user during playback, the device immediately stops that generation, snapshots the render cursor, trims the displayed caption to the words actually heard (the provider truncates its context but does not send a truncated transcript back), and reports an interruption. The gateway cancels generation, rejects late chunks, and truncates the unheard suffix from provider context.
7. Capture continues through the user's correction; no button press begins a new utterance. A second conversation-button press instead ends the entire session: capture closes first, playback clears, active work cancels, and the live indicator turns off.

## Latency as a budget

Measure the phases rather than one vague number:

```text
speech-end-to-reply = endpoint-detection delay
                    + device/gateway handling
                    + model first-audio time
                    + downlink
                    + playback buffer

speech-onset-to-stop = local post-AEC VAD
                     + audio-task scheduling
                     + jitter/DMA clear
```

Place clocks at every boundary and correlate with `conversation_id`, `session_epoch`, `input_segment_id`, and `response_id`. MCU clocks and server clocks differ, so use durations measured on one clock where possible; estimate cross-system segments with synchronized clocks and record uncertainty. Optimize the largest stable contributor first.

## Failure design

A good architecture defines degraded behavior before happy-path polish:

- A recoverable network, gateway, or provider transport/session disappears during a live session: immediately close the uplink gate, discard rather than buffer raw input, clear stale output, and show amber reconnecting. Start the non-extendable 10-second capture-reopen timer (NW-02c); reopen capture only after authentication and provider readiness before its deadline. Expiry clears intent to off/private, and later recovery requires a fresh press.
- AEC confidence or resource headroom collapses: close the full-duplex session and return to private idle; never change the conversation button's start/stop meaning or keep a misleading live indicator. Developer bench firmware may compare a fixture-gated capture path with full duplex to isolate AEC faults, but that fixture behavior is not a product mode or acceptance fallback.
- Provider stalls: cancel on timeout and restore a usable idle state.
- Gateway rejects credentials: do not retry aggressively; enter a provisioning/service state.
- Speaker buffer starves: log it, recover the decoder, and keep controls responsive.
- Memory/tool service fails: conversation should continue without it.
- Firmware update fails: boot the last known-good image.

The face is part of reliability. An honest offline expression is better than frozen smiling eyes.

## Applying it to this project

The interaction mule validates planes 1–3 over Wi-Fi. A desktop client validates planes 3 and 5 before embedded hardware. The companion-app slice (Security 2 BLE provisioning, claiming/recovery, configuration revisions, and cursor-based history sync) validates the app half of planes 4 and 5 against the same gateway. The cellular mule validates plane 4 plus power. The custom carrier validates the product's physical integration. Keeping these tests separate makes failures diagnosable and preserves evidence for each purchase gate.

See [ADR 0003](../docs/decisions/0003_use_secure_realtime_gateway.md), [ADR 0006](../docs/decisions/0006_use_button_started_full_duplex_sessions.md), the [companion-app and synchronization architecture](../docs/design/0002_companion_app_and_sync_architecture.md), and the [MVP requirements](../docs/requirements/0001_mvp_requirements.md).
