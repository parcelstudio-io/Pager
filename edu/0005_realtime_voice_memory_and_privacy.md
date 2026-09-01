# 0005 — Realtime voice, memory, and privacy from first principles

## Before you start

Read [0000: IoT and electrical fundamentals](0000_start_here_iot_and_electrical_fundamentals.md) first. [0001](0001_system_architecture.md) introduces local-versus-cloud boundaries, and [0002](0002_modules_buses_and_audio.md) explains the microphone and speaker wiring.

This lesson assumes you understand HTTP requests, streams, queues, and databases. It does not assume audio or machine-learning experience.

By the end, you should be able to explain:

- how sound becomes a stream of numbers;
- why a live voice system is different from uploading an audio file;
- what full duplex, voice activity detection, echo cancellation, and barge-in mean;
- why Mochi needs a gateway between the device and OpenAI;
- why working context, user memory, and conversation history are different data stores;
- which privacy promises the hardware can enforce and which depend on services.

## 1. Sound becomes an array of numbers

Air pressure moves a microphone membrane. The microphone and its electronics turn that movement into an electrical signal. An **analog-to-digital converter (ADC)** measures the signal repeatedly and produces numbers called **samples**.

Two settings describe the raw stream:

- **Sample rate** is the number of measurements per second. `16 kHz` means 16,000 samples per second.
- **Bit depth** is the number of bits used for each sample. `16-bit` audio uses two bytes per sample.

For one **mono** channel, meaning one channel rather than separate left and right channels:

```text
16,000 samples/second × 16 bits/sample = 256,000 bits/second
```

That is 256 kilobits per second (`kbit/s`), before packet headers or encryption. This calculation is the audio equivalent of estimating an event stream's data rate before selecting a message broker.

The speaker path reverses the process. A **digital-to-analog converter (DAC)** turns samples into a changing voltage, an amplifier supplies enough current, and the speaker turns that electrical signal back into pressure waves.

**Pulse-code modulation (PCM)** is the common name for this direct sequence of sample values. A **codec** is an encoder/decoder that changes the representation, often compressing audio to use less network bandwidth.

## 2. Batch audio versus streaming audio

A simple voice feature can work like a batch job:

```text
record a whole file
    -> upload it
    -> transcribe it
    -> generate a complete answer
    -> synthesize another file
    -> download and play it
```

This is easy to reason about but feels slow. The system cannot respond until several complete stages finish.

A realtime system moves small chunks while later chunks are still being created:

```text
microphone frames -> secure network stream -> model
speaker frames    <- secure network stream <- model
```

For a software engineer, batch audio resembles `await process(wholeFile)`. Realtime audio resembles two long-lived asynchronous iterators running at the same time. If either consumer stalls, a queue grows or data is lost.

An audio **frame** is a short block of samples processed together. At 16 kHz, a 20 ms mono frame contains:

```text
16,000 samples/second × 0.020 seconds = 320 samples
```

Short frames reduce waiting time but create more scheduling and packet overhead. Long frames are efficient but add latency. There is no free setting.

## 3. Half duplex and full duplex

**Duplex** describes which directions may carry data at the same time.

| Mode | Network analogy | Voice behavior |
|---|---|---|
| Simplex | One-way log shipping | Only one side ever sends |
| Half duplex | A shared lock around send/receive | User and assistant take turns |
| Full duplex | Independent request and response streams | Both may speak at the same time |

Mochi's conversation button opens one full-duplex session. It is not a push-to-talk button for each sentence. While Mochi plays audio, the microphone path remains active so the user can interrupt.

That creates an acoustic feedback loop:

```text
assistant samples -> speaker -> air -> microphone -> input samples
```

Without treatment, Mochi may hear its own voice and interpret it as the user.

## 4. AEC, VAD, turn detection, and barge-in

These terms solve different problems:

- **Acoustic echo cancellation (AEC)** estimates the portion of microphone input caused by the known speaker output and removes as much of it as possible. It needs a time-aligned copy of what was actually rendered to the speaker.
- **Voice activity detection (VAD)** estimates whether an audio region contains speech. It can make mistakes with music, fans, or the device's remaining echo.
- **Turn detection** decides when the user has probably finished an utterance. A pause inside a sentence must not always end the turn.
- **Barge-in** is the whole behavior when new user speech interrupts assistant playback: detect speech, stop local playback, cancel the matching remote response, discard late chunks, and remove unheard output from the model's working context.

AEC is not the same as noise suppression. Noise suppression targets unrelated background sound. AEC targets a signal the device itself produced.

A useful software analogy is cancellation of a streamed job. Stopping the local UI spinner is insufficient. You must cancel the producer, reject late messages from the old generation, and decide which partial results were actually committed.

## 5. The minimum streaming pipeline

```text
                                      +-------------------+
microphone -> AEC -> VAD -> uplink -->| realtime service  |
                 ^                    | and model         |
                 |                    +-------------------+
                 |                              |
                 | rendered reference           | audio + text deltas
                 |                              v
speaker   <- playback queue <- decoder <- secure downlink
caption   <- playback-paced text queue <--------+
```

A **rendered reference** is the speaker signal at the point it was truly played, not merely downloaded. A **playback cursor** counts how many samples have actually reached the output. Mochi uses that cursor to keep captions near heard speech and to know where interruption occurred.

A **jitter buffer** is a small queue that smooths uneven network arrival times. It trades latency for resilience:

- too small: the speaker starves and clicks;
- too large: the reply feels delayed and interruption clears more queued audio.

**Backpressure** is the policy for a slower consumer. A bounded audio queue must intentionally block, drop, cancel, or degrade. An unbounded queue merely converts a latency problem into a memory failure.

## 6. Track identity, not only bytes

Packets from an old answer may arrive after the user interrupts it. Therefore, chunks need identity such as:

```text
session_epoch = 12
response_id   = "resp_47"
sequence      = 103
```

`session_epoch` is a locally increasing generation for one live connection attempt. `response_id` identifies one assistant answer. `sequence` orders chunks within a stream.

This is the same reason a frontend ignores the result of an obsolete search request. Audio makes the consequence audible: accepting an old chunk means the cancelled assistant starts talking again.

## 7. Why Mochi uses a gateway

The pager does not contain the standard OpenAI API key. Physical devices can be lost, opened, and have firmware copied. A secret shared by every device would eventually escape.

Instead, the pager authenticates to a Mochi-controlled **gateway**, which is a backend service placed between devices and the model provider:

```text
pager --device credential--> Mochi gateway --provider key--> OpenAI
```

The gateway behaves like an API gateway plus a session coordinator. It can:

- revoke one lost device without rotating every device;
- enforce account and device permissions;
- select prompts, models, voices, and rollout versions;
- validate tool requests before side effects occur;
- enforce usage limits and timeouts;
- normalize provider events into a stable device protocol;
- measure each latency and queue boundary;
- apply memory and history consent.

The extra hop has a cost, so its queue and processing time must be measured. It is still the right trust boundary: the model may propose an action, but only application code with authenticated policy may authorize it.

## 8. Model state is not device truth

The model can choose words and voice style. It may offer a constrained expression hint such as `curious` or `concerned`. It cannot determine whether the microphone circuit is powered, whether the network is connected, or whether the battery is actually low.

Mochi therefore separates two categories:

- **Operational truth:** power, capture gate, live indicator, connection, battery, and playback state. Local hardware and deterministic software own this.
- **Generative suggestion:** language, tone, and allowlisted expression accents. The model may suggest these, but they cannot override operational truth.

This is similar to keeping database authorization out of generated UI text. A sentence saying "you are an administrator" does not change the authorization record.

## 9. Four different things called memory

Treating all memory as one array leads to privacy and synchronization bugs.

| Kind | Software analogy | Lifetime | Example |
|---|---|---|---|
| Working context | Request/session state | Current live session | The previous few exchanges |
| User memory | Small preference table | Across sessions, with consent | Preferred name or units |
| Conversation history | User-visible event log | Across sessions, opt-in | A readable transcript |
| Device storage | Configuration and firmware | Until changed/reset | Wi-Fi credential or volume |

### Working context

Working context helps the current conversation stay coherent. It is bounded because model context has cost and size limits. On reconnect, Mochi reconstructs only settled conversation items; it does not replay raw audio or half-completed tool actions.

### User memory

User memory is a small set of structured facts. Each fact needs a source, purpose, creation time, and deletion behavior. A model-generated guess is not automatically a fact.

### Conversation history

History is a readable, durable record and needs its own default-off consent. Interrupted assistant output must store only the heard portion, or clearly mark uncertainty. The gateway is the authoritative writer; the phone holds an encrypted cache, not an independent history database.

### Device storage

The pager stores firmware, configuration, and local network credentials. It should not become the durable transcript authority: it can be lost, flash wears out, and central deletion is difficult while it is offline.

Retention by Mochi and processing by a model provider are separate facts. Provider policies and eligibility can change, so product copy must link the current provider terms and state Mochi's actual configuration rather than promise zero retention by inference.

## 10. Privacy as a data-flow review

For every data type, answer five questions:

1. Where is it created?
2. Where is it sent?
3. Where is it stored?
4. Who can read or change it?
5. What event deletes or invalidates it?

Example:

| Data | Created at | Sent to | Durable storage | Deletion boundary |
|---|---|---|---|---|
| Raw microphone audio | Pager | Gateway/provider during live use | None in Mochi baseline | Stream ends and buffers clear |
| Wi-Fi password | Phone during setup | Nearby pager over protected Bluetooth Low Energy (BLE) | Encrypted pager storage | Network reset or ownership change |
| Transcript history | Gateway after finalization | Opted-in app | Gateway + encrypted app cache | User deletion and replica reconciliation |
| Capture state | Pager hardware/session logic | UI and metrics | Not a remotely writable setting | Physical/local Stop |

Encryption protects data in transit or at rest. It does not answer whether the data should exist, how long it remains, or who is authorized. Data minimization and deletion rules are separate controls.

## 11. Trace one interruption

Suppose Mochi is saying "The weather tomorrow will be..." and the user says "Actually, tell me about Friday."

1. The speaker has rendered 0.8 seconds of the assistant response.
2. AEC removes most of that known speaker signal from the microphone stream.
3. Local VAD sees new speech in the cleaned signal.
4. The pager stops the current response queue immediately.
5. It freezes the caption at the heard boundary.
6. The gateway cancels the matching `response_id`.
7. Late packets with that ID are rejected.
8. Only committed/heard context is retained.
9. Capture continues, so the user's correction reaches turn detection without another button press.

When debugging this flow, log timestamps and identifiers, not conversation content. Useful fields include frame counts, queue depth, response ID, route, error code, and rendered sample position.

## Check your understanding

1. Why can a system have VAD but still fail at barge-in?
2. If a transcript arrives before its audio is played, which clock should the caption follow?
3. Why is an interrupted response ID necessary even on an ordered transport?
4. Which store should contain "use Celsius": working context, user memory, history, or device storage?
5. Why does transport encryption not prove that a privacy design is complete?

Answers: (1) barge-in also requires echo handling, local playback cancellation, upstream cancellation, and late-chunk rejection; (2) the rendered-audio/playback cursor; (3) cancellation creates a semantic generation boundary even if bytes are ordered; (4) structured user memory after consent; (5) it does not define collection, authorization, retention, or deletion.

## Where Mochi's exact decisions live

This primer explains concepts. Exact product rules and acceptance thresholds live in [ADR 0003](../docs/decisions/0003_use_secure_realtime_gateway.md), [ADR 0006](../docs/decisions/0006_use_button_started_full_duplex_sessions.md), the [companion-app architecture](../docs/design/0002_companion_app_and_sync_architecture.md), and the [MVP requirements](../docs/requirements/0001_mvp_requirements.md). Consult the current [OpenAI Realtime guide](https://developers.openai.com/api/docs/guides/realtime-conversations) and [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data) before freezing provider-specific behavior.
