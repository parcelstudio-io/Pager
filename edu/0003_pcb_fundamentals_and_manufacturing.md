# 0003 — Printed circuit board fundamentals: from a diagram to a working board

Start with [0000 — Internet of Things and electrical fundamentals](0000_start_here_iot_and_electrical_fundamentals.md). It introduces voltage, current, resistance, power, ground, regulators, and the idea that current always needs a complete loop. This chapter assumes those ideas, but not previous printed circuit board experience. [0002 — Modules, buses, and audio](0002_modules_buses_and_audio.md) is also useful before choosing Mochi's connectors.

## Prerequisites

You should be able to:

- distinguish voltage from current;
- use a multimeter to measure a low-voltage direct-current rail;
- explain why a load needs both a supply path and a return path; and
- recognize that a 3.3 V pin must not automatically be connected to a 5 V pin.

Do not design a lithium-battery charger from this chapter alone. For an early Mochi prototype, use a protected cell and a documented charger or power module, then validate the exact combination on the bench.

## Learning goals

By the end, you should be able to:

1. explain the difference between a schematic and a board layout;
2. read the path from a component pin, through a **net**, to another pin;
3. explain why a schematic symbol and a physical **footprint** are separate;
4. describe what copper layers, ground planes, return paths, and decoupling capacitors do;
5. name the files used to fabricate and assemble a board; and
6. bring up a new board in small, measurable steps instead of powering everything at once.

## 1. What a printed circuit board actually does

A **printed circuit board (PCB)** is a rigid or flexible sheet that holds components and connects them with patterned copper. The fiberglass material provides mechanical support and electrical insulation. The copper replaces most of the loose jumper wires used on a breadboard.

A populated board is a **printed circuit board assembly (PCBA)**. The extra `A` matters:

```text
PCB   = the manufactured board, with copper and holes but no parts
PCBA  = the PCB after components have been soldered onto it
```

A PCB does not decide what the circuit should do. It makes a circuit repeatable, compact, and mechanically stable. A wrong connection becomes a repeatable wrong connection.

For a software engineer, a useful first analogy is:

| Hardware artifact | Software analogy | Where the analogy stops working |
|---|---|---|
| Schematic | Typed source code | Wires have physical resistance and noise that the drawing does not show |
| Electrical rules | Type checker or linter | A valid connection can still be badly placed or under-sized |
| Layout | Compilation plus resource placement | Millimetres, heat, fields, and current paths affect behavior |
| Manufacturing files | Build artifacts | Fabricating another revision costs money and days, not seconds |
| Board bring-up | Integration test on real hardware | A bad test probe can itself change or damage the circuit |

Use the analogy to organize the workflow, not to assume hardware is deterministic software drawn with lines.

## 2. The small vocabulary that unlocks a schematic

Consider the simplest indicator circuit. `3V3` is a conventional net name for a 3.3 V supply, and `GND` is the name of its ground return:

```text
3V3 ---- R1, 1 kΩ ---->| D1 ---- GND
                   light-emitting diode
```

Current can flow from the 3.3 V supply, through resistor `R1`, through light-emitting diode `D1`, and back through ground (`GND`). The resistor limits current so the diode is not damaged.

The drawing introduces the core objects:

| Term | Meaning | Example |
|---|---|---|
| **Component** | A real part with an electrical job | resistor, display connector, microcontroller |
| **Reference designator** | A unique name for one component | `R1`, `C7`, `U2`, `J3` |
| **Pin** | One electrical connection on a component | pin 1 of `J3` |
| **Schematic symbol** | The logical drawing of a component and its pins | a zig-zag resistor symbol |
| **Net** | Every pin intended to be electrically connected together | the `3V3` net or `GND` net |
| **Pad** | Exposed copper where a component lead is soldered | pad 1 under `R1` |
| **Footprint** | The physical pattern of pads, holes, outline, and clearances for a part | the exact land pattern for a board-edge connector |
| **Trace** | A routed strip of copper joining pads on one layer | copper from `R1` to `D1` |
| **Via** | A plated hole that connects copper on different layers | a connection from a top trace to the ground plane |

### A net is a connection, not a packet stream

In software, a network link carries messages between endpoints. In a schematic, a **net** means that its pins are the same electrical node. These two drawings state the same intent:

```text
U1 pin 8 -------- U2 pin 3

U1 pin 8 --[BUTTON_SIGNAL]  [BUTTON_SIGNAL]-- U2 pin 3
```

The second form uses matching net labels to avoid a long line. Renaming only one label silently disconnects the intended circuit, so net names deserve the same care as public application programming interface (API) names.

Power names such as `VBAT` (battery voltage), `5V0` (5.0 V), `3V3` (3.3 V), and `GND` are nets too. They are not global magic. A board can deliberately have several grounds or supplies, and joining or separating them is an engineering decision.

## 3. Schematic: describe electrical intent

The **schematic** records:

- which exact components exist;
- which pins connect to which nets;
- resistor, capacitor, and other component values;
- supply voltages and power domains;
- connector pin assignments;
- required pull-up, pull-down, reset, and boot behavior; and
- notes that a reviewer or assembler must know.

The schematic should be readable as a story. For example:

```text
battery -> protection -> charger/power path -> regulators -> loads
                                                     |-> compute module
                                                     |-> display
                                                     |-> audio amplifier
                                                     `-> cellular module connector
```

This is Mochi's **power tree**. Drawing it before detailed circuitry makes it easier to find missing rails, incompatible voltages, and unrealistic current budgets.

An **electrical rules check (ERC)** is an automated schematic check. It can catch an output connected to another output, an input left unconnected, or a power pin that appears unpowered. It cannot know that:

- a connector has been drawn backwards;
- an amplifier return current will add noise to the microphone path;
- the cellular supply is too weak for a short transmit burst; or
- a power-off Universal Serial Bus (USB) path can accidentally keep the device partly alive.

Treat ERC like a compiler warning pass: run it, resolve every warning deliberately, and still perform a human design review.

## 4. Symbol versus footprint: logic meets mechanics

A symbol says what pins mean. A footprint says where copper pads physically exist.

```text
schematic symbol       footprint on the PCB       real component

  1 --[ U1 ]-- 4       o  ############  o        must match pad pitch,
  2 --[    ]-- 3       o  ############  o        pin numbering, and body
```

One schematic symbol can map to several packages. A 10 kΩ resistor could be a large through-hole part or a tiny surface-mount part; its logical job is unchanged, but its footprint is completely different.

A wrong footprint can pass ERC and the board layout rules, yet make assembly impossible. This is similar to calling a native library with the right function name but the wrong application binary interface: the logical interface looks plausible while the physical contract is incompatible.

Before using a footprint:

1. confirm the exact manufacturer part number, not just a product family;
2. compare pad numbers with the datasheet's pin table;
3. compare pad sizes and pitch with the recommended land pattern;
4. verify pin 1 and polarity marks;
5. check connector mating direction and board-edge location;
6. check the real body height and keep-out area; and
7. print the board view at 1:1 scale and place large connectors/modules on it.

Manufacturer-provided computer-aided design models are useful starting points, not proof. Independently inspect them.

## 5. Layout: turn ideal nets into physical copper

The **layout** places each footprint at an exact coordinate and turns each net into copper. This is where an ideal schematic connection gains length, resistance, capacitance, inductance, heat, and electromagnetic coupling.

**Inductance** is a property of a current path that resists rapid changes in current; among other effects, it can create a voltage disturbance when current changes quickly. **Electromagnetic coupling** means a changing electric or magnetic field around one conductor transfers unwanted energy into another conductor. In software terms, layout creates hidden shared channels between otherwise separate-looking interfaces. Unlike a software dependency, the strength of that channel changes with distance, geometry, current, and switching speed.

The usual flow includes a three-dimensional (3D) mechanical review:

```text
requirements and measurements
          |
          v
power tree -> schematic -> ERC -> assign/verify footprints
                                      |
                                      v
mechanical outline -> placement -> routing -> DRC -> 3D review
                                                   |
                                                   v
                                          manufacturing files
```

A **design rules check (DRC)** tests physical rules: trace width, spacing, hole size, copper-to-edge clearance, and whether all required nets were routed. Like ERC, it verifies configured rules, not whether those rules fit the product.

### Placement comes before routing

Routing a poor placement produces a neatly connected poor board. Place in this order:

1. board outline, mounting holes, display, buttons, external connectors, and antennas;
2. compute, audio, power, and modem-module connector blocks;
3. decoupling and local support parts next to the pins they support;
4. short high-current and noise-sensitive loops;
5. slower control signals and remaining passive components.

For Mochi, mechanics, antenna clearances, microphone/speaker acoustics, power paths, and the final two physical controls constrain placement before most signal traces are drawn.

## 6. Copper layers and why Mochi starts with four

A board can contain multiple copper sheets separated by insulating material. In the cross-section below, `L1` means layer 1, and so on:

```text
outside
  L1  components + short critical signals
       insulating material
  L2  mostly continuous GND copper plane
       insulating core
  L3  power distribution + slower signals
       insulating material
  L4  components + remaining signals
outside
```

The complete material and thickness definition is the **stack-up**. The board fabricator supplies supported stack-ups. Trace geometry and its nearby reference plane together determine impedance for fast interfaces, so do not invent a stack-up after routing.

For Mochi's first custom carrier, the decision is a four-layer board with a mostly continuous ground plane on layer 2. Four layers cost more than two, but make power distribution and predictable return paths much easier. This is especially valuable around audio, USB, radios, and bursty loads.

### A plane is just a large copper region

A **ground plane** is a broad sheet of copper connected to `GND`. It reduces the resistance and inductance of the shared return path and gives fast-changing signals an adjacent reference.

A **power plane** is a broad copper region for a supply such as `3V3`. It can carry more current with less voltage drop than a narrow trace, although its exact capacity still depends on copper thickness, geometry, temperature, vias, and airflow.

## 7. Return paths: every outgoing current comes back

This is the most important physical idea in board layout.

When a signal changes, current travels out through its signal conductor and returns through some path, usually the nearby ground plane. The circuit is a loop:

```text
driver ---- outgoing trace ---- receiver
  ^                                |
  `------- nearby GND return ------'
```

At low frequency, current tends toward paths with low resistance. As edge speed increases, the return current tends to stay close beneath the outgoing trace because that loop has lower impedance. **Edge speed**, not merely how often messages are sent, makes a digital trace electrically fast.

If the outgoing trace crosses a gap in its ground reference, the return current must detour:

```text
good:  signal  -------------------->
       GND     =====================

bad:   signal  -------------------->
       GND     ======= gap ========
                         ^ return detours, loop grows
```

The larger loop can radiate more noise, receive more interference, and distort the signal. Therefore:

- keep the ground plane continuous beneath USB and other fast signals;
- do not split the reference plane under a fast trace;
- use nearby ground vias when a signal changes layers and its return needs to follow; and
- keep high-current loops short and wide so their voltage drops do not disturb audio or logic.

Ground is a shared reference and a return conductor, not a hole into which current disappears.

## 8. Decoupling: a tiny local energy buffer

A microcontroller does not draw perfectly steady current. Millions of internal transistors switch, creating very short current demands. A long path back to the regulator cannot respond instantly because every trace has some resistance and inductance.

A **decoupling capacitor** is placed between a component's supply pin and ground, physically close to those pins:

```text
regulator ---- 3V3 trace -----------+---- integrated-circuit supply pin
                                    |
                                  [ C ]  decoupling capacitor
                                    |
GND plane --------------------------+---- integrated-circuit ground pin
```

During a fast demand, the capacitor supplies some current through a very small local loop. The regulator replenishes it afterward. A software analogy is a small local cache in front of a slower backing service. The analogy stops at sizing: a capacitor's value, construction, voltage bias, placement, and loop inductance all matter.

Practical rules:

- start with the component vendor's reference schematic and layout;
- place each small ceramic decoupling capacitor next to the supply pins it serves;
- route its supply-to-capacitor-to-ground loop with short, wide copper and a close ground via;
- add larger **bulk capacitance** near loads that change current more slowly, such as a modem; and
- do not treat a large capacitor as a substitute for a capable battery, regulator, connector, or power path.

Capacitor values are not universal decoration. Follow the exact regulator, codec, compute-module, and modem documentation, then verify the rail with measurements.

## 9. Mochi's first carrier board: what is intentionally modular

Mochi's first custom board is a **carrier**: it connects already-tested modules and implements product-specific power, controls, audio, connectors, and test access. It does not put a bare cellular modem chip and a custom radio-frequency path directly on revision A.

That decision limits the number of new problems introduced at once. A bare cellular modem would add fine-pitch assembly, multi-amp transient power, subscriber identity module protection, high-speed USB, radio-frequency feed geometry, antenna matching, regional variants, and carrier approval simultaneously.

The first carrier should preserve these Mochi decisions:

- use four copper layers with a mostly continuous ground plane;
- keep the large SIM7600G-H board as an external cellular bench mule, then choose an exact smaller replaceable modem module before enclosure commitment;
- prove the exact compute-to-modem interface before freezing the carrier;
- use one fail-low capture-enable command that also drives the cyan listening indicator;
- use a latching power switch that physically de-energizes the system and prevents USB, debug, or modem connections from back-powering it;
- expose labelled test access for power rails, reset, boot, programming, slow buses, and modem controls; and
- avoid casual test-pad stubs on USB differential pairs or future radio-frequency traces. Those need impedance-safe probe structures reviewed with the stack-up.

The finished product has exactly two physical controls: conversation start/stop and power. Temporary development connectors and test points are instrumentation, not extra user controls.

See [architectural decision record 0005 — Build a modular carrier before integrated radio frequency](../docs/decisions/0005_build_modular_carrier_before_integrated_rf.md) and [architectural decision record 0008 — Use exactly two physical controls](../docs/decisions/0008_use_exactly_two_physical_controls.md).

## 10. From layout files to an assembled board

Two different businesses may be involved:

1. A **board fabricator** makes the bare PCB: copper, insulation, drilled holes, solder mask, and printed labels.
2. An **assembler** applies solder paste, places components, heats the board in a reflow oven, adds special hand-soldered parts, inspects it, and may program or test it.

Some vendors provide both services. A low bare-board quote does not include components or assembly.

### What the colored board features are

| Feature | Purpose |
|---|---|
| Copper | Carries current and signals |
| Plated hole or via | Connects copper layers; some holes also hold component leads |
| Solder mask | Insulating coating that exposes only intended solder areas |
| Silkscreen | Printed reference names, polarity, warnings, and board identity |
| Surface finish | Protects exposed pads and makes them solderable |

### Manufacturing outputs

| Output | Plain-language purpose |
|---|---|
| Gerber or ODB++ files | Geometry for each copper, solder-mask, and silkscreen layer |
| Drill files | Hole locations, sizes, and plated/non-plated intent |
| Bill of materials (BOM) | Exact manufacturer part numbers, quantities, references, and approved substitutions |
| Component placement list (CPL) | X/Y position, rotation, and board side for each machine-placed part |
| Assembly drawing | Human-readable polarity, orientation, special handling, and do-not-fit notes |
| Stack-up and impedance notes | Required layer construction and any controlled trace geometry |
| Test specification | What should be powered, programmed, measured, or inspected before shipment |

Open the generated fabrication files in an independent viewer. Check that the outline, holes, copper, text, and solder-mask openings match the source design. Generated files are release artifacts; keep them tied to a source revision and exact BOM.

### Three reviews with different questions

- **Design for manufacture (DFM):** Can the fabricator reliably make these trace widths, gaps, holes, clearances, and layers?
- **Design for assembly (DFA):** Can the assembler orient, place, solder, inspect, and rework the selected components?
- **Design for test (DFT):** After assembly, can we safely measure important rails and control signals and program the board?

These acronyms are not paperwork for its own sake. They are three attempts to make failures observable before ordering boards.

## 11. Test points are hardware observability

Test points are the hardware equivalent of logs, metrics, and debugger attachment points. Add them while designing; they are difficult to add after a failure.

For the modular Mochi carrier, provide accessible, labelled points for:

- ground clips;
- battery input and every regulated power rail;
- reset, boot, and programming signals;
- the capture-enable/cyan-indicator command and the actual gated microphone rail;
- appropriate low-speed buses and interrupts;
- modem enable, reset, and power control; and
- current-measurement jumpers or zero-ohm links around major load branches.

Do not put them under an installed battery or another module. Do not add ordinary branch stubs to radio-frequency or USB traces just to fit a probe; fast-net observability must be designed with signal integrity in mind.

## 12. Beginner pre-order workflow

### The current KiCad project workflow

In current KiCad projects, the `.kicad_pro` file stores project settings, `.kicad_sch` stores the schematic, and `.kicad_pcb` stores the physical board. Keep them together in version control.

Use this tool sequence:

```text
Create project
  → draw and annotate schematic
  → select and verify exact footprints
  → run ERC and manually review the circuit
  → update PCB from schematic
  → configure stack-up and fabricator design rules
  → define outline and place components
  → route traces and fill copper zones
  → run DRC and manually inspect return/power paths
  → inspect 3D and print at 1:1
  → generate Gerbers, drills, BOM, and required placement data
  → inspect manufacturing outputs independently
```

ERC is the **electrical rules check** for declared schematic relationships. DRC is the **design rules check** for configured board geometry. Neither determines whether a resistor value is sensible, a regulator handles a transient, a connector is viewed from the correct side, or a chosen footprint matches the ordered part.

Configure board clearances, widths, holes, vias, annular rings, copper-to-edge limits, and stack-up from the selected fabricator before routing. Defaults are not a manufacturing contract. For practice, follow [Lab 1](labs/0001_led_button_board.md) and [Lab 2](labs/0002_module_carrier_board.md) rather than beginning with the complete Mochi board.

Perform this workflow before paying for assembly:

1. **Freeze measured interfaces.** Record the exact module, connector, cable, voltage, current, pinout, and host/device role used on the bench.
2. **Draw the power tree.** List every rail and each load's typical and peak current. Treat initial numbers as estimates until measured.
3. **Capture the schematic.** Use exact manufacturer part numbers and documented alternates.
4. **Run ERC.** Resolve every warning; then manually review connector direction, polarity, voltage domains, boot pins, and power-off paths.
5. **Verify footprints.** Compare pin numbers and dimensions with each datasheet and actual large parts.
6. **Bench-test risky circuits.** Validate charger, regulator, fuel gauge, power path, protection, and capture gate before copying them onto the carrier.
7. **Place from constraints.** Begin with mechanics, antenna keep-outs, audio, connectors, and high-current loops.
8. **Route and run DRC.** Inspect return paths and power widths manually; a passing DRC is necessary but not sufficient.
9. **Review in 3D and at 1:1.** Check enclosure clearances, cable exits, button access, battery space, and assembly order.
10. **Generate and inspect outputs.** View fabrication files independently and reconcile the BOM and placement list.
11. **Ask for DFM/assembly review.** Do this before ordering, and approve every component substitution deliberately.
12. **Order a learning quantity.** Mochi's plan is 5–10 assembled carriers plus two bare boards. Expect a second revision.

A revision that produces a clear measurement and an unambiguous correction is useful engineering, not failure.

## 13. Bring-up: first power without the smoke

**Bring-up** is the controlled process of turning a newly assembled board into a known-working system. Do not attach the battery, modem, display, audio, and USB simultaneously and hope.

Useful equipment:

- schematic and board layout on-screen;
- magnifier or microscope and bright light;
- digital multimeter with sharp probes;
- current-limited bench power supply;
- USB programmer/debugger and a known-good data cable;
- oscilloscope for startup droop, ripple, clocks, and fast faults;
- temperature probe or thermal camera if available; and
- insulated tweezers and appropriate soldering/rework tools.

Use eye protection and a nonflammable work surface. Stop if a lithium cell swells, heats unexpectedly, leaks, or is physically damaged. Do not learn battery-pack construction by experimenting on the product board.

### Bring-up sequence

1. **Record identity.** Photograph both sides and record board revision, serial number, BOM variant, and assembler substitutions.
2. **Inspect unpowered.** Look for solder bridges, missing parts, shifted packages, reversed diodes/capacitors, and connector damage.
3. **Check rails against ground.** Measure resistance from each power rail to ground and compare boards. A brief low reading that rises can be a capacitor charging from the meter; investigate rather than relying only on the continuity beeper.
4. **Remove optional loads.** Leave the modem and other replaceable modules disconnected.
5. **Apply current-limited power.** Start with the documented voltage and a conservative current limit. If the limit engages or a part heats, switch off and investigate.
6. **Measure the power tree.** Confirm each rail at its test point, in dependency order, and record current draw.
7. **Check reset and boot.** Confirm reset level and clocks where appropriate; then flash minimal diagnostic firmware.
8. **Exercise one interface at a time.** Test a button, display, microphone, speaker, storage, and network module separately before combined load.
9. **Verify privacy hardware.** Across reset, crash/watchdog, recovery, and firmware update, prove capture remains gated until an authenticated live session asserts the coupled cyan command.
10. **Verify true power-off.** With the latching switch off, connect battery/charger, USB, debug, and modem paths one at a time. Neither the system nor microphone rail may rise through back-power.
11. **Add the modem last.** Use the instrumented external mule first and measure its burst power separately.
12. **Run combined stress tests.** Only after blocks pass alone, run full-duplex audio, display/caption animation, network traffic, charging, and weak-network tests together.

## 14. What to measure and write down

Use a table, not memory. Initial targets are hypotheses until measured on the exact board.

| Test | Tool | Probe location | Evidence to save |
|---|---|---|---|
| Unpowered rail-to-ground resistance | multimeter | each rail test point to a labelled ground point | stable value or time behavior, per board |
| Regulated rail voltage | multimeter | at the load and regulator output | minimum/typical/maximum across modes |
| Startup and load-step droop | oscilloscope | directly at the affected component supply pins with a short ground connection | screenshot, trigger condition, lowest voltage |
| Total and branch current | bench supply/current measurement point | board input and major load branches | off, boot, idle, listening, speaking, charging |
| Capture gate | oscilloscope or multimeter | command, indicator, and microphone rail | reset/boot/live/stop/crash timing |
| Power-off isolation | multimeter | system and microphone rails | voltage/current with each external cable attached |
| Component temperature | temperature probe | regulator, charger, amplifier, modem connector region | ambient, operating mode, peak and steady state |
| Interface behavior | debugger or suitable instrument | test points defined for that bus | pass/fail, rate, errors, and firmware revision |

Probe the component pins or nearest intended test point when investigating power integrity. A measurement at the bench supply can hide a voltage drop in the cable, connector, fuse, switch, or trace.

## 15. Prototype, design validation, and production validation

Teams often separate hardware maturity into:

- **Engineering validation test (EVT):** Does the architecture and engineering work?
- **Design validation test (DVT):** Does a near-product design work across enclosure, environment, radio, compliance pre-scan, and reliability conditions?
- **Production validation test (PVT):** Can the factory build and test it repeatedly with acceptable yield?

The names vary between organizations. The important idea is that a working hand-built prototype does not prove that a factory can make thousands safely and consistently.

## Self-check

Try to answer without looking back:

1. What is the difference between a schematic net and a copper trace?
2. Why can a correct symbol with the wrong footprint pass automated checks but fail physically?
3. Why does a fast signal need a nearby return path?
4. What does a decoupling capacitor do, and what can it not repair?
5. What is the difference between PCB fabrication and PCBA assembly?
6. Why should a new board be powered from a current-limited supply before attaching all modules?
7. Which Mochi functions must remain off when its latching power switch is off?

### Answer check

1. A net states which pins must share an electrical node; a trace is one physical piece of copper used to implement that connection.
2. The symbol and automated net checks describe logical pins, while the footprint controls real pad position, size, numbering, and mechanics.
3. Current always completes a loop; a nearby return keeps loop area and impedance small, reducing noise and signal distortion.
4. It supplies brief local current and keeps the supply stable at the load. It cannot make an inadequate battery, regulator, connector, or long resistive path adequate.
5. Fabrication makes the bare layered board; assembly solders components onto it and may inspect, program, and test it.
6. Current limiting confines the energy available to an unknown short or wrong part and makes faults easier to observe one rail at a time.
7. The entire system, including the microphone rail, must be physically de-energized; USB, debug, charger, or modem connections must not back-power it.

Next, [0004 — Cellular, radio-frequency, power, and certification](0004_cellular_rf_power_and_certification.md) applies these board and measurement ideas to the most electrically demanding optional module in Mochi.
