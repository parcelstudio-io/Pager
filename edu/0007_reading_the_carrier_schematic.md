# 0007 — Reading Mochi's carrier design as a software engineer

This lesson teaches enough PCB/EE vocabulary to review the Mochi R0 reference without
pretending that reading a schematic makes someone an RF or power-layout engineer. Keep
the [design explanation](../docs/design/0003_mochi_carrier_board_design.md),
[schematic](../hardware/mochi/mochi.kicad_sch), and
[connectivity contract](../hardware/mochi/doc/connectivity.csv) open beside it.

## 1. Start with the right mental model

A schematic is closer to a typed dependency graph than to a map:

- a **component** is an object with named pins;
- a **net** is a shared variable connecting pins;
- a pin's electrical type is something like an interface contract;
- a data sheet is the component's API, limits, timing contract, and deployment guide;
- ERC is a type/lint check;
- a PCB is the physical implementation, where distance, geometry, heat, fields, and
  current return paths become behavior;
- DRC checks geometric rules, not whether the product has good RF, audio, or thermals.

Two wires with the same net label are electrically connected even if the schematic draws
them on different pages. Conversely, two traces that look close on a PCB are not connected
unless copper actually joins them.

R0 is intentionally a **module-level** graph. It names major ICs and high-risk interfaces
but omits the released inductors, feedback resistors, decoupling network, exact land
patterns, and routing that a fabrication design requires. Its PCB is a placement study
with ratsnest lines, not routed copper.

## 2. Voltage is state; current is flow; power is the bill

A software analogy that mostly holds:

- voltage resembles pressure or a value relative to a reference;
- current is the amount flowing per second;
- resistance impedes flow and creates voltage drop;
- capacitance stores a small amount of charge locally;
- power is `voltage × current` and turns into work or heat;
- energy is `power × time` and determines battery life.

Always ask “relative to which ground?” A net named `3V3` means about 3.3 V relative to
`GND`. Current also needs a **closed loop**: from a source, through the load, and back to
the source. PCB return-current geometry matters just as much as the outward signal trace.

Example: 900 mA at 3.8 V is 3.42 W. It is not the same claim as 900 mA at 5 V, and neither
is a battery-life number. If a converter supplies 5.5 W from a 3.3 V pack at 93%
efficiency:

```text
pack current = output power / (pack voltage × efficiency)
             = 5.5 W / (3.3 V × 0.93)
             ≈ 1.79 A
```

That is why a small LTE design can be limited by amperes and voltage sag even when its
average watt-hours look acceptable.

## 3. Read Mochi one rail at a time

Do not begin with every signal. Highlight the power rails in this order:

```text
VBUS_5V ── BQ25628E ── SYS_ALWAYS
PACK_P/N ─────┘             │
                            ├─ SW1/U5/U6 ── SYS_SW ── 3V3
                            └─ SW1/U7/U8 ── LTE_5V_RAW ── CELL_5V
3V3 ── U12 when CAPTURE_EN ── MIC_3V3
3V3 ── U15 when CAM_EN ────── CAM_3V3  (DNP)
```

`SYS_ALWAYS` is intentionally attached to the charger/power path, battery, fuel gauge,
and the inputs of the two switched trees. `SW1` drives enable pins; the large current goes
through semiconductor switches, not through a tiny front-panel contact.

When SW1 is off, all product/sensor rails must collapse. The charger and 7 µA-class gauge
may remain alive. This distinction prevents an imprecise promise such as “the battery is
physically disconnected.”

### Back-power is an unexpected import cycle

A supposedly dead rail can be energized backward through USB data protection, a debug
adapter, another module's I/O, or a second USB connector. This is called **back-powering**.
It can make a privacy claim false and can damage an unpowered IC.

Mochi's defenses are layered:

- TPS61236P truly disconnects its boost output in shutdown.
- TPS2001E blocks reverse current and discharges/limits `CELL_5V`.
- TS3USB3000 makes USB D+/D− high impedance when 3.3 V is absent.
- Fixture debug pins may not inject power.
- MIKROE-6396 diode D3 must be removed so its recovery USB cannot feed the modem.

The schematic says this should work. Verification means putting meters/supplies on every
entry path with SW1 off and measuring voltage/current, including fault cases.

## 4. Digital buses are protocols plus electrical rules

### UART: two streams, crossed names

UART has independent transmit and receive wires. A transmitter connects to the other
device's receiver:

```text
ESP IO41 TX  ── LTE_TX ──> Click physical RX
ESP IO42 RX  <── LTE_RX ── Click physical TX
ESP IO1  RTS ── LTE_RTS ─> Click RTS/CS
ESP IO2  CTS <── LTE_CTS ── Click CTS/INT
```

The first pair is crossed. RTS/CTS meanings depend on the modem contract, not a guess
based on English names; the official Click schematic confirms these directions. RTS/CTS
is hardware backpressure, analogous to a bounded queue signaling “stop writing.”

At 3 Mbaud with 8N1 framing, each payload byte consumes ten line bits:

```text
3,000,000 × 8 / 10 = 2,400,000 payload bits/s
```

That easily exceeds a compressed voice stream on paper. It does not prove PPP/socket
throughput, scheduling, or no dropped bytes while Wi-Fi, display, AEC, and flash run.

### I²C: one shared, addressed control bus

`I2C_SDA` carries data and `I2C_SCL` carries the clock. Devices share both wires and use
addresses, much like services sharing a bus with routing keys:

- BQ25628E charger: `0x6A`
- MAX17055 gauge: `0x36`
- TCA9534A expander: `0x20`
- CST816 touch controller: probably `0x15`; confirm the exact module variant

I²C lines are normally open-drain and need pull-ups. Their voltage domain, pull-up value,
bus capacitance, startup state, and behavior when one device is unpowered matter in the
released schematic even though the R0 module graph abstracts some of them.

### SPI: a fast shared bus with per-device selection

The LCD and DNP camera option share `SPI_SCK` and `SPI_MOSI`; each gets a distinct chip
select. The LCD does not need MISO, while a future camera might. Sharing saves GPIO, but
firmware must serialize transfers and each unselected device must release the bus.

### I²S and PDM: audio sample transport, not analog audio

I²S carries rendered samples from ESP32 to MAX98357A using bit clock, word clock, and data.
PDM carries a one-bit high-rate microphone stream using clock and data. The amplifier turns
samples into switched power for the speaker; the ESP decimates PDM into PCM samples.

The class-D output is **BTL (bridge-tied load)**. `SPK_P` and `SPK_N` both switch. Never
ground either speaker lead and never attach a normal ground-referenced oscilloscope probe
to one without a differential measurement plan.

## 5. Follow the privacy invariant in copper

The product invariant is:

```text
microphone can produce usable data  ⇒  cyan indicator is powered
```

In the schematic:

1. IO40 is `CAPTURE_EN`.
2. R7 pulls it down during reset, boot, and an undriven state.
3. U12 only creates `MIC_3V3` when that net is active.
4. `MIC_3V3` powers the microphone, the PDM isolation buffer, and D1's anode.
5. Therefore firmware has no second GPIO with which to lie about the cyan LED.

This is stronger than two adjacent software calls. It is not equivalent to a mechanical
microphone disconnect: malicious firmware can enable both truthfully, and an LED/load-
switch fault can break the implication. The latching system-power slide is the hard
physical boundary. Test the capture circuit through reset, crash, watchdog, recovery,
OTA, stuck pins, LED open, and switch short.

## 6. Understand the audio/AEC choice

Full-duplex conversation means the mic hears Mochi's own speaker. Acoustic echo
cancellation needs two time-aligned sequences:

- the microphone samples;
- the samples Mochi intended to render.

R0 sends the AEC the rendered PCM after software volume, mute, and cancellation decisions.
This is deterministic and does not require connecting an ADC to a switching BTL output.
It cannot capture every amplifier, speaker, enclosure, or clock imperfection. Only the
finished acoustic stack can answer whether echo return loss, double-talk, and barge-in are
good enough.

Software engineers should think about timestamps, bounded buffering, sample-rate
conversion, render cursor vs heard cursor, cancellation, and discontinuities. An EE or
acoustics engineer must also think about mic/speaker placement, leakage paths, chamber,
gaskets, distortion, clipping, and gain.

## 7. Read the component and GPIO contracts

Generated human-readable files are often easier to audit than clicking every KiCad pin:

- [`bom.csv`](../hardware/mochi/doc/bom.csv): exact proposed part/role, DNP state, source,
  and the warning that footprints are reference-only.
- [`connectivity.csv`](../hardware/mochi/doc/connectivity.csv): every net and endpoint.
- [`pin_map.csv`](../hardware/mochi/doc/pin_map.csv): ESP GPIO allocation.
- [`design_manifest.json`](../hardware/mochi/doc/design_manifest.json): machine-readable
  configurations, release status, limits, hard-off contract, and component pins.

When reviewing a net, ask:

1. Who drives it, and in which direction?
2. Who can pull it up or down before firmware runs?
3. What voltage domain is each endpoint in?
4. What happens if either side has no power?
5. Is it a fast edge or high current that layout can corrupt?
6. Is there a test point or measurable symptom?
7. Does a failure violate privacy, battery safety, or RF rules?

The full pin map avoids ESP IO35–37 because octal PSRAM uses them and avoids functional
loads on boot straps IO0/3/45/46. IO0 only reaches a pulled-up fixture boot net. USB is
fixed to IO19/20.

## 8. Schematic correctness is not PCB correctness

A routed PCB must add constraints the graph cannot express well:

- short, wide high-current loops around charger and converters;
- exact inductors/capacitors and their current/voltage/temperature derating;
- uninterrupted high-frequency return paths;
- USB 90 Ω differential geometry and ESD parts next to the connector;
- Kelvin sense traces that do not carry load current;
- ESP antenna keepout on every copper layer at a plastic edge;
- bottom microphone port with no copper/debris and an acoustic gasket;
- class-D output kept away from mic/PDM/RF;
- thermal copper and enclosure touch-temperature limits;
- verified production footprints, paste apertures, courtyard, assembly orientation, and
  accessible test points.

The carrier outline being 58 × 82 mm proves only two planar dimensions. The battery,
display, LTE Click, speaker chamber, sockets, antenna, cable bends, bosses, and plastics
must close in 3D.

## 9. The verification ladder

Each rung can catch a different class of mistake:

1. **Arithmetic/table audit** — addresses, GPIO, voltage, current, bandwidth, bands.
2. **Contract checker** — exact endpoints and invariants across generated artifacts.
3. **KiCad ERC** — parse/electrical rule consistency.
4. **KiCad DRC/visual review** — routing geometry, clearances, footprints, return paths.
5. **Manufacturer DFM/assembly review** — fabrication and placement capability.
6. **Bench power tests** — ramps, load steps, inrush, brownout, reverse/back-power, heat.
7. **Firmware integration** — USB, display/touch, audio, modem flow control and recovery.
8. **Acoustic/mechanical tests** — chamber, port, AEC, barge-in, drop/handling.
9. **RF tests** — VNA, TRP/TIS, desense, coexistence, hand/body effects.
10. **Compliance/carrier tests** — FCC/SAR/Part 15B, PTCRB, carrier, Bluetooth, battery.

Passing rung 3 cannot imply rung 10. R0 currently passes the desk contract and schematic
ERC. DRC deliberately reports unrouted connections because this is a placement reference.

Run the reproducible checks:

```bash
node tools/hardware/generate_mochi_reference.js
python3 tools/hardware/check_carrier_design.py
```

Expected current summary: 54 passes, two explicit warnings, zero failures. One warning is
that the PCB is not fabrication-ready; the other is that DRC remains non-zero for the
intentional opens/reference-footprint parity.

## 10. Review exercise

Without looking at the answer, trace these in `connectivity.csv`:

1. Which pins prove ESP transmit reaches Click receive?
2. Which downstream rail powers both microphone and cyan LED?
3. What components can still touch the pack with SW1 off?
4. Why does `CELL_5V` require both a true-disconnect boost and removal of the Click's D3?
5. Why can the speaker's `-` pin not connect to GND?
6. Which camera parts are DNP, and why is J6 not a promise of sensor compatibility?

Answers: `U10.IO41/J3.RX`; `MIC_3V3`; charger/power path and gauge; independent back-power
paths exist on both carrier and daughterboard; the amp is differential BTL; U15/J6/D3/R11
are DNP and the exact adapter/sensor pinout remains unfrozen.
