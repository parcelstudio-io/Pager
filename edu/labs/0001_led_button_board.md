# Lab 1 — Design and bring up an LED and button board

## Outcome

Create a two-layer KiCad board powered by an external regulated 3.3 V supply. It contains one LED, one current-limiting resistor, one pushbutton, one pull-up resistor, input/output connectors, two isolated mounting holes, and labelled test points.

This is intentionally not Mochi. It is small enough that you can predict every steady-state voltage and current before paying for it.

## Safety and equipment

Use only a current-limited, regulated 3.3 V source. Do not use mains circuitry, a bare lithium cell, or an improvised charger.

Prepare:

- computer with the current stable KiCad release;
- digital multimeter;
- current-limited bench supply, or a protected 3.3 V development-board supply with a documented current limit;
- soldering iron, stand, solder, ventilation, flush cutters, tweezers, and eye protection;
- breadboard and jumpers for the pre-PCB test;
- magnifier; and
- optional oscilloscope for observing button bounce.

## Electrical behavior

Use this architecture:

```text
J1 3V3 ---- R1 1 kΩ ---- D1 red LED ---- GND
J1 3V3 ---- R2 10 kΩ ---- BUTTON_OUT ---- SW1 ---- GND
J2 exposes: 3V3, GND, BUTTON_OUT
TP1 = 3V3, TP2 = GND, TP3 = BUTTON_OUT, TP4 = R1/D1 junction (LED anode)
```

For an illustrative red LED with approximately 2.0 V forward voltage:

```text
I_LED = (3.3 V - 2.0 V) / 1 kΩ ≈ 1.3 mA
I_button_pressed = 3.3 V / 10 kΩ = 0.33 mA
```

The exact LED current varies with supply, LED forward voltage, resistor tolerance, and temperature. Record the LED's exact manufacturer part number and datasheet before finalizing the schematic.

Expected measurements:

| State | `BUTTON_OUT` | LED | Approximate source current |
|---|---:|---|---:|
| Button released | 3.3 V | on | LED branch only |
| Button pressed | 0 V | on | LED branch + 0.33 mA pull-up branch |

## Bill of materials

Choose exact orderable parts; do not leave generic package assumptions in a fabrication release.

| Ref | Function | Initial choice | Footprint intent |
|---|---|---|---|
| J1 | power input | 2-pin 2.54 mm header | through-hole, pin 1 = `3V3` |
| J2 | signal output | 3-pin 2.54 mm header | through-hole, pin 1 marked |
| R1 | LED current limit | 1 kΩ, ±5% or better, ≥0.125 W | axial through-hole |
| D1 | indicator | red LED with documented current/Vf | 5 mm through-hole |
| R2 | button pull-up | 10 kΩ, ±5% or better, ≥0.125 W | axial through-hole |
| SW1 | normally open button | exact tactile switch | through-hole footprint verified from drawing |
| H1, H2 | mechanical mounting | selected screw clearance | non-plated through hole, no nearby copper |
| TP1–TP4 | measurement access | loop or pad test points | probeable and labelled |

Before ordering, replace every “initial choice” with a manufacturer part number and distributor/manufacturer datasheet link. Print each footprint at 1:1 and place the physical part over it.

## First prove it on a breadboard

1. Build both branches using the intended values.
2. Set the supply to 3.3 V with a conservative current limit, such as 20 mA.
3. Confirm LED orientation before power.
4. Power it and measure `3V3`, `BUTTON_OUT` released/pressed, and LED current or resistor voltage.
5. Calculate LED current again from measured resistor voltage: `I = V_R1 / R1`.
6. Save the expected and measured table. A major disagreement is a reason to investigate, not to tune the PCB blindly.

## KiCad workflow

The file names below describe the current KiCad project structure: `.kicad_pro` stores project settings, `.kicad_sch` the schematic, and `.kicad_pcb` the board.

1. Create a new project named `led_button_lab`; commit the empty project to version control.
2. In Schematic Editor, place J1, J2, R1, R2, D1, SW1, the test points, power symbols, and two mounting holes.
3. Wire the circuit and add the exact net labels `3V3`, `GND`, and `BUTTON_OUT`.
4. Annotate the schematic and fill component fields with values, manufacturer part numbers, and datasheet links.
5. Assign footprints. Open each exact package drawing and check pad numbers, spacing, hole diameter, body outline, polarity, and pin-1 mark.
6. Run ERC. Resolve warnings by correcting the circuit or adding a documented intentional exception. ERC cannot validate your resistor value or connector orientation.
7. Update the PCB from the schematic.
8. In Board Setup, enter the chosen fabricator's minimum clearance, track width, via, hole, annular-ring, edge-clearance, and layer rules. Do this before routing.
9. Draw a simple rectangular outline on `Edge.Cuts`. Put both mounting holes at documented coordinates.
10. Place connectors at edges, button where a finger can reach it, LED where it is visible, and test points where probes fit. Keep copper away from isolated mounting holes.
11. Route signal and power traces. Use a filled `GND` copper zone, refill it, and inspect whether every ground pad actually connects.
12. Add readable silkscreen: board name/revision, connector polarity, signal names, LED polarity, and pin 1. Keep text off pads and outside the outline.
13. Run DRC and resolve all findings. Inspect unconnected items and zones after the final refill.
14. Use the 3D Viewer to catch wrong package shapes and collisions. Then print copper, outline, holes, and footprints at 1:1 and place actual parts over the paper.
15. Generate Gerbers and drill files. Also export a bill of materials (BOM); create a component placement list (CPL) only if an assembler requires it.
16. Open the generated Gerbers and drills in a viewer independent of the PCB editing canvas. Check outline, holes, layers, text, polarity marks, and missing copper.

## Design review checklist

- The source is exactly 3.3 V regulated and connector polarity is unmistakable.
- LED anode/cathode and physical package mark agree with symbol and footprint.
- Each switch pin number agrees with the exact switch drawing; internally duplicated pins are understood.
- J1 and J2 pin numbering is correct when viewed from the mating side.
- Test points are reachable without shorting adjacent conductors.
- Mounting holes are non-plated and respect mechanical/copper clearance.
- Track and spacing rules match the selected fabricator.
- ERC and DRC have no unexplained exclusions.
- Datasheets and calculations are stored beside the design notes.
- Gerbers and drill files were inspected after export.

## Bring-up

1. Inspect both board sides for bridges, reversed parts, damaged holes, and unsoldered joints.
2. With power disconnected, check that `3V3` is not shorted to `GND`.
3. Check continuity from each connector pin to the expected component and test point.
4. Set 3.3 V and a conservative 20 mA limit before connecting J1.
5. Power on. Stop immediately if the current limit engages, a part heats, or the LED behavior is unexpected.
6. Record supply current and all expected measurements from the earlier table.
7. Measure voltage across R1 and calculate actual LED current.
8. Press and release SW1 at least 20 times while observing `BUTTON_OUT`. An oscilloscope may show short bounce transitions; that is expected from a mechanical switch and becomes a firmware concern in Lab 2.

## Completion gate

Do not continue to Lab 2 until all are true:

- schematic, exact BOM, PCB source, Gerbers, drills, and bring-up notes are versioned;
- ERC and DRC findings are resolved or individually explained;
- the physical parts fit and their orientation markings are useful;
- `BUTTON_OUT` is reliably high when released and low when pressed;
- measured LED current is explainable from measured voltage and component tolerances; and
- you can point to the complete current loop for both branches.
