# Lab 2 — Design a compute-module carrier

## Outcome

Design and bring up a two-layer carrier for one exact, replaceable microcontroller module. A Seeed Studio XIAO ESP32-S3 is one possible example, not a fixed requirement. Select the exact module first and use only its current primary documentation for pinout, power, programming, dimensions, antenna keep-out, and mating footprint.

This lab teaches Mochi's carrier-board pattern without battery charging, cellular radio-frequency layout, a raw microphone analog front end, or direct speaker drive.

## Required functions

- replaceable compute module on verified sockets or headers;
- regulated low-voltage input compatible with the selected module;
- conversation button with a hardware pull resistor;
- capture/listening indicator LED with current limiting;
- one display-interface connector using a bus supported by the module;
- one audio-control connector carrying only documented logic or module-level signals;
- programming/debug access appropriate to the module;
- decoupling/bulk capacitance required by the module and attached loads;
- labelled test points for ground, each rail, reset/boot, button, LED command, and selected bus signals; and
- two or more isolated mounting holes.

A connector labelled “speaker” must feed a powered amplifier or speaker module with a compatible input. It must not place a loudspeaker across a GPIO. Likewise, use a microphone module with a documented digital or line interface rather than inventing a sensitive analog path in this exercise.

## Architecture record before KiCad

Fill this table with primary-source evidence. Empty cells mean `TBD — DO NOT FABRICATE`.

| Interface/block | Exact part | Supply and peak current | Signal voltage/direction | Boot/off behavior | Source and verification |
|---|---|---:|---|---|---|
| compute module | | | | | |
| power input | | | | | |
| conversation button | | | | | |
| capture LED | | | | | |
| display connector/module | | | | | |
| audio connector/module | | | | | |
| debug/programming | | | | | |

Draw a power tree and add the typical and peak current of every parallel load. The input path, connectors, switch, protection, traces, and regulator/module supply must all tolerate the credible peak with margin.

## Schematic sheets

Use hierarchical sheets so ownership is visible:

1. **Power and test:** input connector, protection copied from an appropriate reference, rail capacitance, power LED if desired, and test points.
2. **Compute:** module headers, required boot/reset networks, local decoupling, programming, and every unused-pin decision.
3. **Controls:** conversation button, pull resistor, capture LED, and optional MOSFET/load-switch driver if the documented load exceeds GPIO capability.
4. **External interfaces:** display and audio-module connectors with ground pins, supply, signal direction, voltage domain, and pin-1 marking.

Use net labels that communicate intent, such as `3V3`, `GND`, `BTN_CONVERSATION_N`, `LED_CAPTURE_EN`, `I2C_SDA`, and `I2C_SCL`. A suffix `_N` means active-low; do not add it unless low is truly the asserted state.

## Electrical design checks

For each GPIO:

- confirm the exact module pin and underlying microcontroller restrictions;
- check boot-strapping, reset, and power-off behavior;
- compare guaranteed logic thresholds, not nominal labels alone;
- calculate pull and LED currents;
- keep output current inside the documented limit with margin; and
- make external loads safe before and during firmware startup.

For each connector:

- show the mating view and pin 1;
- interleave or place ground sensibly with power/signals;
- check maximum current and cable orientation;
- prevent accidental reversed/offset insertion where practical;
- assess ESD and hot-plug exposure; and
- check whether an attached powered module can back-power the carrier.

For I²C, calculate the parallel effect of pull-ups already present on every module. For SPI, UART, I²S, or USB, follow the exact host/module reference layouts and do not add arbitrary test-point stubs to fast nets.

## KiCad and layout workflow

1. Create the project and architecture record together; commit known-good milestones.
2. Draw the hierarchical schematic and record manufacturer part numbers and datasheets in symbol fields.
3. Assign and manually verify every footprint, especially module header spacing, connector mating orientation, button pins, and antenna keep-out.
4. Run ERC, then perform a manual voltage/current/startup review.
5. Set fabricator rules and stack-up in Board Setup.
6. Import the schematic into the PCB and define the board outline and mounting holes from mechanical constraints.
7. Place the compute module first. Honor its antenna keep-out on every copper layer and keep metal, batteries, display cables, and enclosure hardware away as its documentation requires.
8. Place connectors, switch, indicator, debug header, and test points by physical access. Print a 1:1 placement proof before routing.
9. Place decoupling at the relevant power pins and bulk capacitance at load/connector boundaries according to references.
10. Route power and its return as a deliberate pair. Then route buses and ordinary GPIO while preserving a continuous ground return.
11. Add ground zones, refill them, and inspect narrow necks, isolated islands, and return paths.
12. Add revision, connector, voltage, polarity, pin-1, button, and test-point labels.
13. Run DRC, inspect 3D, print at 1:1 again, and review all exceptions.
14. Export and independently inspect Gerbers, drills, BOM, and—if assembled—CPL position/rotation.

## Firmware diagnostics before application code

Write minimal firmware that:

1. prints firmware/board revision and reset reason;
2. samples the button with explicit active-low/high semantics and debounce;
3. switches the capture LED on and off;
4. scans or identifies only the expected bus devices;
5. exercises each connector independently; and
6. reports rail or module status where measurable.

Keep diagnostics deterministic. The full Mochi conversation stack is a poor first board test because too many unrelated layers can fail.

## Controlled bring-up

1. Leave display and audio modules disconnected.
2. Inspect assembly and measure resistance from every rail to ground.
3. Apply the documented input from a current-limited supply; begin below the calculated full-system current and increase only after expected rails appear.
4. Measure input, module rail, reset, and boot states at labelled test points.
5. Program the diagnostic firmware and verify button/LED behavior.
6. Attach one external module at a time with power off; inspect current change and exercise only that interface.
7. Measure voltage at the compute module during the largest tested load transition.
8. Test reset, cable insertion/removal, peripheral-off, and carrier-off cases for unintended back-power.
9. Save measurements, firmware revision, photos, failures, and rework against the board serial/revision.

## Completion gate

Proceed to Mochi only when:

- no `TBD — DO NOT FABRICATE` marker or unexplained ERC/DRC exclusion remains;
- every symbol pin and footprint pad was checked against the exact part documentation;
- the power budget includes measured idle and peak current for each attached module;
- the module programs reliably and boots with each peripheral attached and absent;
- button, indicator, display connection, audio-module connection, and debug access pass independently;
- rail voltage remains within every component's recommended range during tested peaks;
- power-off tests show no unintended back-power; and
- another person can reproduce bring-up from the saved notes.

This carrier is the rehearsal for Mochi Revision A. It proves the workflow and interface discipline; it does not validate lithium charging, cellular RF, antenna performance, full-duplex acoustics, or regulatory compliance.

