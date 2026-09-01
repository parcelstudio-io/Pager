# PCB design path: from software engineer to a reviewed Mochi carrier

This path has one concrete outcome: design, order, assemble, and bring up a small printed circuit board (PCB), then apply the same process to a modular Mochi carrier in KiCad.

Learning KiCad's controls is the smaller part. The larger job is learning enough electronics to know what to draw and enough manufacturing discipline to know whether the drawing matches a real part. A passing electrical rules check (ERC) or design rules check (DRC) is like a clean compile: useful evidence, not proof that the product behaves correctly.

## What transfers from software engineering

| Software concept | PCB equivalent | Where the analogy stops |
|---|---|---|
| Architecture diagram | Schematic | A schematic also declares physical voltages and current paths. |
| Function or module | Circuit block | Blocks interact through power, heat, noise, and timing as well as named signals. |
| Variable or connection | Electrical net | A physical net has resistance, capacitance, inductance, and a return path. |
| Package API | Symbol and component pins | Connecting legal pin names can still violate electrical limits. |
| Package implementation | Physical part and footprint | A one-digit package or pin-number error can make the board unusable. |
| Compiler checks | ERC | ERC checks declared rules, not whether the circuit is fit for purpose. |
| Static analysis | DRC | DRC checks geometry against configured rules, not signal or power quality. |
| Build artifact | Gerbers, drill files, BOM, and placement file | The artifact can be manufactured exactly and still embody a design mistake. |
| Deployment | Fabrication and assembly | Hardware changes require rework or a new board revision. |
| Logs and debugger | Test points, multimeter, oscilloscope, and debug header | Observability must be designed into the board before it fails. |

## A realistic progression

These are learning estimates, not deadlines. Prior experience, board complexity, assembly method, and review quality change them substantially.

| Goal | Focused learning time |
|---|---:|
| Navigate KiCad and read schematics | 3–6 hours |
| Create a schematic and simple two-layer PCB | 10–20 hours |
| Order and bring up a basic working board | 25–50 hours |
| Design a reviewed modular four-layer Mochi carrier | 80–160 hours |
| Design integrated cellular radio-frequency circuitry | Not a suitable first solo PCB; involve an RF engineer |

Working part-time, a first reviewed carrier may take 6–12 weeks. Plan for at least one board revision. The schedule is less important than passing each evidence gate below.

## The staged path

### Stage 0 — Learn the physics you will use

Read:

1. [IoT and electrical fundamentals](0000_start_here_iot_and_electrical_fundamentals.md).
2. [Core circuits for PCB design](CORE_CIRCUITS_FOR_PCB_DESIGN.md).
3. Sections 1–8 of [PCB fundamentals and manufacturing](0003_pcb_fundamentals_and_manufacturing.md).

Gate: you can calculate LED current, explain a pull-up, identify a complete current loop, distinguish a pin's recommended conditions from its absolute maximum ratings, and explain why a GPIO cannot power a speaker.

### Stage 1 — Make a deliberately simple board

Complete [Lab 1: LED and button board](labs/0001_led_button_board.md). It uses only an externally regulated low-voltage supply, through-hole parts, a button, an LED, connectors, and mounting holes.

Learn symbols, footprints, net labels, annotation, board outline, placement, routing, ground fill, ERC, DRC, 3D inspection, 1:1 paper inspection, and fabrication outputs. Do not make Mochi your first KiCad project.

Gate: the assembled board passes its documented unpowered and powered measurements, and the measured LED current agrees reasonably with the calculation.

### Stage 2 — Build a module carrier

Complete [Lab 2: compute-module carrier](labs/0002_module_carrier_board.md). This introduces a replaceable microcontroller module, debug access, decoupling, test points, connectors, and a controlled external load without adding a charger or radio-frequency layout.

Gate: every pin and footprint has been checked against the exact module documentation, all rails pass bring-up, the button and indicator work, and each connector is exercised independently.

### Stage 3 — Capture the provisional Mochi schematic

Divide the product into hierarchical sheets:

- power input, power switching, and regulated rails;
- ESP32 compute module;
- display and touch;
- microphones and speaker interface;
- listening button and capture indicator;
- USB, programming, and debug; and
- modular cellular connector and power control.

Each sheet needs named voltage domains, expected typical and peak current, interface direction, test points, exact part numbers, and links to primary datasheets. Mark every unverified block:

```text
TBD — DO NOT FABRICATE
```

Gate: no such marker remains; every interface has a voltage, owner, startup state, current budget, exact pinout, and validation result from modules or a breadboard.

### Stage 4 — Lay out and review Mochi Revision A

Use the measured module prototype to validate pinouts, voltage levels, startup states, audio behavior, and current peaks. Then:

1. Configure the board stack-up and design rules from the chosen fabricator before routing.
2. Place mechanics, connectors, switches, display, module keep-outs, and antennas first.
3. Place power conversion and decoupling around the loads they serve.
4. Route critical and high-current loops, then ordinary signals.
5. Preserve continuous return paths and inspect every layer transition.
6. Run ERC and DRC, resolving rather than hiding every exception.
7. Compare every footprint with its datasheet and, for large parts, the physical component.
8. Inspect the board in 3D and print it at 1:1 scale.
9. Inspect exported Gerbers and drill files in an independent viewer.
10. Obtain review from an experienced electrical engineer before ordering 5–10 boards.

Gate: the [pre-order workflow](0003_pcb_fundamentals_and_manufacturing.md#12-beginner-pre-order-workflow) is complete and the reviewer has no unresolved safety, power, footprint, or interface findings.

## Subjects you must be able to use, not merely recognize

- voltage, current, resistance, power, and energy;
- Kirchhoff's current and voltage laws;
- pull resistors, voltage dividers, and loading;
- capacitors, resistance-capacitance timing, and decoupling;
- diodes and transistor or metal-oxide-semiconductor field-effect transistor (MOSFET) switches;
- regulators, dropout, efficiency, and heat;
- logic thresholds and level translation;
- I²C, SPI, I²S, UART, and USB electrical roles;
- ground planes and return-current paths;
- trace current, resistance, voltage drop, and temperature rise;
- battery charging and power-path management at the integration level;
- footprints, tolerances, assembly clearances, and test access; and
- reference schematics, datasheets, ERC, DRC, and manufacturing outputs.

## Scope boundaries for the first Mochi PCB

- Keep cellular on a certified, replaceable module with its intended antenna connection and keep-out rules.
- Reuse a proven protected battery pack and reviewed charging/power-path solution; do not invent a lithium-cell charger.
- Do not route mains voltage.
- Do not connect a speaker, motor, bright lamp, or radio power rail directly to a GPIO.
- Use an external current-limited supply for first power-on.
- Do not order a board with an unverified pinout, footprint, polarity, voltage domain, or `TBD — DO NOT FABRICATE` marker.

The attainable first goal is a modular carrier that connects proven modules safely and observably. A compact production LTE product remains a multidisciplinary electrical, radio-frequency, mechanical, compliance, firmware, and manufacturing project.

