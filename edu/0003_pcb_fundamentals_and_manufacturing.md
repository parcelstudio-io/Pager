# 0003 — PCB fundamentals and manufacturing

A printed circuit board (PCB) is both wiring and mechanical structure. Copper traces connect component pads; insulating fiberglass separates copper layers; drilled/plated holes connect layers; solder mask protects copper; silkscreen labels the assembly. A PCB does not replace components—it places and interconnects them repeatably.

For a software analogy, the schematic is the typed logical program, layout is resource-aware compilation into physical space, design rules are static checks, manufacturing files are the build artifact, and bring-up is integration testing against real physics. Unlike software, changing one misplaced trace means fabricating another board.

## Schematic versus layout

The **schematic** states electrical intent: nets, components, values, power domains, connectors, and annotations. Electrical-rule check (ERC) flags missing drivers, unpowered pins, and suspicious connections, but it cannot know that your amplifier current will pollute a microphone ground.

The **layout** assigns real footprints and routes copper. Placement is usually more important than clever routing. Put related components together; decoupling capacitors close to supply pins; connectors where mechanics demand; antenna regions at the enclosure edge with specified keep-outs; high-current loops short and wide; and continuous ground beneath high-speed signals.

For Mochi's first carrier, use four layers:

```text
L1  components and critical signals
L2  mostly continuous ground plane
L3  power distribution and slower signals
L4  components and signals
```

The exact stack-up comes from the fabricator. A continuous adjacent ground plane gives signals a short high-frequency return path and makes controlled-impedance USB/RF routing possible. Do not route a fast trace across a split in its reference plane.

## The manufacturing package

A fabrication/assembly order commonly needs:

- **Gerbers or ODB++:** one geometry file per copper/mask/silkscreen layer.
- **Drill files:** plated and non-plated hole coordinates/sizes.
- **BOM (bill of materials):** manufacturer part number, value, package, references, quantity, and approved substitutions.
- **CPL/centroid/pick-and-place:** component X/Y position, rotation, and board side.
- **Assembly drawing:** polarity, connector orientation, special handling, and do-not-fit parts.
- **Stack-up/impedance notes:** layer materials/thickness and requested trace impedance.
- **Test specification:** what the assembler or your fixture must verify.

The board house fabricates bare PCBs. PCBA adds solder paste, machine placement, reflow, inspection, and sometimes hand assembly/programming/test. The cheapest headline quote often excludes components, setup, stencil, extended parts, inspection, shipping, duty, and rework.

## DFM, DFA, and DFT

- **Design for manufacture (DFM):** Can the fabricator reliably make the trace widths, gaps, drills, copper-to-edge clearance, stack-up, and finish?
- **Design for assembly (DFA):** Can machines place/reflow the packages? Are polarity marks clear? Are tall parts and connectors accessible? Will parts tombstone or shadow each other?
- **Design for test (DFT):** Can we safely observe and drive rails, reset, boot, buses, audio, USB, and programming signals after assembly?

Test points feel wasteful until the first board does not boot. Add labeled ground hooks, every power rail, reset/boot/programming, suitable slow buses, modem control, and current-measurement jumpers. Avoid pads hidden under a fitted battery. Do not add ordinary stub pads to USB differential pairs or RF traces; use impedance-safe inline/probe structures reviewed against the fabricator stack-up. A later bed-of-nails fixture can contact an aligned grid of low-speed test pads.

## Why the first PCB should be modular

Putting a bare LGA cellular modem on revision A combines too many unproven domains. Its supply may need amp-scale transients and bulk capacitance. USB requires controlled differential routing. RF outputs need 50-ohm geometry, short paths, antenna matching/keep-outs, and vendor review. SIM pins need ESD protection. The modem SKU, firmware, carrier, and antenna can all change.

A modular carrier keeps an evaluated cellular breakout replaceable. The board still teaches us:

- actual connector and cable stack;
- charger, regulator, battery gauge, protection, and power sequencing;
- audio/display/control placement;
- mute implementation;
- mechanical fit and assembly order;
- firmware flashing and production test.

Expect a second spin. A first PCB that yields measurements and an unambiguous fix is successful engineering.

## A safe first-board workflow

1. Freeze interfaces from measured prototypes, not aspiration.
2. Draw the power tree and calculate typical/peak current and heat.
3. Capture schematic with exact manufacturer part numbers and alternates.
4. Run ERC and manually review every connector, polarity, boot pin, and voltage domain.
5. Import manufacturer-approved footprints/3D models; verify pin 1 and real dimensions against datasheets.
6. Bench-validate the selected charger, power-path controller, regulator, gauge, and protection behavior against representative load steps before committing that circuit.
7. Place from mechanics and current/RF/acoustic constraints, then route.
8. Run design-rule check (DRC), inspect ground returns and 3D clearances, and print the board 1:1.
9. Generate outputs from a tagged source revision and independently view the manufacturing files.
10. Obtain DFM/assembly feedback and compare landed quotes.
11. Order 5–10 assembled units plus two bare boards; preserve the exact BOM and substitutions.

## Bring-up

Do not plug in everything and hope. Inspect under magnification; check for shorts from every rail to ground; power from a current-limited source; validate one rail at a time; confirm clocks/reset; flash a minimal diagnostic; then attach display, audio, and modem incrementally. Log board serial, rework, measurements, and failures.

EVT validates engineering. DVT validates a design close to the product across environment, mechanics, RF, compliance pre-scan, and reliability. PVT validates the manufacturing process and yield. Names vary, but separating those questions prevents a polished prototype from being mistaken for a manufacturable product.

See [ADR 0005](../docs/decisions/0005_build_modular_carrier_before_integrated_rf.md) and the [daily PCB gate](../scrum/20260830/task_0001/daily_plan.md).
