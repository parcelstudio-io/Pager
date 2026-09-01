# 0001 — System architecture: from a button press to a live conversation

## Prerequisite

Read [0000 — Start here: IoT and electrical fundamentals](0000_start_here_iot_and_electrical_fundamentals.md) first. It introduces voltage, current, power, energy, digital signals, firmware, networks, and the basic shape of an Internet of Things (IoT) system.

This lesson assumes you can build a web service, but not that you have written firmware or designed electronics.

## Learning goals

By the end, you should be able to:

- draw Mochi as a set of physical and software components;
- decide which behavior belongs on the device and which belongs in the cloud;
- describe a conversation with states and events;
- explain why listening and speaking are independent, concurrent activities—a pattern called full duplex;
- trace audio, control messages, credentials, history, and electrical power separately;
- turn a vague requirement such as “it should feel fast” into a latency budget; and
- predict safe behavior when one component fails.

## Start with one user action

Imagine the user presses Mochi's conversation button and says, “What should I cook tonight?” Several different systems participate:

1. A physical switch changes an electrical signal.
2. Firmware on the device notices that signal and changes local state.
3. The device establishes an encrypted network session with Mochi's gateway, the server-side mediator between the pager and outside services.
4. The gateway authenticates the device—verifies its claimed identity—and connects to OpenAI Realtime, the provider's live audio conversation service.
5. A microphone continuously converts sound into digital samples.
6. Those samples travel to the model while returned speech travels in the other direction.
7. The device plays the reply, moves the eyes, and scrolls the caption.
8. If the user interrupts, the device must stop the old reply while continuing to capture the correction.

To the user, this is one conversation. Architecturally, it is concurrent work across electronics, firmware, networks, backend services, and an artificial-intelligence provider.

**System architecture** is the map of those components, their responsibilities, and their boundaries. It is comparable to a service diagram for a distributed application, except some components are constrained by batteries, clocks, wires, radios, and physical safety.

## The first useful system map

The arrows below are data paths unless marked as power:

```text
                         Internet
                  encrypted audio + events
                 ┌──────────────────────────┐
                 │                          v
person       ┌──────────┐              ┌───────────┐        ┌─────────────────┐
voice ─────> │          │              │ Mochi     │ <────> │ OpenAI Realtime │
button ─────>│  pager   │ <==========> │ gateway   │        │ live session    │
eyes/speaker │          │              └─────┬─────┘        └─────────────────┘
<────────────│          │                    │
             └────┬─────┘                    │ durable configuration/history
                  ^                          v
                  │ short-range setup   ┌───────────┐
                  └ - - - - - - - - -  │ companion │
                    Bluetooth only      │ app/cloud │
                                       └───────────┘

battery ── electrical power ──> pager electronics
```

`<====>` represents a long-lived, two-way network connection. The dotted Bluetooth path is for nearby setup, not for live conversation audio.

This diagram is deliberately incomplete. Its job is to answer “what talks to what?” before we discuss implementation details.

## Boundaries are more important than boxes

A **boundary** is a place where assumptions change. In software, crossing from one process to another changes latency and failure behavior. Hardware adds more kinds of boundaries.

### Execution boundary: device versus network

The pager must own behavior that has to remain immediate or truthful when the network is slow:

- reading the conversation button;
- opening and closing the physical microphone capture path;
- rendering the face and caption;
- stopping local playback when the user interrupts; and
- showing that the connection is unavailable.

The gateway owns work that requires Internet connectivity or a protected server environment:

- keeping the OpenAI credential off the pager;
- authenticating devices and accounts;
- translating provider events into Mochi's stable protocol;
- validating tool requests; and
- synchronizing opted-in history and configuration.

This resembles choosing between browser code and backend code. The analogy stops at the physical boundary: a browser cannot usually energize a microphone rail or continue emitting sound after its process crashes, but embedded hardware can do both unless the circuit and firmware are designed to fail safely.

### Trust boundary: model output is a proposal

The model may generate speech, an expression hint, or a request to use a tool. It is not allowed to decide whether the microphone is electrically enabled, whether the network is healthy, or whether a purchase should occur.

The gateway validates a proposed tool's name, input shape, user authorization, idempotency identifier, timeout, and result size. **Idempotency** means that retrying the same request does not repeat a side effect. This is the same rule used around payment or job-processing APIs: generated output is untrusted input until deterministic code accepts it.

### Persistence boundary: live context versus durable history

A live model session is **ephemeral**: it exists for the current connection and then disappears. Conversation history is **durable** only if Mochi deliberately stores it in its own service with user consent.

The pager may hold a small working context in memory during a session. The gateway and companion app handle opted-in durable records. Bluetooth setup does not become a hidden history channel. Keeping these roles separate makes deletion, account transfer, and offline behavior understandable.

### Electrical privacy boundary: software “mute” versus no capture

A user-visible “not listening” state must mean more than “the application promises not to upload samples.” A **capture gate** is an electronic switch that permits or blocks the microphone signal or power path. Mochi uses a hardware capture-enable command that defaults inactive before firmware starts. Reset, a crash, recovery, or a failed update must leave it inactive. The same command controls the visible listening indicator so the indicator and capture path cannot intentionally disagree.

The latching power switch is stronger still: **latching** means the switch mechanically remains in its chosen position. Its off position physically removes system power, including microphone power. This is a circuit property, not a user-interface animation.

> **Mochi product decision:** The shipping device has exactly two physical controls: one conversation start/stop button and one latching power switch. Power-on returns to private idle. It does not resume listening automatically. See [architecture decision record (ADR) 0008](../docs/decisions/0008_use_exactly_two_physical_controls.md).

## Model behavior as a state machine

A **state machine** describes a component using:

- a finite set of states;
- events that arrive while it is in a state;
- transitions caused by those events; and
- actions performed during a transition.

This is familiar from reducers, workflow engines, or a connection protocol. The important embedded difference is that some transition actions change physical outputs.

Mochi's top-level conversation state can begin simply. Writing each event next to its own transition avoids hiding which event causes which move:

```text
PRIVATE_IDLE
  └── button press ───────────────────────> CONNECTING

CONNECTING
  ├── session ready before deadline ──────> LIVE
  └── failure or timeout ─────────────────> PRIVATE_IDLE

LIVE
  └── button press or unsafe failure ─────> PRIVATE_IDLE

POWER_OFF
  └── physical switch on ──> boot ────────> PRIVATE_IDLE

any powered state
  └── physical switch off ────────────────> POWER_OFF
```

While `CONNECTING`, the face may immediately show that work started, but microphone capture remains closed. Capture opens only after device authentication and the live provider session are ready. The measured electrical and audio settling time then passes before the first microphone frame is sent.

Why not represent everything with one large enum such as `USER_TALKING` or `MOCHI_TALKING`? Because full-duplex conversation permits both at once. Inside `LIVE`, use independent state dimensions:

| Dimension | Possible states | Question answered |
|---|---|---|
| Input | `QUIET`, `USER_SPEAKING` | What is arriving from the microphone? |
| Output | `IDLE`, `GENERATING`, `PLAYING` | What is Mochi producing or playing? |
| Connection | `READY`, `RECONNECTING` | Can media safely reach the current session? |

`USER_SPEAKING + PLAYING` is valid for a short time when the user interrupts. Treating it as impossible creates bugs in interruption handling.

### Decide who owns each truth

Distributed systems become unreliable when two components believe they are authoritative for the same state. For Mochi:

| Truth | Authority |
|---|---|
| Physical power is on | Latching power circuit |
| Microphone capture is enabled | Device gate and local firmware |
| Samples have actually reached the speaker | Device playback cursor |
| Device/account is authenticated | Gateway |
| Model response exists | OpenAI live session, mediated by gateway |
| Durable history order | Mochi history service |
| Suggested emotional accent | Model or local mood system, below safety/activity state |

A **playback cursor** is a counter of samples actually rendered by the speaker path. Bytes downloaded or queued are not proof that the user heard them.

## Full duplex means two pipelines run at once

**Full duplex** means Mochi can capture input and play output simultaneously. It is like a video call, not like sending alternating voice messages.

Firmware usually expresses concurrent work as **tasks**: independently scheduled loops with narrow responsibilities. They are similar to operating-system threads or asynchronous workers, but they run with tighter memory and timing limits.

The audio paths look like this:

```text
CAPTURE
air -> microphone -> digital samples -> echo/noise processing
     -> bounded capture queue -> network upload

PLAYBACK
network download -> response-specific jitter queue -> decoder
     -> volume limiter -> speaker samples -> speaker -> air
                               |
                               └──> synchronized echo reference
```

A **queue** lets a producer and consumer run at slightly different moments. A **bounded queue** has a fixed maximum size. The bound matters because an unbounded queue can consume all memory or make a reply seconds late.

A **jitter queue** absorbs small variations in network arrival time. More queued audio reduces gaps but increases delay. “Add buffering” is therefore a trade-off, not a universal fix.

The **decoder** turns the received audio representation back into speaker samples. The **limiter** caps their maximum level. The synchronized echo reference is a time-aligned copy of those playback samples used to recognize Mochi's own sound in the microphone.

Media should not share one blocking loop with caption, configuration, or network-control work. If a configuration request stalls the microphone task, the result is not merely a slow API response; samples are permanently lost.

## Audio frames and control events are different data

An **audio frame** is a short block of samples. It is high-volume, ordered, and time-sensitive. A **control event** is a small structured message such as:

- session opened or closed;
- user speech started or stopped;
- response generation began;
- caption text arrived;
- response was interrupted at a playback position; or
- network health changed.

Separating media and control is similar to separating a video stream from its player commands. They can share one secure connection, but they need different queueing and retry rules. Retrying a configuration update may be safe; replaying old microphone audio after an outage is not.

Useful event fields include:

- `conversation_id`: which conversation owns the event;
- `session_epoch`: which connection attempt within that conversation;
- `input_segment_id`: which user utterance;
- `response_id`: which assistant response;
- `sequence`: ordering within one stream; and
- `device_timestamp`: when the device observed it.

These identifiers play the same role as trace identifiers and sequence numbers in backend services. They let us reject a late audio chunk from a canceled response rather than accidentally play it during the next response.

## Walk through one live conversation

Now we can expand the original button press without hiding the important boundaries:

1. The device **debounces** the button, meaning it turns several rapid electrical transitions from one physical press into one software event.
2. Firmware enters `CONNECTING` and updates the face locally. The capture gate remains inactive.
3. The device authenticates to Mochi's gateway over an encrypted connection. The gateway establishes the OpenAI live session.
4. When both sessions are ready, firmware enables the coupled capture-and-indicator signal. After the hardware settles, microphone frames begin flowing.
5. OpenAI detects speech boundaries and returns generated audio. The gateway tags each response and streams it to the pager.
6. The device buffers a small amount, plays the audio, advances the playback cursor, and scrolls transcript text as a caption. It also gives a copy of the played samples to acoustic echo cancellation, processing that removes Mochi's own speaker sound from its microphone input.
7. If local post-cancellation voice detection sees the user during playback, the device stops the current response immediately. It records the heard playback position and removes unheard caption text. The gateway cancels the generation and rejects late chunks.
8. Capture remains active for the correction. The user does not press again between utterances.
9. The next conversation-button press closes capture first, cancels active work, clears queued output, and returns to `PRIVATE_IDLE`.

As introduced above, the **gateway** is Mochi's Internet-facing backend. It protects service credentials, authenticates clients, applies product policy, and adapts provider-specific messages. The pager talks to the gateway instead of embedding a valuable provider credential in firmware.

## Latency is a sum, not one mystery number

**Latency** is elapsed time between a cause and a visible or audible effect. Different interactions have different latency budgets.

The button should feel immediate because the face update is local. A spoken reply must cross several boundaries:

```text
speech-end-to-reply = speech-end detection
                    + device and gateway handling
                    + model first-audio generation
                    + downlink travel
                    + playback buffering
```

**Downlink** means network data traveling toward the pager; **uplink** means data traveling from the pager toward the service.

Interruption has another budget:

```text
speech-onset-to-stop = local voice detection after echo cancellation
                     + audio-task scheduling
                     + queued Direct Memory Access (DMA) playback clear
```

Do not measure only “request duration.” Timestamp each phase and attach the identifiers from the previous section. Device and server clocks are not automatically identical, so prefer durations whose start and end use the same clock. If clocks are synchronized, record the expected synchronization error as part of the measurement.

> **Mochi product decision:** The local face acknowledges a conversation-button press within 100 milliseconds. During a recoverable live connection failure, capture closes immediately. A single non-extendable 10-second deadline allows authenticated reconnection; after that, live intent is cleared and another press is required. These are requirements to verify, not universal IoT constants.

## Connectivity and setup are separate from conversation

**Bluetooth Low Energy (BLE)** is a short-range radio protocol designed for low-power devices. **Wi-Fi** provides the pager's normal Internet route. A future **Long-Term Evolution (LTE)** modem could provide fourth-generation cellular fallback.

On first setup, the phone sends Wi-Fi credentials to the nearby pager using Espressif's authenticated `protocomm Security 2` setup protocol over BLE. The pager stores private network credentials in its protected local credential store. The app does not persist custom Wi-Fi passwords or cellular authentication secrets, and Mochi's cloud does not need them.

After setup, BLE shuts down. Live audio and history use their authenticated Internet services instead. This reduces the number of protocols that can access sensitive content.

Changing from Wi-Fi to cellular is not like changing a local variable. The old network connection is no longer valid. The device must close capture, discard uncommitted input and stale output, choose a route, perform name resolution—turning a service name into a network address—set up encryption, and authenticate again. It then reconstructs only committed context. It must never record speech during the gap for later automatic upload.

> **Mochi product decision:** A factory-fresh pager may advertise setup automatically while capture remains closed. An already-owned pager requires an authorized, time-limited setup window or the documented boot-time **recovery chord**, a physical button-and-power gesture recognized only during startup. BLE setup cannot transfer ownership or reveal old history. See [ADR 0007](../docs/decisions/0007_use_companion_app_and_cloud_history_sync.md).

## Durable synchronization is its own distributed system

The companion app and pager are two clients of Mochi's gateway. The gateway gives accepted configuration changes a revision number and durable history events a server sequence. A client asks for events after its last **cursor**, which is a token marking its synchronization position.

Retries can deliver the same source event more than once, so the service deduplicates it before assigning a durable identifier. Deletion is synchronized with a content-free **tombstone**: a record saying an item was deleted without retaining its deleted content. A client whose cursor is too old performs a complete authenticated reconciliation: it downloads and compares the current authorized state instead of trusting an incomplete event range.

This is intentionally more like database replication than Bluetooth file copying. The pager remains authoritative for physical capture and playback; the cloud remains authoritative for durable record ordering.

## Failure behavior is part of the architecture

For each component, ask: “If this stops responding now, what state is still truthful?”

| Failure | Safe, understandable behavior |
|---|---|
| Network or live session disappears | Close capture, discard uncommitted input and stale output, show reconnecting, then require a new press if the deadline expires |
| Echo cancellation becomes unreliable | End the live session and return to private idle rather than pretending full duplex still works |
| Provider stalls | Cancel on timeout and restore a usable local state |
| Authentication is rejected | Stop aggressive retries and enter a service/setup state |
| Speaker queue runs dry | Record the underflow, recover playback, and keep buttons responsive |
| History or tool service fails | Continue the conversation without that optional capability |
| Firmware update fails | Boot a previously verified image with capture inactive |

The face is an operational signal. Honest offline or reconnecting eyes are better than a cheerful frozen face.

## Names used in the design documents

Other Mochi documents group the responsibilities above into five **planes**. A plane is a conceptual category, not necessarily a process, task, server, or circuit:

| Plane | Responsibilities already introduced |
|---|---|
| Interaction | Button semantics, face, caption, local user-visible state |
| Media | Timed microphone and speaker frames, buffers, playback cursor |
| Control | Versioned session, speech, caption, interruption, and health events |
| Connectivity | BLE setup, Wi-Fi/cellular routes, reconnect behavior |
| Service | Gateway authentication, provider adapter, tools, configuration, durable history |

Starting with the end-to-end flow makes these names useful labels instead of abstract boxes.

## Applying this architecture to the prototype

Do not test every unknown at once. Here a **mule** is an intentionally rough prototype that isolates one risky subsystem, and a **carrier board** is a custom circuit board that mechanically and electrically connects prebuilt modules:

- The interaction mule tests the button, eyes, caption, capture truth, and full-duplex audio over Wi-Fi.
- A desktop client tests gateway events and OpenAI integration before constrained embedded hardware is involved.
- The companion-app slice tests secure BLE setup, account binding, configuration revisions, and cursor-based history synchronization.
- The cellular mule later tests route changes, antenna behavior, peak power, latency, and data use.
- A custom carrier board tests the final power, connector, acoustic, and mechanical integration.

This is the hardware equivalent of testing a database adapter, application programming interface (API), and user interface independently before one large integration test.

## Self-check

Try to answer these before opening the answers:

1. Why must the face react to the conversation button before the cloud responds?
2. Why are `USER_SPEAKING` and `PLAYING` not mutually exclusive?
3. Which component is authoritative for how much assistant audio the user actually heard?
4. Why should old microphone frames be discarded rather than retried after reconnection?
5. What is the difference between a live model session and durable Mochi history?
6. Why can the model suggest an eye expression but not enable microphone capture?

<details>
<summary>Answers</summary>

1. Local feedback stays responsive even when the network is slow or unavailable, and it truthfully reports the device's own transition.
2. Full duplex allows the user to interrupt while assistant audio is still playing.
3. The device's playback cursor, because it counts samples rendered rather than downloaded.
4. Retrying stale speech can violate privacy, confuse ordering, and cause the model to act on words spoken during an outage.
5. The live session is temporary provider state; durable history is an explicit, consented Mochi service record.
6. Capture is a privacy and hardware state governed by deterministic local policy; model output is untrusted input.

</details>

Continue with [0002 — Modules, pins, buses, and real-time audio](0002_modules_buses_and_audio.md). For the formal product decisions, see [ADR 0003](../docs/decisions/0003_use_secure_realtime_gateway.md), [ADR 0006](../docs/decisions/0006_use_button_started_full_duplex_sessions.md), the [companion-app and synchronization architecture](../docs/design/0002_companion_app_and_sync_architecture.md), and the [minimum viable product (MVP) requirements](../docs/requirements/0001_mvp_requirements.md).
