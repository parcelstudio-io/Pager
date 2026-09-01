# ADR 0011 — Integrate LEXI-R10401D and a camera on the first carrier

Status: Rejected for Rev A
Date: 2026-09-01

## Context

An earlier proposal placed the raw 16 × 16 mm LEXI-R10401D, its 1.8 V interface
translation, SIM, RF feed, and an SPI camera on the first four-layer Mochi PCB. It would
produce a thinner final assembly and gave useful answers about Cat 1bis, 3 Mbaud UART,
flow control, and GPIO budgeting.

It conflicts with accepted [ADR 0005](0005_build_modular_carrier_before_integrated_rf.md),
which deliberately makes the first custom PCB a modular carrier. It also assumed that a
module's FCC/carrier approvals would transfer readily to a pocket/body-worn host. Current
integration guidance does not support that assumption: the antenna/feed, portable RF
exposure, simultaneous Wi-Fi transmission, enclosure, firmware, and host implementation
still need product-level review and usually testing.

The proposal also treated a camera as part of the first board even though MVP requirement
PR-06 excludes one, and it depended on an analog tap from a differential class-D speaker
output without a released, synchronized reference circuit.

## Decision

Do **not** integrate raw LEXI-R10401D RF, SIM, or a populated camera on Rev A.

Keep the useful constraints:

- Cat 1bis is the leading cellular class for this product.
- The host path needs a measured high-rate UART with RTS/CTS or another explicitly frozen
  transport; 115,200 baud is inadequate for raw voice.
- ESP32-S3 octal-PSRAM and strapping GPIO constraints are mandatory.
- Full-duplex audio needs a time-aligned rendered reference and enclosure-level AEC proof.
- Capture power and the cyan indicator remain electrically coupled and fail inactive.
- A future raw-radio PCB must use the exact current vendor reference design and receive
  RF, power-integrity, DFM, certification, and carrier review.

Rev A instead follows [ADR 0012](0012_use_modular_north_american_cat1bis_click_for_rev_a.md):
a removable MIKROE-6396 Click supplies the modem, SIM, 1.8 V translation, 3.8 V regulator,
bulk capacitance, U.FL, and recovery USB. The camera rail/connector stays DNP and is not a
sensor commitment.

## Consequences

- Rev A is thicker and larger than a raw-LGA design; the 26 mm stretch enclosure target is
  unlikely without a later integration spin.
- Cellular and Wi-Fi-only boards can share the carrier, and the modem can be isolated or
  replaced during debugging.
- The carrier has no custom LTE RF trace, but antenna/enclosure/SAR/product certification
  remain real work.
- A second PCB revision is expected after measured cellular, acoustic, power, and
  mechanical evidence.
- This rejection does not reject LEXI-R10401D itself. It rejects combining too many
  unproven disciplines on the first custom assembly.

## Revisit when

Gate D has passed with the intended host firmware and network; an antenna fits final CAD;
load-step and thermal measurements close; exact US carrier/order-code evidence is frozen;
and an accredited RF/compliance reviewer accepts the portable-device plan.
