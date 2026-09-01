# Mochi R1 Walter carrier

This directory contains a deterministic **electrical reference and placement study** for
the pager-size Mochi companion. It is intentionally useful for architecture review,
firmware pin contracts, component purchasing, and mechanical experiments. It is **not a
fabrication release**.

The current baseline is a 60 × 82 × 1.2 mm four-layer carrier around the orderable
QuickSpot Walter LTE-M/Wi-Fi/BLE/GNSS SoM. The previously proposed MIKROE-6396 Click was
removed because its official product page now reports it unavailable. The design decision
and alternatives are recorded in [ADR 0013](../../docs/decisions/0013_use_walter_family_for_rev_a_evt.md).

## Files

- [`mochi.kicad_sch`](mochi.kicad_sch) — KiCad system-level schematic.
- [`mochi.kicad_pcb`](mochi.kicad_pcb) — four-layer outline and reviewed component
  placement; intentionally unrouted.
- [`doc/design_manifest.json`](doc/design_manifest.json) — machine-readable electrical,
  configuration, and release-boundary contract.
- [`doc/bom.csv`](doc/bom.csv) — proposed parts and DNP state.
- [`doc/connectivity.csv`](doc/connectivity.csv) — exact named-net endpoints.
- [`doc/pin_map.csv`](doc/pin_map.csv) — Walter/ESP32 GPIO assignment.
- [`doc/bringup_and_validation.md`](doc/bringup_and_validation.md) — physical proof plan.
- [`doc/research_matrix.md`](doc/research_matrix.md) — dated primary-source comparison.
- [`reports/`](reports/) — KiCad/MCP and command-line check evidence.

The generated `Mochi_Reference.pretty` footprints are review geometry, except that the
Walter header pitch, pin order, pad centers, and antenna keepout follow QuickSpot's open
footprint. Every footprint must still be replaced or independently checked against the
exact ordered part and assembly process before fabrication.

## Reproduce the desk checks

From the repository root:

```bash
node tools/hardware/generate_mochi_reference.js
python3 tools/hardware/check_carrier_design.py
```

The current expected result is **66 passed, 2 warnings, 0 failed**. The warnings are
deliberate: the PCB has no routes, and the back-mounted Walter reference produces one
library-parity warning. KiCad ERC is zero. KiCad DRC otherwise reports the 168 expected
unconnected items and no unexpected physical-rule category.

KiCad MCP was also pointed at this exact project. Its full production quality gate is
expected to fail and is retained as useful evidence: a label-oriented system schematic
has zero explicit wires, the PCB is unrouted, and reference footprints are not a release
library. MCP did confirm clean ERC, 100% schematic-to-PCB named-pad transfer, matching
reference sets, a 60 × 82 mm frame, and zero courtyard issues.

## What the board connects

```text
USB-C charge only ─ protection ─ BQ25628E ─ SYS_ALWAYS ─ TPS22950 ─ SYS_SW ─ Walter VIN
                             │                    ▲                    └─ 200uF EVT reservoir
protected 1S pack + NTC ─────┘                    │
                                           latching slide

SYS_SW ─ TPS63802 ─ 3V3_PERIPH ─┬─ LCD + touch
                                ├─ MAX98357A ─ differential 8ohm speaker
                                ├─ TPS22918 ─ MIC_3V3 ─ PDM mic + isolation + cyan LED
                                └─ DNP TPS22918 ─ Arducam Mega + white LED
```

Walter contains the ESP32-S3, Wi-Fi/BLE, LTE-M/NB-IoT modem, nano-SIM, GNSS, RF front
end, and modem-to-ESP UART. The carrier therefore does not route a 50-ohm cellular trace,
SIM bus, 1.8 V modem GPIO, or user USB data.

## Stop conditions

Do not order a PCB from this directory until all of these are true:

- production symbols, footprints, land patterns, paste apertures, and exact order codes
  are frozen;
- the schematic is redrawn with conventional wires/hierarchy and peer-reviewed;
- the power stages are laid out from vendor reference layouts and the entire PCB is
  routed with zero unexplained ERC/DRC findings;
- enclosure CAD closes around the display, battery, speaker cavity, module, USB, switches,
  coax bends, and LTE antenna;
- a physical prototype passes the validation plan; and
- an RF/certification lab accepts the portable simultaneous-transmitter plan.
