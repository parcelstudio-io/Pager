# Core circuits for PCB design

This chapter turns the quantities in lesson `0000` into a small design toolkit. Treat a schematic as executable architecture with physical types: each wire has voltage, current, direction, timing, and ownership constraints.

All examples use low-voltage direct current. Numerical values are illustrative until verified against the exact component datasheet and measurement.

## 1. Nodes, branches, and loops

A **node** is a set of connected conductors that ideally share one voltage. A **branch** is one current path between nodes. A **loop** is a closed path that returns to its source.

Kirchhoff's current law (KCL) says current into a node equals current out. It is conservation of charge. If a 3.3 V regulator supplies a 20 mA sensor, 80 mA processor, and 10 mA LED in parallel, it supplies approximately `20 + 80 + 10 = 110 mA` before losses and transients.

Kirchhoff's voltage law (KVL) says voltage rises and drops around a closed loop sum to zero. For a 3.3 V supply, an LED dropping about 2.0 V, and a resistor dropping the rest:

```text
+3.3 V - 2.0 V - 1.3 V = 0 V
```

KCL finds missing current. KVL finds missing voltage. Both force you to draw the complete path rather than reason from a signal name alone.

## 2. A resistor limits LED current

An LED is polarized: its anode and cathode must be oriented correctly. Its forward voltage is not a fixed universal number, so use the exact LED datasheet.

For an illustrative 3.3 V rail, 2.0 V red LED, and desired 1.3 mA:

```text
R = (3.3 V - 2.0 V) / 0.0013 A ≈ 1000 Ω
resistor power = I²R ≈ 0.0017 W
```

A standard 1 kΩ resistor with a conventional 0.125 W or 0.25 W rating has ample power margin here. Repeat the calculation for minimum and maximum supply voltage and the LED's forward-voltage range. Never connect an ordinary LED directly across a supply.

## 3. Pull resistors define idle state

A digital input is high impedance: it observes voltage while drawing very little current. That makes an unconnected input vulnerable to leakage and coupled noise.

A common button circuit uses a 10 kΩ pull-up to 3.3 V and a normally open button to ground:

```text
released: input = 3.3 V, approximately no switch current
pressed:  input = 0 V, current through pull-up = 3.3 V / 10 kΩ = 0.33 mA
```

The button is **active-low** because pressing it produces logic low. Firmware can debounce the mechanical contacts, but the resistor supplies a safe state during reset before firmware runs.

## 4. Voltage dividers and loading

Two series resistors can produce a fraction of an input voltage:

```text
Vout = Vin × Rbottom / (Rtop + Rbottom)
```

For `Vin = 5 V`, `Rtop = 10 kΩ`, and `Rbottom = 20 kΩ`, the ideal unloaded output is about 3.33 V.

The word **unloaded** matters. A connected input draws some current and behaves like another resistance in parallel with the bottom resistor, changing the result. Dividers are suitable for measurement or bias when the receiving input impedance and transient behavior are known. They are generally not power supplies and are not automatically safe bidirectional logic-level translators.

## 5. Capacitors make circuits time-dependent

A capacitor stores charge. With a resistor it forms a resistance-capacitance (RC) network whose **time constant** is:

```text
τ = R × C
```

After one time constant a charging capacitor reaches about 63% of its final voltage; after roughly five it is near its final value. A 10 kΩ resistor and 100 nF capacitor have `τ = 1 ms`.

This explains why reset circuits, button filters, and power rails do not change instantaneously. It does not mean any random resistor-capacitor pair is a valid reset or debounce design: input thresholds, leakage, tolerances, startup ramps, and repeated presses matter.

A decoupling capacitor is a special use of local charge storage. Place it close to a chip's supply and ground pins so the fast current loop is physically small. Use the values and placement shown in the component's reference design.

## 6. Diodes protect direction and inductive loads

A diode conducts much more readily in one direction. Its schematic symbol, PCB footprint, and physical package must agree on polarity.

An inductive load such as a relay coil or motor resists a sudden current change. Switching it off can generate a damaging voltage. A **flyback diode** across a direct-current inductive load gives that current a controlled decay path. Its orientation, voltage rating, current rating, and effect on release time must be designed; copying a symbol without understanding the loop is not protection.

Protection diodes used for electrostatic discharge (ESD) are different parts selected for fast transients, capacitance, clamping behavior, and placement near the connector. Follow reference circuits for USB and exposed connectors.

## 7. A MOSFET lets a small signal control a larger load

A metal-oxide-semiconductor field-effect transistor (MOSFET) can act as an electronic switch. In a common low-side arrangement:

- the load connects to its positive supply;
- the load's other side connects to the MOSFET drain;
- the MOSFET source connects to ground; and
- a GPIO controls the gate through the documented network.

The GPIO controls the switch; it does not provide the load current. Choose a MOSFET whose on-resistance is specified at the actual gate voltage, not merely one whose threshold voltage looks low. Threshold means “barely begins conducting under a test condition,” not “fully on.” Check drain voltage, continuous and pulsed current, heat, startup state, and whether the load needs a flyback path.

For high-side switching, bidirectional power, audio, or protected load control, use a suitable load-switch or power-path integrated circuit rather than assuming the low-side pattern transfers unchanged.

## 8. Regulators trade voltage, current, efficiency, and heat

A linear regulator discards excess voltage as heat. Approximate dissipation is:

```text
Pheat = (Vin - Vout) × Iload
```

Converting 5 V to 3.3 V at 300 mA dissipates about `0.51 W`. Whether that is safe depends on the package, copper area, ambient temperature, and thermal resistance.

A switching regulator transfers energy with an inductor and switching elements and is usually more efficient for large voltage differences or current, but its layout and component selection are more demanding.

**Dropout voltage** is the minimum input-to-output headroom a regulator needs to maintain regulation under stated conditions. A “3.3 V regulator” cannot necessarily produce 3.3 V from a battery that has fallen to 3.4 V.

For either type, verify:

- input and output voltage range;
- peak load plus margin;
- dropout or duty-cycle limits;
- efficiency over the real load range;
- required input/output capacitor type, value, and placement;
- enable-pin default and shutdown leakage;
- thermal limits; and
- behavior during startup, short circuit, power-off, and reverse voltage.

## 9. Logic compatibility is a range comparison

Do not compare only labels such as “3.3 V logic.” Compare the driver's guaranteed output-low/output-high voltages with the receiver's guaranteed input-low/input-high thresholds under the stated supply and current conditions.

Also check:

- whether either side is open-drain and needs pull-ups;
- whether a powered device can drive an unpowered device;
- whether the signal is unidirectional or bidirectional;
- startup and reset states;
- maximum pin voltage; and
- speed and edge-rate requirements.

A resistor divider may work for one slow unidirectional signal under known loading. I²C, USB, SPI clocks, and bidirectional signals need interface-appropriate solutions.

## 10. Tolerance means design a range

A 10 kΩ resistor marked ±5% may be 9.5–10.5 kΩ. Supply voltage, LED forward voltage, capacitor value, regulator output, temperature, and component aging also vary.

Do not calculate only a typical case. For each limit:

1. identify variables that can increase stress or reduce margin;
2. use datasheet minimum and maximum values where available;
3. calculate credible worst cases;
4. compare them with recommended operating conditions; and
5. measure representative boards under expected modes.

Worst-case arithmetic is the hardware equivalent of testing boundary values, except several inputs may reach unfavorable values together.

## 11. Reading a datasheet in the right order

For every selected part, inspect:

1. **Part-number table:** confirms the exact variant, voltage, temperature grade, and package.
2. **Pin description:** defines direction, power domain, internal pulls, and special startup behavior.
3. **Absolute maximum ratings:** damage boundaries, not design targets.
4. **Recommended operating conditions:** the range where normal behavior is promised.
5. **Electrical characteristics:** guaranteed thresholds, currents, accuracy, leakage, timing, and test conditions.
6. **Typical application and reference design:** required external parts and layout intent.
7. **Power-up/down sequence:** conditions that avoid undefined behavior or back-powering.
8. **Package drawing:** body dimensions, pin numbering, exposed pads, and orientation mark.
9. **Recommended land pattern:** starting dimensions for the footprint; reconcile these with assembly capabilities.

Create a one-row design record for each critical component:

| Exact manufacturer part number | Supply | Peak current | Logic | Package | Datasheet revision/link | Verified by/date |
|---|---:|---:|---|---|---|---|
| Fill this before fabrication | | | | | | |

## 12. Copper is not an ideal wire

A PCB trace has resistance. Current through it causes voltage drop and heat:

```text
Vdrop = I × Rtrace
Pheat = I² × Rtrace
```

Trace resistance depends on copper thickness, length, width, and temperature. Required width also depends on permitted temperature rise and the fabricator's process. Use an accepted calculator and the chosen fabricator's constraints, then measure voltage at the load during peak current. A wide outgoing power trace with a poor return path is still a poor circuit.

Fast digital signals add capacitance and inductance effects, so geometry and return continuity matter even when average current is tiny. Start from module and chip layout guidance; do not invent USB, antenna, or switching-regulator layout from appearance.

## 13. Connector failures are system failures

For each connector document pin 1, mating orientation, polarity, voltage, maximum current, signal direction, hot-plug behavior, cable construction, and what happens when either side is off.

Check for:

- a reversed or one-pin-shifted insertion;
- exposed power pins touching ground;
- back-power through signal pins;
- ESD from a user-accessible cable;
- insufficient current rating;
- missing strain relief; and
- silkscreen labels hidden after assembly.

Connectors cross ownership boundaries, so review them like public APIs with an adversarial client.

## Readiness self-check

Before beginning the first KiCad lab, explain and calculate:

1. Where does current flow when the LED is on?
2. Why does KCL make parallel load currents add at the regulator?
3. Why does a button input need a hardware default before firmware starts?
4. Why does a voltage divider's result change when loaded?
5. What does a 1 ms RC time constant say—and not say—about a digital input?
6. Why is MOSFET threshold voltage not proof that a 3.3 V GPIO fully turns it on?
7. What happens thermally when a linear regulator drops 5 V to 3.3 V at 300 mA?
8. Why is an absolute maximum rating not a normal operating target?
9. Which physical documents prove that a symbol pin and footprint pad represent the same lead?
10. Why must power integrity be measured at the load, not only at the bench supply?

If any answer is vague, repeat that section with an actual datasheet and a hand-drawn current loop. Then proceed to [Lab 1](labs/0001_led_button_board.md).

