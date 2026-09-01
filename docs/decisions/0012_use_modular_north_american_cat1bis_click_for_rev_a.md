# ADR 0012 — Use a modular North-American Cat 1bis Click for Rev A

Status: Superseded by [ADR 0013](0013_use_walter_family_for_rev_a_evt.md)
Date: 2026-09-01

## Context

Mochi needs Wi-Fi, Bluetooth LE, and cellular data in a pager-sized prototype that can be
debugged by a small software-led team. The first PCB must also prove switched power,
privacy coupling, simultaneous audio, display/touch, charging, battery behavior, and
mechanical stacking. Integrating a raw cellular LGA would make RF, SIM, 1.8 V interfaces,
assembly, power transients, carrier firmware, and product certification concurrent first-
spin risks.

The MIKROE-6396 4G LTE 3 Click for North America packages a LEXI-R10401D, nano-SIM,
TXB0106 host-level translation, TPS7A8401A 3.8 V modem supply, bulk capacitance, U.FL,
recovery USB-C, and power/reset controls. Its LTE bands 2/4/5/12/13/14/66/71 form a strong
US laboratory baseline.

## Decision

Use a backside/removable MIKROE-6396 at J3 on the Rev A reference carrier.

- Supply `CELL_5V` at a 1.5 A design target and 3.3 V for the Click's host logic domain.
- Fix the Click logic selector at 3.3 V.
- Remove the Click's diode D3 from its USB VBUS diode-OR path and verify open circuit, so
  its recovery USB cannot defeat Mochi's hard-off boundary.
- Keep the Click USB inaccessible in the enclosure; Mochi's USB-C belongs only to the
  charger and ESP32-S3.
- Use ESP IO41 → Click `RX`, IO42 ← Click `TX`, IO1 → `RTS/CS`, IO2 ← `CTS/INT`, with
  IO38 for RI and TCA9534 outputs for power/reset commands.
- Configure up to 3 Mbaud, 8N1, RTS/CTS and stress-test the real encrypted audio transport.
- Preserve a valid Wi-Fi-only build with J3 empty.
- Treat public modem FCC/carrier listings as evidence for planning, not approval of Mochi.

## Why

- It satisfies ADR 0005's modular-carrier strategy.
- Cellular faults become separable from carrier power/audio/display faults.
- The exact Click schematic resolves host TX/RX naming, voltage domains, SIM, modem supply,
  bulk capacitance, and recovery access.
- A replaceable board reduces early supply and modem-firmware lock-in.
- Cat 1bis bandwidth is ample for compressed full-duplex voice without Cat 4's typical
  second antenna and higher power.

## Consequences

- The daughterboard is about 57.15 × 25.4 mm and consumes stack height; Rev A is a learning
  platform, not the thinnest product.
- Its onboard regulator means the carrier boosts battery energy to 5 V and the Click then
  regulates down to 3.8 V. This is inefficient but provides a clear replaceable interface.
- A 3 A protected 1500 mAh pack has limited cold/aged margin; load shedding and measured
  LTE transients are mandatory.
- `RTS/CS` is shared with ClickID, so firmware cannot access ClickID while flow control is
  active.
- D3 removal is a controlled assembly ECO that must appear in work instructions and
  incoming inspection.
- Portable/body-worn RF exposure, antenna performance, simultaneous transmitters, FCC,
  PTCRB, and target-carrier approval remain product gates.

## Revisit when

The Click mule passes attach/reconnect/data/power/thermal/antenna tests, and measured stack
height or volume justifies the raw-radio integration risk documented in ADR 0011.
