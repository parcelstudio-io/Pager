# Mochi R0 carrier — modular pager companion reference design

Status: Reference design only — **not released for fabrication**
Date: 2026-09-01
KiCad project: [`hardware/mochi/`](../../hardware/mochi/)

## 1. Outcome

The safest first custom Mochi board is a **58 × 82 mm, four-layer modular carrier**. It
integrates the ESP32-S3, charging, switched power, microphone, speaker amplifier,
display connector, controls, and test access. North-American cellular is a removable
**MIKROE-6396 4G LTE 3 Click** on the back of the carrier, not a raw LGA modem.

This keeps the first board debuggable and agrees with
[ADR 0005](../decisions/0005_build_modular_carrier_before_integrated_rf.md). It also
keeps a Wi-Fi-only build valid. The raw-radio integration proposed earlier is deferred
until a cellular mule, antenna, enclosure, and US compliance plan pass their gates.

The checked-in KiCad files are useful now for electrical review, firmware pin contracts,
mechanical stacking, and purchasing experiments. They are deliberately a **module-level
schematic and unrouted placement study**. Generated footprints, regulator support
passives, stack-up-specific routing, and antenna/enclosure work are not production
released. Sending this directory to a PCB factory would be a category error.

### Recommended configurations

| Configuration | Populate | Use |
|---|---|---|
| **A — Wi-Fi/BLE first** | Everything except J3, U2, U15, J6, D3, R11 | First power, USB, display, audio, privacy, and AEC bring-up |
| **B — North-America LTE EVT** | A plus MIKROE-6396 at J3; its logic jumper at 3.3 V | AT&T/Verizon lab and field experiments after power tests |
| **C — camera experiment** | DNP U15/J6/D3/R11 plus a reviewed adapter | Future still images only; prohibited in the MVP by PR-06 |
| **D — Type-C current detection** | U2 fitted and R1/R2 removed | Later engineering option; not verified in R0 |

Configuration B has one mandatory daughterboard ECO: **remove the MIKROE-6396's D3
(Click USB VBUS to regulator-input diode), then verify it is open circuit**. The Click's
USB-C connector must not be exposed in the enclosure. This prevents a second USB cable
from energizing the modem while Mochi's power slide is off.

## 2. System architecture

```text
                    Mochi USB-C
                 5 V power + USB 2
                          │
                 ESD / TVS protection
                          │
           ┌──────────────┴───────────────┐
           │ BQ25628E charger + NVDC path │
           └────────┬───────────┬─────────┘
                    │ BAT       │ SYS_ALWAYS
     protected 1S 1500 mAh      ├── MAX17055 fuel gauge
          pack + NTC             │
                                SW1 latching slide
                                  │ PWR_SW_ON
                 ┌────────────────┴────────────────┐
                 │                                 │
        TPS22992S load switch             TPS61236P 5 V boost
                 │ SYS_SW                          │ LTE_5V_RAW
        TPS63802 3.3 V buck-boost         TPS2001E limit/gate
                 │ 3V3                             │ CELL_5V
       ┌─────────┼───────────┐                     │
       │         │           │               MIKROE-6396
 ESP32-S3    touch LCD   audio/privacy        LEXI-R10401D
 Wi-Fi/BLE                               Cat 1bis + SIM + U.FL
       │                                      │
       └──────── 3 Mbaud UART + RTS/CTS ──────┘
```

The board has two radio systems with different jobs:

- The **ESP32-S3-WROOM-1-N16R8** supplies compute, 2.4 GHz Wi-Fi, and Bluetooth LE.
- The **LEXI-R10401D on MIKROE-6396** supplies LTE data and SMS. It does not replace
  ESP Wi-Fi, and its Wi-Fi scan capability is positioning assistance rather than a Wi-Fi
  data link. This design does not claim native phone calls, VoLTE, or GNSS.

Wi-Fi is preferred; LTE is failover. Firmware should avoid simultaneous maximum Wi-Fi
transmit, LTE transmit, full-volume playback, and battery charging because the small pack
has limited current and thermal margin.

## 3. Why these parts

| Function | Baseline part | Reason and tradeoff |
|---|---|---|
| Compute/Wi-Fi/BLE | [ESP32-S3-WROOM-1-N16R8](https://www.espressif.com/sites/default/files/documentation/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf) | Module reduces RF-layout risk; 16 MB flash and 8 MB octal PSRAM support assets, networking, and audio buffers. It is not a Linux computer: local large-model inference is out of scope. |
| US cellular | [MIKROE-6396](https://www.mikroe.com/4g-lte-3-click-for-north-america) | Replaceable Cat 1bis daughterboard with LEXI-R10401D, SIM, logic translation, 3.8 V regulator, bulk capacitance, U.FL, and recovery USB. It costs thickness and board area but removes raw-LGA, SIM, RF-trace, and 1.8 V translator risk from Rev A. |
| Charger/power path | [BQ25628E](https://www.ti.com/product/BQ25628E) | Current 1-cell, 2 A NVDC charger with input limiting, NTC support, ADC, and I²C. R0 remains conservative at 500 mA USB input and no more than 1.0 A battery charge. |
| Main 3.3 V | [TPS63802](https://www.ti.com/product/TPS63802) | Buck-boost keeps 3.3 V while a 1S pack moves above and below 3.3 V. Its real output capability and thermal margin depend on input voltage, inductor, layout, and load—not the headline current alone. |
| LTE 5 V | [TPS61236P](https://www.ti.com/product/TPS61236P) + [TPS2001E](https://www.ti.com/product/TPS2001E) | Dedicated boost gives regulated 5 V in battery and USB modes, true disconnect, soft-start/current limiting, reverse blocking, discharge, and fault reporting. It is less compact than reusing a charger boost node but has much clearer handoff behavior. |
| Fuel gauge | [MAX17055](https://www.analog.com/en/products/MAX17055.html) + 10 mΩ Kelvin shunt | Counts current and estimates time/age. Its low-side sense polarity is `CSP = pack negative`, `CSN = system ground`; reversing those silently reverses current sign. |
| Microphone | [IM69D129F](https://www.infineon.com/part/IM69D129F) | Small, high-SNR PDM microphone with a bottom acoustic port. It avoids an analog codec but makes PCB/enclosure port geometry important. |
| Playback | [MAX98357A](https://www.analog.com/en/products/max98357a.html) | I²S-input mono class-D amplifier; no codec control bus or MCLK needed. Its output is bridge-tied: neither speaker lead is ground. |
| Speaker | [PUI AS01808AO-SC18-WP-R](https://puiaudio.com/file/specs-AS01808AO-SC18-WP-R.pdf) | 18 × 13 × 2.5 mm, 8 Ω, 1 W, spring-contact part. Plan roughly a 1 cm³ sealed rear chamber and validate the final gasket/vent. |
| Display/touch | [Waveshare SKU 27057](https://www.waveshare.com/wiki/1.69inch_Touch_LCD_Module) | 1.69-inch, 240 × 280 ST7789V2 SPI LCD with CST816S/T I²C touch. At about 33.13 × 41.13 mm, it is a realistic face/display module for this enclosure. |
| EVT battery | [BatterySpace CU-J450-V3](https://www.batteryspace.com/Polymer-Li-Ion-battery-3.7V-1500mAh-5.55Wh-3A-rate-703562-2C-2.aspx) | Protected 1S, 1500 mAh/5.55 Wh, nominally 68 × 35 × 7.5 mm, 10 kΩ NTC, 1.4 A max charge, 3 A max discharge. It is an EVT source, not yet production-qualified. |

The pack uses housing `5023510300`: pin 1 `PACK+`, pin 2 `NTC`, pin 3 `PACK−`.
The carrier uses the right-angle [Molex 5023520300](https://www.molex.com/en-us/products/part-detail/5023520300)
mate. Obtain the exact assembled-pack UN 38.3 test summary, IEC 62133-2 evidence,
protection thresholds/delays, full NTC curve, traceability, and change-notification terms
before DVT.

## 4. Power and true-off behavior

### 4.1 USB and charging

Two 5.1 kΩ `Rd` resistors make J1 a basic Type-C sink. They do not magically grant a
particular current. R0 therefore fixes the charger's hardware input limit at a conservative
500 mA until firmware and source detection are proven. The BQ25628E charge current must
be programmed to **≤ 1.0 A**, below the selected pack's 1.4 A maximum.

U2, a TUSB320LAI current-advertisement detector, is DNP. If it is later used, R1/R2 are
removed because the controller supplies the Type-C termination. That option needs a
reviewed truth table plus a safe hardware fallback if firmware is absent.

USB D+/D− go only to the ESP32-S3 native USB pins through TPD4E05U06 ESD protection and
a TS3USB3000 switch. For normal operation the switch has `SEL=0`, `OE=0`; when its 3.3 V
supply disappears its `Ioff` behavior makes every data path high impedance. Charger
D+/D− detection is not shared with this port.

### 4.2 The power slide

SW1 does not carry every ampere. It applies `SYS_ALWAYS` to `PWR_SW_ON`, which enables
the main load switch, 3.3 V converter, LTE boost, and LTE current-limit switch. A 100 kΩ
pull-down makes the default off.

With SW1 off, `SYS_SW`, `3V3`, `MIC_3V3`, `LTE_5V_RAW`, `CELL_5V`, and `CAM_3V3` are
dead. The BQ25628E power path and the MAX17055 remain attached to the pack intentionally;
“off” means that the system and sensors are electrically isolated, not zero battery
current. Bench tests must try to back-power the board from all USB ports, debug pads, and
the modem socket.

R0 cuts LTE immediately. That is private and deterministic, but it gives the modem no
graceful network/power-down interval. A production revision may add a hardware off
sequencer with a bounded timeout; it must never turn “off” into an indefinitely
firmware-controlled promise.

### 4.3 LTE current budget

The current LEXI-R10 data sheet reports about **540 mA typical and 900 mA maximum averaged
over connected LTE data Tx/Rx at maximum transmit power** on the module's 3.8 V rail.
Those are not described as microsecond “peaks.” The integration guidance asks for at least
twice typical current, or 1.08 A, at the modem supply. R0 targets 1.5 A on `CELL_5V` to
cover the Click regulator, bulk-capacitor charging, cable/copper loss, and uncertainty.

At low state of charge, an illustrative LTE-only pack current is:

```text
5.0 V × 1.1 A / (0.93 boost efficiency × 3.3 V pack) ≈ 1.79 A
```

Adding ESP32, display, audio, and conversion loss makes **2.6–2.9 A plausible**, nearly
the selected pack's 3 A protection rating. This arithmetic says “EVT may be possible,”
not “the power design works.” Cold and aged cells, connector resistance, load steps,
boost start-up, and thermal limits must be measured. Firmware needs load shedding.

The earlier idea of feeding LTE from a BQ25895 `PMID` node is rejected for R0. With USB
present, PMID can follow an input whose automated charger negotiation may exceed 5 V;
battery OTG also has a handoff delay. A dedicated boost avoids putting a possible 9/12 V
node on a 5 V Click board.

## 5. Cellular connection, pin by pin

The [MIKROE schematic](https://download.mikroe.com/documents/add-on-boards/click/4g-lte-3-click-north-america/4g-lte-3-click-schematic.pdf)
shows an easy-to-miss naming convention: the physical mikroBUS `TX` pin carries data
*from* the Click to the host, and physical `RX` carries data *to* the Click. The carrier
therefore crosses TX/RX but not RTS/CTS names:

| ESP32-S3 | Carrier net | J3 physical pin | Direction/purpose |
|---|---|---|---|
| IO41 UART TX | `LTE_TX` | `RX` | ESP → Click → module RXD |
| IO42 UART RX | `LTE_RX` | `TX` | module TXD → Click → ESP |
| IO1 UART RTS | `LTE_RTS` | `RTS/CS` | ESP output → module RTS input |
| IO2 UART CTS | `LTE_CTS` | `CTS/INT` | module CTS output → ESP input |
| IO38 | `LTE_RI` | `RI/PWM` | ring/URC indication → ESP |
| TCA9534 P2 | `LTE_PWR_PULSE` | `PWR/AN` | active-high host command; Click transistor pulls module `PWR_ON` low |
| TCA9534 P3 | `LTE_RESET` | `RESET` | reset control; confirm inactive default at bring-up |
| U8 output | `CELL_5V` | `5V` | modem power through the Click's 3.8 V LDO |
| 3.3 V | `3V3` | `3V3` | Click TXB0106 host-side logic only; set JP1 to 3.3 V |

The `RTS/CS` signal is shared with ClickID access. Firmware must never talk to ClickID
while modem hardware flow control is active.

LEXI-R10 supports up to 3 Mbaud. With 8N1 framing, `3,000,000 × 8/10 = 2.4 Mbit/s` of
payload in each full-duplex direction before PPP/AT/socket overhead. That is ample on
paper for 20–64 kbit/s Opus audio, but it is below the radio's advertised 10.3 Mbit/s
downlink. Stress-test the exact firmware path with RTS/CTS, encrypted sockets, display,
AEC, and reconnects; do not infer full Cat 1bis throughput from the radio badge.

## 6. Audio and capture truth

```text
IO40 CAPTURE_EN ─┬─ 100 kΩ pull-down
                 └─ TPS22918 ── MIC_3V3 ─┬─ IM69D129F microphone
                                         ├─ SN74LVC2G125 PDM isolation
                                         └─ cyan LED + resistor

ESP I2S rendered PCM ── MAX98357A ── OUTP/OUTN ── 8 Ω speaker
             └──────── same post-volume/post-mute PCM ── AEC reference
```

`CAPTURE_EN` is a direct ESP pin with a hardware pull-down. When it is inactive, the mic
has no power and the PDM clock/data paths are isolated. The cyan LED is powered from the
downstream `MIC_3V3` rail, so firmware cannot turn on the mic without also energizing the
indicator or command the indicator independently.

That is a strong **electrical truth coupling**, not a malware-proof privacy switch: hostile
firmware could assert both, and component faults can disagree. The latching power slide is
the certain physical privacy control. Fault-injection tests still need to cover open LED,
shorted load switch, stuck GPIO, boot, crash, watchdog, recovery, and OTA.

The AEC reference is the rendered digital stream **after software volume, mute, and
cancellation decisions**. Do not connect an ADC divider casually to MAX98357A's class-D
speaker outputs: both leads switch and neither is ground. A digital reference misses some
amplifier/speaker nonlinearity, so final enclosure work must prove echo-return loss,
double-talk, barge-in, clock alignment, and acoustic isolation. If it fails, choose a
synchronized codec/reference design from measurements rather than asserting that a
post-class-D tap is automatically better.

## 7. Display, controls, camera, and buses

Mochi exposes exactly two exterior controls:

- SW1: latching power slide.
- SW2: active-low conversation button on IO39 with a pull-up.

The display shares SPI clock/MOSI with the DNP auxiliary camera connector. Each device has
its own chip select. Touch, charger, gauge, and the slow GPIO expander share I²C:

| Device | Address |
|---|---:|
| BQ25628E | `0x6A` |
| MAX17055 | `0x36` |
| TCA9534A | `0x20` |
| CST816 touch | likely `0x15`; confirm the exact populated S/T variant |

TCA9534 P0/P1 are fault inputs; P2/P3 command modem power/reset; P4/P5 reset LCD/touch;
P6 drives the amber session-intent indicator; P7 enables the DNP camera rail. Fast modem
UART/flow-control, PDM, I²S, touch IRQ, conversation, and privacy signals stay on direct
ESP GPIO.

The optional J6 connector is only a **generic SPI/I²C experiment contract**. No camera
sensor or production pinout is selected. A module requires its own adapter review and a
white indicator powered from the downstream camera rail. The common Arducam M0031 OV2640
is a 24-pin DVP camera consuming roughly twelve GPIO and is not directly compatible with
J6. Camera absence remains the production/MVP decision.

The complete GPIO assignment is generated in
[`hardware/mochi/doc/pin_map.csv`](../../hardware/mochi/doc/pin_map.csv). IO35–37 are
unused because N16R8's octal PSRAM consumes them. IO3/45/46 are avoided as strapping pins;
IO0 reaches only a pulled-up fixture test net. Native USB remains on IO19/20.

## 8. Mechanical and RF layout plan

The 58 × 82 mm carrier fits the maximum 95 × 60 × 30 mm product envelope. It does not yet
prove the 80 × 56 × 26 mm stretch target. The 57.15 × 25.4 mm Click, 68 × 35 × 7.5 mm
battery, display, speaker chamber, connectors, antenna cable, and fasteners form a stacked
mechanical system that is likely to consume most of the 30 mm height.

Four layers should ultimately be used as:

1. top: components and short critical signals;
2. inner 1: uninterrupted ground reference;
3. inner 2: power distribution, with controlled breaks only after return-path review;
4. bottom: LTE daughterboard/socket and low-risk routing.

The checked-in PCB has a no-copper keepout on all four layers under the ESP module antenna
and places it at a board edge. The final design also needs the exact Espressif land pattern,
edge/antenna clearance, stitching vias, USB 90 Ω differential routing, short switcher
loops, Kelvin shunt routing, a clean bottom-port microphone opening, and a gasketed speaker
chamber. None is released in R0.

For LTE EVT, use the Click's U.FL and start with a known external antenna covering 617 MHz.
The [Taoglas FXUB16](https://www.taoglas.com/product/fxub616-wideband-cellular-flex-pcb-antenna-617-6000mhz-with-90-feed-black-150mm-1-37-cable-and-i-pex-mhf1/)
covers 617–6000 MHz but its roughly 90 × 15 mm flex is mechanically awkward. The compact
[PCS.55.A](https://www.taoglas.com/product/pcs-55-a-small-fr4-wideband-4g-lte-antenna/)
is easier to package but its published low-band efficiency is weak; it is a measurement
candidate, not a verified choice. The final antenna must be tuned in the real plastic,
next to the battery/display/speaker and a hand/body, then tested for VNA match, TRP/TIS,
Wi-Fi/LTE desense, coexistence, and SAR.

## 9. US network and certification reality

The current MIKROE/LEXI configuration covers LTE bands 2, 4, 5, 12, 13, 14, 66, and 71,
which is a much better North-American starting set than many small global modules. Public
sources show module-level AT&T/FirstNet and Verizon work, including a
[Verizon Open Development listing](https://opendevelopment.verizonwireless.com/design-and-build/approved-modules/module/32280).
Freeze the exact LEXI order code, hardware revision, firmware, TAC, FCC identifier, and
carrier applicability in writing before buying a lot. A current public, exact T-Mobile
approval for this module was not located, so T-Mobile remains unverified rather than
assumed.

Most importantly, **module approval is not finished-product approval**. The LEXI modular
grant/integration conditions are for mobile/fixed separation and a certified antenna/feed
implementation. A pocket/body-worn pager plus a Click, U.FL cable, internal antenna,
four-layer host, Wi-Fi transmitter, and new enclosure changes the RF exposure and
simultaneous-transmitter case. Plan for:

- FCC intentional-radiator integration review, host Part 15B, labeling/manual language,
  permissive-change or new certification path, and portable-device SAR;
- PTCRB device certification and each target carrier's device/onboarding process;
- simultaneous LTE + Wi-Fi/Bluetooth transmitter evaluation and coexistence;
- Bluetooth SIG qualification/declaration;
- battery transport/safety evidence and charger/system safety review.

Use the FCC's [KDB 996369 module guidance](https://apps.fcc.gov/oetcf/kdb/forms/FTSSearchResultPage.cfm?id=44637&switch=P),
[KDB 447498 RF-exposure guidance](https://apps.fcc.gov/oetcf/kdb/forms/FTSSearchResultPage.cfm?id=20676&switch=P),
[PTCRB certification process](https://www.ptcrb.com/get-certified/),
[AT&T IoT device process](https://iotdevices.att.com/iot-accelerator.aspx), and
[Verizon certification process](https://opendevelopment.verizonwireless.com/get-certified)
with an accredited lab early. These are design inputs, not paperwork to add after routing.

LEXI-R10401D also lacks band 25 and is not a basis for claiming current T-Mobile/Starlink
Direct-to-Cell compatibility. Any satellite feature needs explicit module, firmware, SIM,
plan, carrier, and certification evidence.

## 10. Alternatives researched

| Alternative | What it improves | Why not R0 |
|---|---|---|
| Raw LEXI-R10401D | Smallest eventual board, exact band set | Reintroduces 1.8 V translation, SIM/ESD, RF feed, transient supply, assembly, antenna-equivalence, and certification risk simultaneously. Revisit after Gate D. |
| [Telit LE310Q1-SN](https://www.telit.com/devices/le310q1/) | Compact 15 × 18 mm Cat 1bis second-source candidate | Not footprint/firmware/certification drop-in; public power and exact carrier evidence need a fresh freeze review. |
| [Quectel EG800Q-NA](https://www.quectel.com/product/lte-standard-eg800q-series/) | Widely supported Cat 1bis family | North-American variant lacks bands 14 and 71; heavier source requirement. |
| [SIMCom SIM7672G](https://www.simcom.com/product/SIM7672G.html) | Global Cat 1bis alternative | Larger and the public band set lacks 14/71 for this baseline. |
| LTE-M module | Lower average power and potentially GNSS | Half-duplex radio scheduling, latency, sustained session behavior, and carrier plan must be field-proven against full-duplex interaction. It is not rejected on bitrate arithmetic alone. |
| Cat 4 module | Mature broadband and USB | More power, area, and usually a second antenna; unnecessary for compressed conversational audio. |

## 11. Updates to the earlier proposal

The earlier Claude research made several durable contributions: choose Cat 1bis rather
than Cat 4, reserve octal-PSRAM GPIO, use four layers, keep hardware flow control, make
power integrity and certification first-class, and preserve a real capture indicator.
R0 changes the implementation where later evidence exposed risk:

- raw LEXI integration → removable MIKROE-6396 for the first carrier;
- battery-direct modem rail → isolated, regulated 5 V Click rail;
- “900 mA peak” → 900 mA maximum **averaged connected LTE data current**;
- modem-side 1.8 V translators → the Click's validated onboard TXB0106;
- analog post-class-D AEC tap → known rendered digital PCM reference;
- 1.28-inch round display → exact 1.69-inch touch module;
- assumed SPI camera → DNP generic connector, no MVP sensor;
- vague small LiPo → exact protected 1500 mAh EVT pack and mating connector;
- inherited module certification → explicit portable-device US certification program.

[ADR 0011](../decisions/0011_integrate_lexi_r10401d_on_four_layer_carrier.md)
records why the integrated proposal was rejected for Rev A; [ADR 0012](../decisions/0012_use_modular_north_american_cat1bis_click_for_rev_a.md)
records the modular choice.

## 12. What has actually been verified

| Check | Result | Meaning |
|---|---|---|
| Deterministic contract check | 54 pass, 2 expected warnings, 0 fail | BOM/manifest/net parity, exact LTE directions, hard-off topology, MAX17055 polarity, capture coupling, GPIO/address budgets, current/throughput arithmetic |
| KiCad schematic ERC | 0 violations | KiCad parses the schematic and sees no rule violation at this module-level abstraction |
| KiCad PCB DRC | Expected `unconnected_items` and one generated-library mismatch only | Placement geometry has no additional detected error; the board is intentionally unrouted and reference footprints are unreleased |
| Four-layer/outline/keepout audit | 58 × 82 × 1.6 mm, four copper layers, four ESP antenna keepouts | The generated placement contract matches the document |
| Primary-source review | Current vendor data, Click schematic, carrier/FCC processes checked 2026-09-01 | Selected interfaces and risks are traceable; commercial approvals still need written confirmation |

Reproduce the desk checks with:

```bash
node tools/hardware/generate_mochi_reference.js
python3 tools/hardware/check_carrier_design.py
```

The check intentionally returns success while warning that PCB DRC is non-zero for
unrouted nets. It would be misleading to suppress those opens or call the board DRC-clean.

No physical PCB exists, so the configuration is **not verified to work in hardware**.
Before fabrication release, all of the following remain blocking:

1. complete vendor-reference inductors, feedback/limit networks, bypassing, ESD, pull-ups,
   exact production symbols/footprints, and derating calculations;
2. obtain the exact Click, modem, display, pack, speaker, switches, and connector samples;
3. continuity/back-power matrix with battery, Mochi USB, Click USB, and debug fixture;
4. 3.0–4.35 V battery emulator plus 500 mA/1.5 A/3 A USB source tests, LTE load steps,
   inrush, charger/boost stability, cold/low-SOC sag, and thermal soak;
5. Wi-Fi-only full-duplex audio/AEC/barge-in and privacy fault-injection gates;
6. modem attach, SIM/APN, PPP/socket, 3 Mbaud RTS/CTS, recovery, handoff, and reconnect;
7. enclosure CAD/3D interference, mic port, sealed speaker chamber, antenna and cable fit;
8. routed PCB peer review, signal/power-integrity review, manufacturer DFM, ERC/DRC with
   zero unexplained violations, and two independent schematic/layout reviews;
9. VNA, TRP/TIS/desense/coexistence/SAR work in the final enclosure;
10. FCC, PTCRB, target-carrier, Bluetooth, and battery compliance plan accepted before DVT.

The honest verification conclusion is: **the architecture and high-risk connections are
internally consistent and supported by current primary sources; working hardware and US
deployment are still measured release gates.**

## 13. Source hierarchy

For modem details, use the current documents linked from the
[Trasna LEXI-R10 document hub](https://sites.google.com/view/trasna-lexi-r10/home), not a
cached reseller PDF. The specific snapshot reviewed was data sheet R19 (2026-08-04) and
system integration manual R11. Also retain the exact
[MIKROE-6396 schematic](https://download.mikroe.com/documents/add-on-boards/click/4g-lte-3-click-north-america/4g-lte-3-click-schematic.pdf)
with the purchased board revision. If a manufacturer document and this design disagree,
stop and resolve the discrepancy; this document never overrides a component data sheet.
