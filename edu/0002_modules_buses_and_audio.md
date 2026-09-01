# 0002 — Modules, pins, buses, and real-time audio

## Prerequisites

Read these first:

- [0000 — Start here: IoT and electrical fundamentals](0000_start_here_iot_and_electrical_fundamentals.md)
- [0001 — System architecture](0001_system_architecture.md)

This lesson moves from logical architecture to the wires, clocks, and buffers that make Mochi's audio path real. Here **real time** does not mean “as fast as possible.” It means correctness depends on completing work before a physical deadline; a perfect audio block delivered after the speaker needs it is still a failure.

## Learning goals

By the end, you should be able to:

- distinguish an integrated circuit, module, development board, and finished product;
- read a basic pin table without treating every pin as a generic variable;
- explain inputs, outputs, pull resistors, high-impedance states, and button debounce;
- choose among General-Purpose Input/Output, Inter-Integrated Circuit, Serial Peripheral Interface, Inter-IC Sound, Universal Asynchronous Receiver/Transmitter, and Universal Serial Bus connections;
- calculate raw audio data rate and buffer duration;
- explain clocks, Direct Memory Access, and bounded audio queues; and
- describe why simultaneous capture and playback—called full-duplex audio—needs acoustic echo cancellation and a synchronized playback reference.

## From a chip to a module

An **integrated circuit (IC)** is a semiconductor package containing a circuit: for example, a microcontroller, memory chip, sensor, or audio amplifier. A bare IC may require external power regulation, timing components, memory, antenna matching, and tiny solder joints.

A **module** combines an important IC with some of that support circuitry. A cellular module, for example, may contain the modem processor, radio-frequency components, memory, and a conductive cover that reduces electromagnetic interference. The module still needs a host, power supply, antenna, and software driver—the code that controls this specific hardware.

A **development board** puts a module or IC on a larger, forgiving board with connectors, voltage regulation, buttons, status lights, and a programming interface. Development boards optimize learning and access, not final size or cost.

```text
integrated circuit -> module -> development board -> prototype assembly
       smallest       support      easy connectors      several boards wired together
```

The software analogy is low-level library → package with dependencies → runnable development environment. It helps with responsibility boundaries, but it breaks down because boards must also agree on voltage, current, timing, signal direction, grounding, and connector mechanics. Matching protocol names alone do not make two boards safe to connect.

## A pin is a physical contract

A **pin** is a conductive terminal on a component or connector. A **net** is the collection of pins and copper conductors intended to share one electrical signal. In source code, two functions can both use a variable named `data`; in hardware, two pins named `DATA` are compatible only if their electrical contracts match.

For every connection, identify:

- purpose and protocol;
- which side drives it and which side receives it;
- allowed voltage range and logic thresholds;
- state during power-off, reset, and boot;
- maximum current where relevant;
- timing or clock requirements; and
- what occurs if one board is powered while the other is not.

**High impedance**, often written `Hi-Z`, means a pin behaves approximately like a disconnected input rather than actively driving high or low. It does not mean the pin is immune to excessive voltage.

Common schematic labels shorten words. `MIC` means microphone, `BCLK` means bit clock, `TX` means transmit from the labeled device, and `RX` means receive at the labeled device. A **cellular modem** is hardware that connects digital data to a cellular radio network.

A first interface table might look like this:

| Signal | Producer | Consumer | Voltage domain | Direction | Reset/default | Purpose |
|---|---|---|---|---|---|---|
| `CONVERSATION_BUTTON` | Button circuit | Microcontroller | 3.3 V logic | Input | Pulled high | One press event after debounce |
| `CAPTURE_ENABLE` | Microcontroller | Capture gate and indicator | 3.3 V logic | Output | Pulled inactive | Opens capture only when live |
| `MIC_BCLK` | Microcontroller | Digital microphone | 3.3 V logic | Output | Low | Times microphone audio bits |
| `MIC_DATA` | Digital microphone | Microcontroller | 3.3 V logic | Input | Hi-Z | Carries microphone sample bits |
| `MODEM_TX` | Modem | Microcontroller | Verify datasheet | Input at microcontroller | Varies | Modem-to-host bytes |

Therefore modem `TX` connects to host `RX`, not to another `TX`.

## A brief power-flow review

As established in lesson 0000:

- **voltage**, measured in volts, is electrical potential relative to a chosen reference;
- **current**, measured in amperes, is the flow of charge;
- **power**, measured in watts, is the instantaneous rate of energy transfer; and
- **energy**, often measured in watt-hours for a battery, accumulates over time.

A **power rail** is a conductor network intended to remain near a named voltage, such as the `3.3 V` rail. **Ground** is the circuit's chosen `0 V` reference and a current-return conductor; it is not automatically Earth.

```text
battery -> charger/power-path controller -> regulators -> named rails -> loads
                                                ├── microcontroller
                                                ├── display
                                                ├── microphone
                                                ├── amplifier/speaker
                                                └── radio/modem
```

A **power-path controller** decides whether the system runs from an external supply or battery and controls how charging power is routed. A regulator turns one voltage into another. A load draws the current required by its operating state, up to what its source and wiring can safely provide. A supply rated for 2 A does not force 2 A through every load. Conversely, a source capable of only 500 mA may collapse when a modem briefly demands more.

Do not infer battery or charging compatibility from a connector. Lithium cells require a charger, protection, temperature policy, and system power path matched to their chemistry and limits.

## General-Purpose Input/Output: one programmable digital pin

**General-Purpose Input/Output (GPIO)** is the simplest microcontroller interface. Firmware configures a GPIO pin as an input or output.

- An **input** observes whether its voltage is interpreted as logical low or high.
- A **push-pull output** actively drives either low or high.
- An **open-drain output** can actively pull low or release the wire to Hi-Z; a resistor or another circuit supplies the high level.
- A **pull-up resistor** weakly holds an otherwise undriven signal high.
- A **pull-down resistor** weakly holds it low.

A common active-low button circuit is:

```text
3.3 V ── pull-up resistor ──┬── GPIO input
                            │
                         push button
                            │
ground ─────────────────────┘
```

With the button open, the pull-up produces a stable high. Pressing the button connects the input to ground, producing a low. The resistor limits current so the press does not short the 3.3 V rail directly to ground.

Mechanical contacts physically bounce, producing several high/low edges during one press. **Debouncing** converts those edges into one logical event, using a small hardware filter, a firmware timing rule, or both.

A GPIO input can also generate an **interrupt**, a hardware notification that asks the processor to run a short handler when an edge occurs. An interrupt is comparable to an event callback, but long work in the handler can delay other hardware events. A common pattern is: record the edge quickly, then let a normal task perform the state transition.

Some GPIO pins are sampled during reset to choose how a chip boots. These **strapping pins** cannot be treated as arbitrary controls without checking the datasheet.

> **Mochi product decision:** `CAPTURE_ENABLE` has an external inactive bias. It stays inactive before firmware configures the pin and through reset, crash, recovery, and update. Firmware asserts it only after authenticated live-session readiness. This is called **fail-low** because losing active control returns capture to the closed state.

## Why buses exist

A **bus** is a set of signal wires and protocol rules used to exchange data. It saves pins, provides structure, or meets a timing/bandwidth need. A **clock** is a repeating electrical timing signal; on a clocked bus, its edges tell participants when a data bit is valid. The later clock section explains why independently generated clocks can drift.

Before selecting one, ask:

- Is the traffic occasional control data or a continuous media stream?
- How many devices share the wires?
- Who supplies timing?
- What data rate is required after overhead?
- Can both directions operate at once?
- How long are the wires, and what electrical signaling do they use?
- Does firmware already have a reliable driver for the exact controller and device?

The following interfaces solve different problems.

## Inter-Integrated Circuit: a shared register bus

**Inter-Integrated Circuit (I²C)**, spoken “I-squared-C,” is a two-signal bus commonly used to configure sensors, battery gauges, touch controllers, and small displays.

Its signals are:

- `SCL`, the serial clock line; and
- `SDA`, the serial data line.

One **controller** initiates a transaction. Each **target** responds to an address. Older documentation may use “master” and “slave” for the same roles.

Typical transaction:

```text
START -> target address + read/write -> ACK -> register -> data bytes -> STOP
```

`START` and `STOP` are special wire conditions that delimit the transaction. `ACK` is an acknowledgement bit. Many I²C devices expose a **register map**: numbered locations used to read status or write configuration. This feels like calling a small key-value application programming interface (API). The analogy breaks when electrical details matter: I²C devices share open-drain wires, require pull-up resistors, can have duplicate addresses, and may fail when the connected wires and inputs store enough charge—an electrical property called **capacitance**—to make edges too slow.

I²C is well suited to occasional small messages. It is not Mochi's raw audio stream.

## Serial Peripheral Interface: fast, clocked transfers

**Serial Peripheral Interface (SPI)** is a clocked interface commonly used for displays, external flash memory, and faster sensors. A **peripheral** is hardware controlled by the main processor rather than the processor itself.

Common signals are:

- `SCLK`, the serial clock from the controller;
- `MOSI`, the conventional label for “master out, slave in,” meaning controller-out, peripheral-in data;
- `MISO`, the conventional label for “master in, slave out,” meaning controller-in, peripheral-out data; and
- `CS`, chip select, usually one per peripheral.

While a peripheral's chip-select signal is active, every clock edge transfers bits. SPI can transfer in both directions on the same clock, although many devices use only one direction for a given command.

SPI normally uses more pins than I²C but provides higher throughput and simpler point-to-point timing. Controller and peripheral must still agree on clock rate, whether the most- or least-significant bit travels first, how many bits form one word, and which clock edge changes or samples data. That collection of clock-edge choices is called the **SPI mode**.

The function-call analogy—select object, send command, receive result—is useful. It breaks down because an incorrect mode or signal edge can corrupt every bit without producing a typed exception.

## Inter-IC Sound: a timed stream of audio samples

**Inter-IC Sound (I²S)**, spoken “I-squared-S,” carries uncompressed digital audio between chips. Despite the similar name, I²S is unrelated to I²C.

Common signals are:

- `BCLK`, bit clock, with one timing edge for each transmitted bit;
- `WS`, word select, also labeled `LRCLK` for left/right clock, marking sample and channel boundaries;
- `SD`, serial data, with separate input and output lines when needed; and
- sometimes `MCLK`, a faster master clock required by some hardware audio codecs.

I²S has no target address and usually no start/stop transaction around every sample block. Once enabled, samples flow continuously according to the shared clock and configured format.

A **hardware audio codec** converts between analog sound signals and digital samples. Both sides must agree on sample rate (samples each second), bit depth (bits in each numeric sample), channel layout, transmitted word width, the clock edge used for sampling, and which side generates each clock. “Both parts support I²S” is not enough.

## Universal Asynchronous Receiver/Transmitter: a byte stream

A **Universal Asynchronous Receiver/Transmitter (UART)** sends bytes over separate transmit (`TX`) and receive (`RX`) signals without a shared clock wire. “Asynchronous” means both sides derive timing from their own clocks and agree in advance on a **baud rate**, the number of signaling symbols per second.

Each byte is framed with start, data, optional parity, and stop bits. **Parity** is one simple error-detection bit calculated from the data bits. At 115,200 baud, framing overhead leaves less than 115.2 kilobits per second for application payload.

Optional hardware flow-control signals are:

- `RTS`: request to send; and
- `CTS`: clear to send.

They let a receiver pause a sender before its small buffer overflows. UART is useful for logs, programming, and modem `AT` commands. The letters `AT` are the “attention” prefix that begins a family of text commands understood by many cellular modems.

UART resembles a terminal byte stream. The analogy breaks because there is no built-in message framing, device discovery, authentication, or reliable retransmission. Software must add what it needs.

## Universal Serial Bus: a host-managed ecosystem

**Universal Serial Bus (USB)** combines a high-speed data protocol with power distribution. It is not simply “a faster UART.”

USB has roles:

- the **host** controls the bus, detects attached devices, and loads the appropriate driver;
- a **device** announces descriptors, structured metadata that identifies its capabilities.

On common USB 2 connections, data-plus (`D+`) and data-minus (`D−`) form a **differential pair**: information is represented by the voltage difference between two carefully routed conductors. The USB bus-voltage line (`VBUS`) commonly provides 5 V power, and ground provides the reference/return.

**Enumeration** is the host's process of discovering a device and selecting a configuration and driver. A cellular modem might expose networking, serial-command, location, and diagnostic functions at once. The microcontroller must support USB host mode and the modem's actual functions, while Mochi still needs an independent recovery/programming path.

USB provides much more bandwidth than a basic UART, but adds connector protection, power-role, driver, routing, and software-stack requirements.

## Interface comparison

| Interface | Topology and timing | Typical Mochi use | Common failure |
|---|---|---|---|
| GPIO | One logical signal; optional edge interrupt | Button, capture enable, hardware interrupt | Wrong voltage, floating input, bounce, unsafe reset default |
| I²C | Shared addressed bus with clock and pull-ups | Fuel gauge, touch/sensor configuration | Address collision, missing/wrong pull-up, excessive capacitance |
| SPI | Clocked data with chip select per peripheral | Display or external flash | Wrong mode, excessive clock rate, chip-select mistake |
| I²S | Continuous synchronous audio stream | Microphone, audio codec, amplifier | Format/clock disagreement, buffer overrun/underrun |
| UART | Asynchronous framed byte stream | Debug and modem commands | Cross-wiring, baud mismatch, missing flow control |
| USB | Host-enumerated data and power ecosystem | Programming or high-throughput modem data | Wrong host/device role, missing driver, back-power |

## Clocks: hardware's shared idea of “now”

A **clock** is a periodic electrical signal used to coordinate digital work. An oscillator creates a reference frequency; hardware divides or multiplies it to drive the processor and peripherals.

A **clock domain** is a group of logic operating from one clock. Data crossing between unrelated clock domains needs synchronization or buffering. Otherwise one side can observe a signal while it is changing.

Audio adds a sample clock. At a nominal 24 kilohertz (kHz) sample rate, the system represents 24,000 samples per second per channel. If capture and playback use independent oscillators, their actual rates differ slightly. **Clock drift** is that accumulating rate difference. A difference of tens of **parts per million (ppm)** sounds tiny, but it can eventually fill or empty a fixed buffer.

The event-loop analogy is useful: a clock determines when work becomes eligible. It breaks down because hardware clocks are physical oscillators with tolerance, temperature effects, and asynchronous edges—not one globally ordered JavaScript loop.

## Direct Memory Access: move blocks without handling every sample

Suppose the processor received an interrupt for every individual audio bit. It would spend most of its time entering handlers and copying data.

**Direct Memory Access (DMA)** is hardware that transfers blocks between a peripheral and memory without processor instructions for every byte. For microphone input:

```text
I²S peripheral -> DMA buffer A -> audio task
              -> DMA buffer B -> audio task
```

While DMA fills buffer B, software processes buffer A. When a block completes, DMA triggers an interrupt or wakes a task. Playback works in the other direction.

A **ring buffer** is a fixed-size circular sequence of blocks whose read and write positions wrap around. It resembles a bounded queue in a network driver. The analogy breaks if software forgets the physical deadline: when input overtakes the reader, old samples are overwritten; when playback overtakes the writer, the speaker has no sample and produces a gap or click.

Record buffer fill, overflow, underflow, and timestamps. Without those measurements, an audio glitch looks random.

## Audio from pressure to numbers and back

A **microphone** is a transducer: it converts air-pressure changes into an electrical signal. An analog microphone needs an **analog-to-digital converter (ADC)** to measure that signal. A digital microphone contains conversion circuitry and may output I²S or another digital format.

**Pulse-Code Modulation (PCM)** represents audio as a time-ordered sequence of numeric samples.

- **Sample rate**: samples per second for each channel.
- **Bit depth**: bits used for each sample.
- **Channel**: one independent audio stream; mono has one, stereo has two.
- **Frame**: a small block of adjacent samples processed together.

For 24 kHz, 16-bit, mono PCM:

```text
24,000 samples/second × 16 bits/sample × 1 channel
= 384,000 bits/second
= 48,000 bytes/second
```

A 20 millisecond frame contains:

```text
24,000 samples/second × 0.020 seconds = 480 samples
480 samples × 2 bytes = 960 bytes
```

These are mathematical examples, not measured Mochi bandwidth. Network packets, encryption, and protocol headers add overhead.

The word **codec** therefore has two related meanings:

1. a hardware audio codec converts between analog sound signals and digital samples; and
2. a software codec encodes and decodes a compressed representation such as Opus.

Context should make the meaning clear. Raw PCM is simple but large. Compression reduces network and cellular use at the cost of processor time, algorithmic delay, and possible quality loss.

## The complete audio pipeline

Mochi has simultaneous capture and playback pipelines:

```text
CAPTURE
air -> microphone -> ADC/digital interface -> I²S receive -> DMA blocks
    -> echo cancellation -> noise suppression -> level control
    -> optional resampling/compression -> bounded network queue

PLAYBACK
network queue -> decompression/resampling -> limiter -> DMA blocks
    -> I²S transmit -> digital-to-analog conversion/amplifier -> speaker -> air
```

**Resampling** changes sample rate. A **limiter** prevents samples from exceeding an allowed level. These stages consume time and memory, so the system processes short frames instead of accumulating whole recordings.

Full duplex means receive and transmit DMA, audio processing, and network work remain scheduled concurrently. It does not merely mean the wiring has two data directions.

## Why Mochi hears itself

While Mochi speaks, the microphone captures a mixture:

```text
microphone signal = user's voice + room noise + Mochi's speaker echo
```

The echo travels through the air and also through the enclosure, table, and mechanical vibration. It may be much louder than the distant user's voice.

**Acoustic Echo Cancellation (AEC)** estimates the speaker contribution and subtracts it from microphone input. It needs a clean **render reference**: the exact playback samples, with a known relationship to when sound reaches the microphone.

```text
playback samples ───────────────> speaker
       │                            │
       │ render reference           │ acoustic/mechanical path
       v                            v
adaptive echo model ----------> subtract from microphone samples
```

An **adaptive filter** continuously updates its estimate because the echo changes when the user holds the device, sets it on a desk, changes volume, or covers an opening.

**Clipping** occurs when a stage is asked to represent or produce a level beyond its limit; peaks are flattened and new distortion is created. AEC becomes difficult when:

- capture and playback clocks drift;
- buffer delay changes;
- the amplifier or speaker clips, creating sound not represented in the reference;
- the enclosure rattles or resonates;
- the reference is taken before processing that changes the played samples; or
- user and assistant speak simultaneously, called **double-talk**.

Related algorithms solve different problems:

- **Noise Suppression (NS)** reduces steady environmental noise.
- **Automatic Gain Control (AGC)** adjusts microphone level.
- **Voice Activity Detection (VAD)** estimates whether a person is speaking.

None of these substitutes for AEC. Their order and tuning can also affect one another.

> **Mochi product decision:** Full duplex is the shipping behavior once a conversation starts. The M5Stack CoreS3 development board uses the audio codec input labeled `MIC3` as an initial speaker-feedback lane and render-reference path. A later carrier may use post-amplifier analog feedback, rendered digital PCM, or both, but the chosen reference and measured delay must be documented. A bench-only gated-capture comparison can diagnose AEC; it is not a third user mode.

## Amplifier and speaker details matter

A small digital amplifier such as the MAX98357A accepts I²S samples and drives a speaker. It is a **class-D amplifier**, meaning it uses rapid switching for efficiency rather than reproducing the waveform as a continuously varying internal voltage.

The MAX98357A uses a **bridge-tied load** output: both speaker terminals are actively driven. Neither terminal is ground. Connecting one speaker terminal to ground can damage the amplifier.

Supply voltage, speaker **impedance**—its frequency-dependent opposition to electrical current—sample amplitude, enclosure, and safe temperature limits determine actual output. A 5 V amplifier supply can exceed a small speaker's continuous power rating, so firmware needs a volume ceiling and the hardware requires measurement for heat, distortion, and clipping. An amplifier is not an echo canceller.

## Wire modules only after writing the contract

For each candidate board, inspect its schematic and datasheet rather than only a shop description. Confirm whether a pin is:

- raw battery voltage;
- regulated 3.3 V;
- USB 5 V;
- an input that tolerates power while the board is off; or
- a signal capable of feeding current backward into an unpowered rail.

**Back-power** occurs when current enters an unpowered component through a signal or secondary connector. For Mochi, switching the physical power control off must keep both the system and microphone rails off even when USB, a debugger, or modem is connected. That may require a **load switch**—an electronically controlled switch in a power rail—plus power-path control, signal isolation, or current-limiting components.

Join ground references intentionally. Place **decoupling capacitors** close to load power pins; they supply small, fast bursts of current locally. Keep high-current speaker and modem return paths away from sensitive microphone and reference paths.

## Bring up one layer at a time

Use the hardware equivalent of checking physical link, Internet Protocol (IP), and transport before debugging JavaScript Object Notation (JSON) application messages:

1. With power disconnected, check orientation and resistance for obvious shorts.
2. Use a current-limited bench supply when practical.
3. Verify each rail voltage and idle/peak current before connecting expensive modules.
4. Confirm reset and boot-pin levels.
5. Observe clock and bus signals with an oscilloscope or logic analyzer.
6. Read a device identity register or send a minimal known command.
7. Capture raw microphone samples and play a fixed test tone before adding networking.
8. Inspect DMA overflow/underflow counters under load.
9. Run simultaneous capture and playback with a known render reference.
10. Add AEC, network transport, and model behavior one boundary at a time.

An **oscilloscope** plots voltage over time and is useful for analog shape, clock quality, and power transients. A **logic analyzer** records digital high/low states and can decode protocols. Neither replaces a multimeter for basic voltage, resistance, and continuity checks.

## Self-check

Try these without looking back:

1. Why does matching “I²C” on two product pages not prove two boards are safe to wire together?
2. What voltage does the example button GPIO observe when the button is pressed?
3. Why does I²C need pull-up resistors while a typical SPI clock uses a push-pull output?
4. How is I²S different from I²C despite their similar names?
5. Why can 115,200-baud UART not carry raw 24 kHz, 16-bit mono PCM?
6. What work does DMA remove from the processor?
7. What does a larger playback buffer improve, and what costs does it add?
8. Why does AEC need the samples Mochi actually renders?

<details>
<summary>Answers</summary>

1. Voltage domains, thresholds, pull resistors, direction, timing, pinout, power state, and grounding must also match.
2. Low, because the pressed button connects the input to ground.
3. I²C participants use open-drain outputs that release the shared line; the pull-up creates high. A push-pull SPI controller actively creates both clock levels.
4. I²C sends addressed register transactions; I²S continuously sends clocked audio samples with no device address.
5. The raw stream requires 384 kilobits per second before framing or protocol overhead.
6. DMA moves blocks between a peripheral and memory without an interrupt and software copy for every byte or bit.
7. More queued audio covers longer network timing variation, but it delays playback start and leaves more unheard data to discard after cancellation. A correctly designed local interruption flushes the software queue immediately; only samples already committed to the audio hardware or Direct Memory Access path constrain audible stop latency.
8. AEC must estimate the sound sent into the real speaker path. Earlier or differently processed samples give it the wrong reference.

</details>

Continue with [0003 — Printed circuit board (PCB) fundamentals and manufacturing](0003_pcb_fundamentals_and_manufacturing.md). Product decisions are recorded in [architecture decision record (ADR) 0006](../docs/decisions/0006_use_button_started_full_duplex_sessions.md) and [ADR 0008](../docs/decisions/0008_use_exactly_two_physical_controls.md).
