# 0000 — Start here: Internet of Things (IoT) and electrical fundamentals

This chapter assumes you can write and debug software but have never built an electronic device. Its goal is not to turn you into an electrical engineer. It is to give you a small, accurate model for answering three beginner questions:

1. What is physically happening in the wires?
2. What can I safely connect and measure?
3. How does that hardware become an Internet-connected product such as Mochi?

The most important change from software work is that hardware has no perfectly isolated abstractions. Every signal needs power and a physical return path. A real wire is not electrically perfect, and a supply cannot respond infinitely quickly. Components can be damaged before a debugger attaches. Work slowly, write expected measurements down first, and test one boundary at a time.

## 1. A circuit is a closed path

**Electric charge** is a physical property carried by particles such as electrons. You do not need particle physics to build the prototype. For sustained current in the simple low-voltage circuits used here, you do need both:

- a difference in electrical potential that can push it; and
- a closed conducting path through which it can leave the source and return.

That complete path is a **circuit**. A simple battery-and-lamp circuit looks like this:

```text
 battery positive ─── switch ─── lamp ─── battery negative
        |                                           |
        └──────── energy source and return ─────────┘
```

Open the switch and the path is broken, so sustained current stops. Close the switch and current flows through the entire loop. Conventional current is described as flowing from the positive terminal toward the negative terminal; the electrons in a metal move in the opposite direction. Circuit analysis normally uses conventional current.

A single wire from a Mochi microcontroller to a button is therefore not a complete interface. The button board and microcontroller also need a shared return connection. A microphone similarly needs power, a return path, and one or more signal paths.

**Software analogy:** a closed circuit is somewhat like a request and its response route. A request with no route back cannot complete. **Where the analogy breaks:** charge is not an application message, and the return current is simultaneous physical behavior, not a later response packet.

## 2. Voltage, current, and resistance

These three quantities describe the minimum useful electrical model.

### Voltage is a difference

**Voltage**, measured in **volts** (symbol **V**), is electrical potential difference between two points. Saying “this pin is 3.3 V” is shorthand for “this pin is 3.3 V above the circuit's chosen 0 V reference.” A voltage always exists *between* two points, even when one point is left implicit.

Voltage is similar to the pressure difference that pushes water through a pipe, or to the difference between two numeric values. Neither analogy is exact. Unlike a software number, a measured voltage changes under load and contains noise. Unlike the simplified water picture, a useful electrical circuit needs a conducting return path and behaves differently when signals change quickly.

For Mochi, a pin intended for 3.3 V logic may be permanently damaged by 5 V. A **voltage domain** is a group of circuits designed to operate at a particular supply and logic voltage. Matching connector shapes or matching signal names do not make voltage domains compatible.

### Current is charge flow

**Current**, measured in **amperes** (symbol **A**), is the rate at which charge flows. Small embedded-device currents are commonly expressed in **milliamperes** (symbol **mA**):

```text
1 A = 1,000 mA
250 mA = 0.250 A
```

A load draws the current its circuit demands. A regulated 5 V supply—one designed to hold its output near 5 V—rated for up to 3 A does not normally force 3 A through Mochi; it maintains approximately 5 V while being capable of providing as much as 3 A. A supply with too little current capacity may let its voltage collapse, shut down, or overheat.

Current is loosely like throughput. **Where the analogy breaks:** electrical current is not a count of useful messages, and instantaneous surge current can matter even when a slow meter reports a low average.

### Resistance opposes current

**Resistance**, measured in **ohms** (symbol **Ω**), describes how strongly a component opposes current in the simple linear model. **Ohm's law** relates voltage difference, current, and resistance. In these equations, `V` is voltage, `I` is current, and `R` is resistance. The variable `V` and the volt unit symbol `V` look the same; a value such as `3.3 V` means 3.3 volts.

```text
V = I × R
I = V / R
R = V / I
```

Suppose a future Mochi status light is a light-emitting diode (LED). An illustrative red LED drops about 2.0 V at a few milliamperes. If a 3.3 V output drives it through a 330 Ω resistor, the resistor sees about 1.3 V:

```text
I = (3.3 V - 2.0 V) / 330 Ω
  ≈ 0.0039 A
  ≈ 3.9 mA
```

The resistor limits current to a safe order of magnitude. Connecting the LED directly across the supply removes that intentional limit and may destroy the LED or the output pin. The values above are a teaching example, not a circuit selection; an actual design must use the LED and microcontroller **datasheets**, the manufacturers' electrical specification documents.

Resistance resembles a rate limit only for simple reasoning. **Where the analogy breaks:** LEDs, batteries, transistors, speakers, and most useful electronics are not fixed resistors. Their behavior can depend on voltage, temperature, frequency, and time.

## 3. Power is a rate; energy accumulates

**Power**, measured in **watts** (symbol **W**), is the rate at which electrical energy is transferred. Here `P` is power, `V` is voltage, and `I` is current:

```text
P = V × I
```

A circuit drawing 180 mA from a 3.3 V rail uses approximately:

```text
P = 3.3 V × 0.180 A = 0.594 W
```

Power is like the current compute load of a server. **Energy** is power accumulated over time, more like a cloud bill integrated over the month. Battery energy is commonly estimated in **watt-hours** (symbol **Wh**):

```text
energy = average power × time
```

A battery's **milliampere-hour** rating (symbol **mAh**) describes charge capacity, not energy by itself. One thousand milliampere-hours equals one **ampere-hour** (symbol **Ah**). Voltage is also required. For an illustrative future Mochi battery rated 2,500 mAh at a nominal 3.7 V—an approximate label because cell voltage changes during use:

```text
2,500 mAh = 2.5 Ah
nominal energy = 3.7 V × 2.5 Ah = 9.25 Wh
```

If converters delivered 85% of that energy and Mochi averaged 2 W, the arithmetic estimate would be:

```text
usable energy ≈ 9.25 Wh × 0.85 = 7.86 Wh
runtime ≈ 7.86 Wh / 2 W = 3.93 hours
```

That is not a product forecast. Speaker volume, display brightness, Wi-Fi traffic, cellular signal strength, sleep time, temperature, battery age, cutoff voltage, and short current peaks all change the result. The purchased CoreS3 development board has a much smaller 500 mAh demonstration cell; its runtime does not select the final battery.

Two common mistakes now become visible:

- A “2 W device” describes a rate, not how long it will run.
- Adding mAh ratings across batteries of different voltages is not a valid energy comparison; convert to Wh first.

## 4. Ground is a reference and a return path

In Mochi schematics, **ground** usually means the conductor network chosen as the 0 V reference. It also carries return current back toward a supply. Ground is not a magical drain where electricity disappears, and it is not automatically the physical earth.

```text
          current to load
3.3 V rail ───────────────> sensor
regulator <─────────────── ground return
          current from load
```

If two low-voltage boards exchange a signal, they normally need a compatible shared ground so both agree what “3.3 V” means. Without it, the input voltage is undefined or current may find a damaging return through an unintended cable.

Real ground conductors have impedance: opposition that includes resistance and frequency-dependent effects. A speaker amplifier or cellular modem can cause large, fast return currents. If those currents share a poor path with a microphone, the voltage developed along that path can appear as audio noise or resets. Layout is therefore part of the circuit.

**Software analogy:** ground is partly like the agreed zero epoch used by two timestamp systems and partly like a required network return route. **Where the analogy breaks:** ground carries real current, can differ by millivolts across a board, and can become unsafe when independently powered equipment is connected incorrectly.

## 5. Series and parallel connections

Components are **in series** when the same current must pass through them one after another:

```text
3.3 V ─── resistor ─── LED ─── ground
```

For ideal resistors in series, resistances add. A 100 Ω resistor followed by a 220 Ω resistor behaves like 320 Ω. The supply voltage is divided across the parts according to their resistances.

Components are **in parallel** when they connect across the same two nodes:

```text
              ┌── display ──┐
3.3 V rail ───┤             ├── ground
              └── sensor ───┘
```

Parallel loads see the same voltage, while their currents add. If the display draws 120 mA and the sensor draws 30 mA from the same 3.3 V rail, the regulator supplies about 150 mA, plus any other loads and losses.

Mochi's subsystems are usually parallel loads on one of several regulated power rails. They are not placed in series to “share” the supply voltage. Switching one series load would disturb every other load, just as putting two services on one indivisible resource token would couple their behavior—but the physical rules, not the analogy, determine the result.

## 6. How a microcontroller sees a wire

A **microcontroller unit** (MCU) is a small computer built for controlling hardware. It combines a processor, memory, timers, and hardware interfaces on one chip. Mochi's development board uses an ESP32-S3 MCU. **Firmware** is the software stored on and executed by that device.

The simplest MCU interface is a **general-purpose input/output** (GPIO) pin.

### Digital high and low

As an output, a GPIO pin can drive a voltage interpreted as digital **low** or **high**. In a 3.3 V system, low is near 0 V and high is near 3.3 V. As an input, the pin compares its measured voltage with thresholds specified in the datasheet. The legal thresholds are ranges, not an exact “anything above 1.65 V is true” rule.

An output pin provides a logic signal, not general-purpose power. It may safely provide current to a load or accept current toward ground only within small datasheet limits. Do not drive a speaker, motor, high-power lamp, or radio supply directly from it; use a suitable power-driver circuit. Such a driver commonly contains a **transistor**, an electrically controlled switch or amplifier.

### Floating inputs

An input is deliberately high resistance so it does not significantly load the signal. If nothing drives it, it is **floating**. Nearby electric fields and leakage can then move its voltage across the high/low thresholds, producing apparently random button presses.

This resembles reading an uninitialized variable. **Where the analogy breaks:** a floating pin contains an actual analog voltage affected by touch, wiring, humidity, and radio energy; it is not merely unspecified language behavior.

A **pull-up resistor** weakly connects the input to the high rail. A **pull-down resistor** weakly connects it to ground. Either gives an otherwise undriven pin a known default while allowing a stronger source to change it.

Mochi's conversation button can use a pull-up and a switch to ground:

```text
3.3 V ─── pull-up resistor ───┬── GPIO input
                              |
                              └── button ─── ground

button released: GPIO reads high
button pressed:  GPIO reads low
```

This signal is **active-low**: the asserted or “pressed” state is represented by low. Schematics and names often mark that convention with a suffix such as `_N`, a leading slash, or a bar over the signal name. Active-low is not the same thing as “off”; it means the function is active when the electrical level is low.

Mechanical contacts bounce for a short time when they open or close, producing several edges instead of one. Firmware **debounces** the input by accepting a stable state or otherwise filtering the transitions. A pull resistor prevents floating; debounce logic solves a different problem.

At reset, many GPIO pins begin as inputs. Mochi's future microphone capture-enable signal must therefore have a physical pull resistor that holds capture inactive before firmware runs and if firmware crashes. Software should reinforce a safe hardware default, not create the only safe state.

## 7. Power rails, regulators, budgets, and decoupling

A **power rail** is a connected group of conductors intended to remain near a named voltage, such as the 3.3 V rail or 5 V rail. It distributes power to parallel loads. The name describes a target voltage, not a guarantee that every point is exactly that voltage at every instant.

A **voltage regulator** converts a varying source into a controlled output rail:

- A **buck converter** efficiently reduces voltage.
- A **boost converter** increases voltage.
- A **buck-boost converter** can operate when the input is above or below the output.
- A **low-dropout regulator** (LDO regulator) reduces voltage with low noise but dissipates the removed voltage as heat.

The **power-management integrated circuit** (PMIC) on a development board may combine regulators, battery charging, switching, measurement, and startup sequencing. It is hardware, not a substitute for a power budget.

### Budget power, not just current

Currents can be added directly only when they come from the same rail. Across different voltages, convert each load to power, include conversion loss, and then calculate source current. An illustrative peak snapshot—not a measured CoreS3 result—might be:

| Example load | Rail and peak current | Approximate peak power |
|---|---:|---:|
| Compute plus Wi-Fi | 3.3 V at 450 mA | 1.49 W |
| Display and low-power audio circuitry | 3.3 V at 150 mA | 0.50 W |
| Speaker amplifier during a loud passage | 5 V at 600 mA | 3.00 W |

Those simultaneous loads total about 4.99 W before regulator losses. The 3.3 V regulator must handle at least the loads actually connected to it, and the upstream supply must handle their converted power plus the 5 V load. Design margin and **transient response**—the ability to hold the rail steady when demand changes suddenly—are also required. Average draw predicts energy use; peak draw and pulse duration determine whether rails remain stable.

### Decoupling supplies short bursts locally

A **capacitor** stores a small amount of energy in an electric field. **Decoupling capacitors**, placed close to a component's power pins, provide local current during fast changes and give high-frequency noise a short return path. They complement the regulator; they do not increase its continuous current rating.

A capacitor is sometimes compared with a cache near a processor. That captures “small, local, fast” but not the electrical behavior. Capacitors charge and discharge according to voltage and time, are imperfect at very high frequencies, and can create startup surge current. Component datasheets specify the needed values and placement.

If Mochi reboots only when its speaker is loud or a radio transmits, suspect the power path before blaming random firmware: the battery, connector, wire, regulator, rail layout, or decoupling may allow a brief voltage drop called a **brownout**.

## 8. Sensors, actuators, MCU, and firmware form a local loop

A **sensor** converts a physical condition into an electrical or digital value. Mochi's microphones sense air-pressure changes; a battery gauge senses electrical conditions; a button senses human contact through a switch state.

An **actuator** converts an electrical command into a physical result. Mochi's speaker produces sound, its display produces light, and an indicator LED produces visible status. A display is often considered an output device rather than called an actuator, but it occupies the same “system affects the world” side of the loop.

```text
physical world
     |
     v
sensor -> electrical signal -> MCU hardware -> firmware state/decision
                                                    |
physical effect <- actuator/driver <- output signal-┘
```

Some sensors output an analog voltage. An **analog-to-digital converter** (ADC) turns that voltage into a number. Many sensors instead contain their own conversion logic and send digital messages. An actuator may accept a digital command, an analog signal, or **pulse-width modulation** (PWM), where firmware rapidly varies the fraction of time a digital output is on.

Firmware connects physical events to state machines and deadlines. For the conversation button, it configures the input, debounces transitions, changes the session state, and updates the face. For audio, dedicated hardware moves samples while firmware processes buffers on time. Unlike a web handler, firmware cannot assume an operating system will isolate every task or recover every resource automatically.

## 9. What “Internet of Things” actually means

The **Internet of Things** (IoT) is the engineering of physical devices whose useful behavior includes communication with network services. Adding Wi-Fi to a board is not the whole system. A maintainable IoT product is a loop across three locations:

```text
DEVICE                         NETWORK                    SERVICE
sense / render / enforce       move authenticated data   store / decide / coordinate
local safety and timing   <──>  Wi-Fi or cellular    <──> accounts, model, history
firmware and identity           variable latency          updates and operations
```

For Mochi, one simplified conversation loop is:

1. **Device:** the physical conversation button tells firmware to start a session. The local indicator changes promptly, but the microphone remains gated until the connection is ready.
2. **Network:** Wi-Fi carries authenticated control messages and live audio between Mochi and the project's gateway. A later version may use fourth-generation (4G) cellular networking when Wi-Fi is unavailable.
3. **Service:** the gateway authenticates the device and establishes the live model session. It keeps the provider credential away from the device and enforces product rules.
4. **Network:** user audio travels up while assistant audio and caption text travel down. Both directions may be active at once.
5. **Device:** firmware plays sound, draws the eyes and caption, keeps listening during playback, and lets the physical button stop the session.
6. **Service:** with separate user consent, durable history may synchronize through the gateway to the companion mobile app. Bluetooth Low Energy (BLE) is used nearby for secure initial provisioning, not as the live audio or history transport.

This loop explains why IoT design spans more than embedded code:

- The device must remain safe and truthful when the network is absent.
- Networks disconnect, reorder work, change latency, and expose security boundaries.
- Services need device identity, authorization, version compatibility, observability, and lifecycle management.
- Firmware and cloud releases must tolerate temporarily different versions.
- Setup, credential rotation, recovery, software updates, data deletion, and eventual device retirement are product features.

**Software analogy:** an IoT device is a distributed-system node with sensors and actuators. **Where the analogy breaks:** it controls physical energy, has tight memory and timing limits, may be unreachable for months, and cannot be rolled back after electrical damage.

## 10. A safe beginner bench

For this project, begin with assembled low-voltage development boards powered exactly as their manufacturer documents. Do not start with exposed household mains voltage, a homemade lithium-battery charger, a damaged or swollen cell, or a bare cellular radio power design.

Useful first tools are:

- A **digital multimeter** (DMM) with intact, shrouded probes for continuity (whether a low-resistance path exists), resistance, supply voltage, and carefully planned current measurements.
- A reputable, data-capable **Universal Serial Bus** (USB) Type-C (USB-C) cable and the documented 5 V source for the CoreS3.
- A USB power meter for convenient average input current and accumulated energy. It may miss fast peaks.
- A current-limited bench supply for later module work. Set its voltage and current limit before connecting the load.
- A solderless breadboard, insulated jumper wires, resistor assortment, and low-current LEDs for simple circuits away from the CoreS3.
- Safety glasses, a clear nonconductive workspace, and good lighting.
- Later, a logic analyzer for digital timing and an oscilloscope for voltage versus time. A beginner should learn their ground-connection rules before probing powered circuits.

Treat the multimeter's current mode as a different physical configuration, not merely another screen. In voltage mode, the meter goes **across** two points. In current mode, the circuit must be opened and the meter inserted **in series**. A **short circuit** is an unintended very-low-resistance path that permits excessive current. Putting a meter configured for current directly across a power supply creates such a path and may blow its fuse, damage the probes, or damage the supply.

### A repeatable measurement workflow

Use this sequence whenever adding a module or investigating a fault:

1. **Define the boundary.** Identify the exact board, connector, source, load, signal direction, voltage domain, and ground. Read the board **schematic**—the map of electrical connections—and datasheets rather than relying on wire color or connector fit.
2. **Write expectations.** For example: “With USB disconnected and power off, 3.3 V to ground should not be a hard short. With documented USB power on, the rail should measure near 3.3 V.” Include an acceptable range from the documentation when available.
3. **Inspect while unpowered.** Look for reversed connectors, loose strands, solder bridges, damaged insulation, metal debris, heat damage, or a swollen battery. Stop if anything is questionable.
4. **Check continuity only while unpowered.** Verify intended ground connections and look for obvious shorts. A brief meter beep can be caused by charging capacitors, so resistance and schematic context matter. Never use continuity or resistance mode on a powered circuit.
5. **Limit available energy.** For a bare low-voltage module, use the documented voltage and a conservative current limit that still permits startup. For the CoreS3, use its documented USB input rather than inventing a bench connection.
6. **Power one stage.** Keep fingers clear, watch the meter or supply, and be ready to disconnect. Stop immediately for unexpected current, heat, odor, smoke, swelling, or unstable voltage.
7. **Measure rails at the load.** Put the black probe on the circuit ground and the red probe on the named rail. Confirm voltage before attaching the next expensive module.
8. **Measure behavior from physical layer upward.** Supply voltage and current come first, then logic levels and bus traffic, then firmware drivers, then the application. Log setup, expected value, measured value, units, and conditions.
9. **Power down before rewiring.** Do not move jumpers around a live board unless the procedure explicitly requires it and you understand the risk.

When measuring, ask what the instrument cannot show. A DMM may average away a millisecond voltage dip. A USB meter may exclude battery-side current. An oscilloscope trace at the regulator may not show the voltage at a distant modem pin. Measurement location, **bandwidth**—how quickly the instrument can follow a changing signal—and time scale are part of every claim.

### Specific safety boundaries for Mochi

- Use the purchased CoreS3 as assembled. Do not bypass its battery charger or power-management circuitry.
- Do not puncture, bend, unwrap, solder directly to, or leave a lithium cell unattended while charging. Disconnect and isolate any cell that is hot, damaged, leaking, or swollen; follow local hazardous-waste guidance rather than placing it in household trash.
- Never assume “off” means unpowered when USB, a debugger, a modem, or another board remains attached. A signal wire can feed power backward into an inactive rail.
- Never connect a 5 V output to a 3.3 V-only input without an interface explicitly designed for it.
- De-energize before changing wiring, and remove conductive jewelry around exposed powered assemblies.
- Household mains and product battery certification are not beginner bench tasks. Use approved external supplies and seek qualified review for the final power system.

## 11. How to reason about a new connection

Before connecting any two Mochi parts, answer this interface checklist:

| Question | Why it matters |
|---|---|
| What powers each side, at what voltage? | Prevents overvoltage and unintended back-powering. |
| Where does current return? | Completes the circuit and prevents an accidental return path. |
| Which side drives each signal? | Prevents two outputs from fighting each other. |
| What voltage counts as high and low? | A shared protocol name does not guarantee compatible logic levels. |
| What happens during boot, reset, crash, and power-off? | Pins may float or change function before firmware configures them. |
| What are average and peak current? | Average predicts runtime; peaks expose weak supplies and wiring. |
| Does the load need a driver? | GPIO pins cannot directly power speakers, motors, or large lamps. |
| What evidence will prove it works? | A log and measurement are stronger than “the demo looked fine.” |

This is the hardware version of checking a software interface's type, ownership, lifecycle, failure behavior, and test contract. The difference is that an invalid hardware call can release heat or destroy its callee.

## Glossary

| Term | Plain-language meaning |
|---|---|
| Active-low | A signal convention in which a low voltage represents the asserted function. |
| Actuator | A component that turns an electrical command into a physical effect. |
| Circuit | A complete conducting path through which current can flow and return to its source. |
| Current | Rate of charge flow, measured in amperes. |
| Decoupling capacitor | A small local energy store that stabilizes a component's supply during fast changes. |
| Energy | Accumulated capacity to do work; battery energy is commonly measured in watt-hours. |
| Firmware | Software stored on and run by an embedded device. |
| Floating | A signal with no source holding it at a defined voltage. |
| GPIO | General-purpose input/output; a configurable digital pin on a microcontroller. |
| Ground | The chosen 0 V reference and a conductor for return current; not automatically earth. |
| IoT | Internet of Things; physical devices whose behavior includes network-service communication. |
| MCU | Microcontroller unit; a compact computer designed to monitor and control hardware. |
| Parallel | Connected across the same two nodes, so loads share voltage and their currents add. |
| Power | Rate of energy transfer, measured in watts. |
| Power rail | Conductors distributing a regulated target voltage to parallel loads. |
| Pull resistor | A weak connection that gives an otherwise undriven digital input a defined default. |
| Regulator | A circuit that converts a source into a controlled voltage rail. |
| Resistance | Opposition to current in the basic model, measured in ohms. |
| Sensor | A component that turns a physical condition into an electrical or digital value. |
| Series | Connected one after another so the same current passes through each component. |
| Short circuit | An unintended very-low-resistance path that can allow excessive current. |
| Voltage | Electrical potential difference between two points, measured in volts. |
| Watt-hour | A unit of energy equal to one watt used for one hour. |

## Self-check

Try these without looking back, then compare with the answers.

1. Why will one signal wire between two separately powered boards often be insufficient?
2. A load draws 200 mA from 5 V. What is its power?
3. What is the difference between a 2 W load and a 2 Wh energy budget?
4. Two loads on the same 3.3 V rail draw 80 mA and 120 mA. Are they normally connected in series or parallel, and approximately how much total current does the rail provide?
5. Why can an unconnected GPIO input appear to press a button randomly?
6. With a pull-up resistor and a button to ground, what does the input read when the button is released? What does “active-low” mean?
7. Why might Mochi reboot during loud audio even when its average current looks acceptable?
8. Where is a multimeter placed for voltage measurement? Why must current mode be handled differently?
9. Name the three locations in the IoT loop and one responsibility owned by each.
10. Why is a successful Wi-Fi demo not proof that the final cellular, battery, and cloud system is ready?

### Answers

1. A signal voltage needs a shared reference and a closed current-return path; otherwise the receiver cannot reliably interpret it and current may take an unintended route.
2. `5 V × 0.200 A = 1 W`.
3. Watts measure the instantaneous rate of energy transfer; watt-hours measure accumulated energy. A 2 W load consumes 2 Wh in one hour.
4. Parallel, so both receive 3.3 V. The rail supplies approximately `80 mA + 120 mA = 200 mA`.
5. A high-resistance floating input has no source fixing its voltage, so leakage and coupled noise can cross the logic thresholds. A pull-up or pull-down provides a default.
6. Released reads high; pressed reads low. Active-low means the low electrical level represents the asserted logical function.
7. A fast speaker-current transient can cause a rail brownout through a weak battery, regulator, connector, wire, layout, or decoupling network even though a slow meter shows a safe average.
8. Voltage is measured across two points. Current requires opening the circuit and inserting the meter in series; placing a current-configured meter across a supply creates a short.
9. Device: sensing, rendering, local safety, or timing. Network: carrying authenticated data despite variable connectivity. Service: identity, coordination, model access, history, or updates.
10. Cellular has different radio, carrier, antenna, latency, and peak-power behavior; a final battery has its own energy and safety constraints; cloud operation adds identity, security, lifecycle, and failure cases.

If those answers make sense, choose the next path:

- To understand the complete product, continue to [system architecture](0001_system_architecture.md).
- To design a real schematic and PCB, continue to [core circuits for PCB design](CORE_CIRCUITS_FOR_PCB_DESIGN.md), then follow the [PCB design path](PCB_DESIGN_PATH.md).

When a later chapter uses a term that still feels abstract, return here and identify the voltage, current path, state owner, and measurement that would make it concrete.
