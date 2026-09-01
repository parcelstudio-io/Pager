# ADR 0013 — Use the Walter family for the Rev A EVT carrier

Status: Accepted for EVT
Date: 2026-09-01
Supersedes: [ADR 0012](0012_use_modular_north_american_cat1bis_click_for_rev_a.md)

## Context

Mochi needs one small, debuggable carrier that can prove charging, true-off behavior,
Wi-Fi, Bluetooth LE, cellular data, full-duplex audio, a touch display, and the privacy
indicator before the team attempts raw cellular RF integration. ADR 0012 selected the
MIKROE-6396 North-American Cat 1 bis Click for this purpose.

The official MIKROE product page now marks MIKROE-6396 unavailable. Designing a new
carrier around a daughterboard that cannot presently be bought would make the reference
internally consistent but operationally useless.

[Walter](https://quickspot.io/datasheet/walter_datasheet.pdf) is a 55 × 24.8 mm SoM that
combines an ESP32-S3, Wi-Fi/BLE, a Sequans GM02SP LTE-M/NB-IoT/GNSS modem, nano-SIM,
power conversion, and U.FL cellular/GNSS connectors. It is available now and its
[hardware sources and KiCad footprint](https://github.com/QuickSpot/walter-hardware) are
open. QuickSpot also announces a pin/form-factor/software-compatible Walter Cat 1 bis
for Q4 2026, but that future module has not been released.

## Decision

Use the Walter 28-pin module family as the R1/Rev-A EVT carrier core.

- Populate orderable `P000000100` (ESP32-S3 N16R2) for the first carrier.
- Prefer `P000000118` N16R8 only after QuickSpot confirms supply for the build quantity.
- Use Wi-Fi for the primary conversational path.
- Treat LTE-M as a measured fallback for messages and experimental compressed speech,
  not as a promise of phone-like full-duplex latency.
- Preserve the Walter footprint for the announced Cat 1 bis module, but do not freeze
  its power, firmware, carrier, schedule, or certification assumptions until released
  samples and current documents exist.
- Hide Walter's onboard USB-C in the enclosure. Its VBUS and VIN are directly connected;
  never power both. Use the factory UART or a VBUS-cut USB cable while carrier-powered.
- Feed Walter VIN directly from the protected switched 1-cell system rail. Do not build
  the old 5 V LTE boost/Click rail.
- Power display/audio/sensors from an independent TPS63802 3.3 V rail; Walter's switched
  3.3 V output is limited to 250 mA and remains measurement-only.
- Use a TPS22950 master switch because it provides current limiting and reverse-current
  blocking while disabled. The physical slide controls that switch.

## Why

This removes a separate ESP32 module, cellular daughterboard, 5 V boost, 3.8 V Click
regulator, external modem UART level shifting, and the Click USB back-power ECO. It also
gives firmware one supported module/library boundary and keeps cellular failures
separable from the carrier's audio/display/power circuits.

The decision is deliberately an EVT compromise. Walter LTE-M is simpler and lower power
than Cat 1 bis, but its default internal 115200-baud 8N1 path provides only 92.16 kbit/s
of theoretical payload in each direction before protocol overhead. Low-rate Opus fits
arithmetically; real modem buffering, RTT, jitter, loss, and reconnect behavior must be
measured. The available N16R2 variant also has only 2 MB PSRAM, so camera and large local
model ambitions are constrained.

## Consequences

- The R1 board is 60 × 82 mm and four layers. It fits the 95 × 60 mm maximum face but not
  the 56 mm stretch width.
- The module and its header/solder arrangement consume more thickness than a raw LGA
  design. That is acceptable for EVT, not necessarily for the production industrial
  design.
- The FCC ID on Walter does not approve Mochi. Walter's published integration conditions
  use 20 cm separation and restrict co-location. A body-worn LTE + Wi-Fi/BLE pager needs
  portable RF-exposure and simultaneous-transmitter review, plus final-host testing.
- The first build requires an external LTE antenna; the approved Taoglas example is
  approximately 96 × 21 mm and drives enclosure work more than the modem does.
- If LTE-M cannot meet conversational gates, cellular remains messaging/fallback until
  the Cat 1 bis Walter is released and passes the same gates.

## Rejected alternatives

- **Keep MIKROE-6396:** electrically understandable, but officially unavailable.
- **Raw Trasna LEXI-R10401D now:** excellent 16 × 16 mm Cat 1 bis choice for a later
  AT&T/Verizon product, but it reintroduces 1.8 V translation, SIM, RF, reservoir,
  recovery USB, LGA assembly, antenna, and certification risk on the first custom board.
- **Quectel EG915Q-NA now:** the best presently documented AT&T/Verizon/T-Mobile Cat 1
  bis fallback, but larger and lacking Band 71; still a raw modem integration.
- **Wait for Walter Cat 1 bis:** avoids a temporary LTE-M configuration but makes the
  entire power/audio/display program depend on an unreleased part and schedule.

## Revisit when

Revisit after the LTE-M voice experiment, enclosure/antenna CAD, Walter Cat 1 bis release,
and written certification/lifecycle packages are available. A later raw-LGA board should
only start after the modular EVT has measured rail transients, antenna performance,
network behavior, and acoustic load cases.
