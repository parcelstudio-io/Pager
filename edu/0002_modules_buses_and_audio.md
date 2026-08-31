# 0002 — Modules, electrical buses, and embedded audio

A development module is a component plus the support circuitry that makes it forgiving: regulators, clocks, flash, connectors, antenna, protection, and often a USB programmer. Modules are excellent for learning because they turn soldering and datasheet risks into pin-level interfaces. They are rarely the smallest or cheapest final design.

Think of a module as a hosted service with a physical API. The “API contract” includes voltage, logic level, current, timing, pins, protocol, initialization, mechanical clearance, and failure behavior. A matching protocol name alone does not mean two boards can be safely wired together.

## Electricity in the minimum useful model

- **Voltage (V)** is electrical potential. A pin driven to 5 V can damage a 3.3 V-only input even if both boards say “I²C.”
- **Current (A)** is flow demanded by a load. A supply rated for 500 mA does not force 500 mA into a device; it can provide up to that value. A cellular modem may demand amp-scale bursts.
- **Power (W)** is approximately voltage × current. Energy is power over time, commonly watt-hours for batteries.
- **Ground** is the shared voltage reference and return path, not a magical sink. Current loops and high-frequency return paths affect noise and radio behavior.
- **Logic level** defines what counts as digital high/low. Use a level shifter when domains are incompatible.

Never infer safe battery charging from “the connector fits.” A lithium cell needs a charger matched to its chemistry, charge voltage/current, protection, temperature policy, and system power path.

## Common embedded buses

| Interface | Mental model | Typical Mochi use | Important constraints |
|---|---|---|---|
| GPIO | One software-controlled wire | Button, mute, LED, interrupt | Voltage, pull-up/down, debounce, boot-strapping pins |
| I²C | Addressed shared two-wire control bus | Sensors, fuel gauge, small OLED | Pull-ups, address collisions, capacitance, modest speed |
| SPI | Clocked bus with separate select per device | Fast display, external flash | More wires, routing, chip selects, mode/timing |
| I²S | Continuous synchronous digital audio stream | Microphone, codec, amplifier | Master clocking, sample format/rate, DMA, jitter |
| UART | Asynchronous byte stream | Cellular AT commands, debug | Baud rate, flow control, voltage, boot logs |
| USB | Host/device data and power ecosystem | Flash/debug, cellular data | Host role, connector protection, differential routing, power budget |

I²C and I²S are unrelated despite similar names. I²C carries occasional addressed register transactions. I²S carries timing-sensitive audio samples using bit clock, word-select, and one or more data lines.

UART bandwidth must be budgeted in bits, not labels. At 115,200 baud, framing overhead leaves less than 115.2 kbit/s of payload; it cannot carry 24 kHz mono PCM16 at 384 kbit/s. A modem path over UART/PPP therefore needs measured speech compression, a sufficiently high stable baud rate, and hardware flow control. USB networking can offer more margin, but it requires a proven USB host driver/role and an independent programming/recovery path.

## How modules connect

Before wiring, make an interface table:

| Signal | Producer | Consumer | Voltage/domain | Direction | Boot/default | Notes |
|---|---|---|---|---|---|---|
| `MIC_BCLK` | MCU | microphone | 3.3 V | out | low | Shared only if clock/load budget allows |
| `MIC_DATA` | microphone | MCU | 3.3 V | in | high-Z | DMA input |
| `MODEM_TX` | modem | MCU | verify datasheet | in | varies | “TX” is named from modem perspective |

Then check every board's schematic, not only the shop listing. Confirm whether a pin is raw-cell voltage, regulated 3.3 V, USB 5 V, or an input that cannot back-power the board. Join grounds intentionally. Add decoupling close to the load and keep noisy speaker/modem current away from microphone/reference paths.

Power the system in stages with a current-limited bench supply when possible. Verify rails before inserting expensive modules. A cheap continuity check catches many reversed connectors.

## Digital audio pipeline

A microphone converts pressure to samples. Key terms are:

- **Sample rate:** samples per second, such as 16 or 24 kHz for speech.
- **Bit depth:** bits per sample; PCM16 uses 16.
- **Channels:** mono is usually adequate for uplink; two mics may support beamforming/noise processing.
- **Codec:** representation that compresses audio. Raw mono PCM16 at 24 kHz is 384 kbit/s before overhead, about 173 MB/hour in one direction. Opus can be far smaller at voice settings.
- **Frame:** a small time slice, often tens of milliseconds, processed as one unit.

On an MCU, I²S DMA moves samples without interrupting the CPU for every bit. Software consumes blocks from DMA buffers, filters/resamples, and encodes or transmits them. Playback reverses this path through a codec or I²S digital amplifier.

The MAX98357A reference is a bridge-tied class-D I²S amplifier: it accepts digital samples and switches power efficiently into a speaker. Neither speaker output is ground, so neither may be connected to ground or treated as a ground-referenced headphone output. At a 5 V supply it can also overdrive a 1 W speaker; enforce an amplitude/volume ceiling or choose a suitably rated driver and validate heat/distortion. It is not an acoustic echo canceller. A microphone hearing that speaker creates an echo path through air, enclosure, desk, and chassis vibration.

## Why full duplex is difficult

When Mochi speaks and listens simultaneously, its own output may be orders of magnitude louder at the microphone than the user's voice. Acoustic echo cancellation (AEC) needs a clean copy of the playback signal, adaptive modeling of the changing acoustic path, consistent clocks/delay, and enough processing. Noise suppression and automatic gain control solve different problems and can interact badly.

Start with push-to-talk so capture and playback are separated. Build an enclosed acoustic mule before evaluating AEC because port shape, speaker cavity, gasket leakage, and hand position change the echo. A good algorithm cannot fully rescue clipping or a rattling enclosure.

## Debugging order

For each subsystem, test from physical layer upward:

1. Correct rail voltage and idle/peak current.
2. Clock and signal presence with a scope or logic analyzer.
3. Bus transactions and device identity.
4. Raw samples or register values.
5. Driver behavior under load and failure.
6. Integrated user behavior.

This is the hardware equivalent of checking DNS and TCP before debugging application JSON. See [ADR 0004](../docs/decisions/0004_start_with_push_to_talk_and_ble.md).
