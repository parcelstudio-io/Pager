# 0001 — System architecture: from a button press to a voice reply

Hardware architecture is easiest to understand as a set of failure and timing boundaries. A companion that “talks to ChatGPT” is not one program. It is a local real-time appliance, two unreliable networks, a security boundary, a probabilistic model, and several services cooperating while the user expects one character.

## The five planes

### 1. Interaction plane

The device owns anything that must feel immediate: reading the push-to-talk button, honoring hardware mute, drawing the face, playing audio, and showing offline state. These actions cannot wait for a round trip. In software terms, treat this as a local state machine with hard latency expectations, not a view that passively renders cloud state.

For Mochi, `LISTENING` starts on a local button edge. `SPEAKING` follows the local playback buffer. `MUTED` follows the physical switch. The assistant may suggest “delighted,” but it cannot override safety or connectivity states.

### 2. Media plane

Microphone samples arrive at a fixed clock, are buffered, possibly filtered/resampled/compressed, and sent in bounded frames. Returned audio is decoded into a jitter buffer and fed to the speaker at an equally fixed clock. If network code blocks this path, the result is not a slow page—it is a click, gap, or buffer overflow.

This suggests separate tasks and bounded queues:

```text
microphone -> capture queue -> encoder/uplink
network -> jitter queue -> decoder/playback -> speaker
```

Queues absorb short scheduling differences but create latency when oversized. Record fill level, underflow, overflow, and timestamps. “Add buffering” is a trade, not a universal fix.

### 3. Control plane

Small versioned events describe start/stop capture, conversation state, expression accents, interruption, configuration, errors, and health. Keep these distinct from audio frames. A versioned device protocol lets the backend adapt to provider events without reflashing all hardware.

An event should contain a type, schema version, conversation/turn ID, monotonically increasing sequence, and device timestamp. This resembles distributed-service tracing because that is exactly what it is.

### 4. Connectivity plane

The network manager knows Wi-Fi and, later, cellular. It chooses a route, detects real reachability rather than mere link association, reconnects with bounded backoff, and reports state to the face. It should not know OpenAI's event schema. Separation lets us test network failure by swapping a fake transport under the media/control layers.

Wi-Fi preferred plus LTE failover sounds simple but changes IP addresses, NAT mappings, RTT, jitter, and cost. Re-establishing the secure device and provider sessions is an explicit transition: show reconnecting, cancel/discard the incomplete turn, select a route with hysteresis, perform DNS/TLS/authentication again, reconstruct only committed context, and return to idle. Never automatically replay a possibly side-effecting turn.

### 5. Service plane

Our gateway authenticates the pager, owns the OpenAI API credential, rate-limits use, translates audio and events, constrains tools, and records timing. OpenAI Realtime provides speech-to-speech model behavior. Separate tool and memory services handle only allowed side effects and opted-in facts.

Never give the model arbitrary network or database access. Tool calls are untrusted proposals: validate the name, schema, authorization, idempotency, timeout, and result size before execution.

## Walking one turn

1. A button interrupt is debounced. The local face enters listening within 100 ms and a new turn ID is allocated.
2. An audio task reads frames from the microphone interface. Capture and UI continue even if the uplink momentarily stalls.
3. The device sends authenticated control and media frames to our gateway over TLS WebSocket.
4. The gateway maps them to an OpenAI Realtime session, attaches the approved prompt/tools, and timestamps provider events.
5. The model emits audio and perhaps tool calls. The gateway validates calls; it streams permitted results and audio back.
6. The device fills a small jitter buffer, begins playback, and drives mouth/cheek animation from local amplitude.
7. A new button press cancels both local playback and the upstream response. Cancellation has to propagate across all layers; muting only the speaker would waste cost and let stale output resume.

## Latency as a budget

Measure the phases rather than one vague number:

```text
release-to-speech = finalize capture
                  + device uplink
                  + gateway handling
                  + model first-audio time
                  + downlink
                  + playback buffer
```

Place clocks at every boundary and correlate with a turn ID. MCU clocks and server clocks differ, so use durations measured on one clock where possible; estimate cross-system segments with synchronized clocks and record uncertainty. Optimize the largest stable contributor first.

## Failure design

A good architecture defines degraded behavior before happy-path polish:

- Network disappears while listening: stop or retain only a short bounded retry buffer; tell the user visibly.
- Provider stalls: cancel on timeout and restore a usable idle state.
- Gateway rejects credentials: do not retry aggressively; enter a provisioning/service state.
- Speaker buffer starves: log it, recover the decoder, and keep controls responsive.
- Memory/tool service fails: conversation should continue without it.
- Firmware update fails: boot the last known-good image.

The face is part of reliability. An honest offline expression is better than frozen smiling eyes.

## Applying it to this project

The interaction mule validates planes 1–3 over Wi-Fi. A desktop client validates planes 3 and 5 before embedded hardware. The cellular mule validates plane 4 plus power. The custom carrier validates the product's physical integration. Keeping these tests separate makes failures diagnosable and preserves evidence for each purchase gate.

See [ADR 0003](../docs/decisions/0003_use_secure_realtime_gateway.md) and the [MVP requirements](../docs/requirements/0001_mvp_requirements.md).
