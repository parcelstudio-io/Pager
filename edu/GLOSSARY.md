# Plain-language glossary

Use this as a lookup table, not as a substitute for the lessons. Each primer should still define a term when it first appears.

## Electricity and components

| Term | Plain-language meaning |
|---|---|
| Circuit | A complete path through which electric current can leave a source, pass through components, and return to the source. |
| Node | Conductors intentionally connected together and treated as sharing one voltage in the basic circuit model. |
| Branch | One current path between two circuit nodes. |
| Loop | A closed circuit path that returns to its source. |
| Kirchhoff's current law (KCL) | Conservation of charge stated for a node: total current entering equals total current leaving. |
| Kirchhoff's voltage law (KVL) | Around a closed loop, voltage rises and drops sum to zero. |
| Voltage (V) | The electrical potential difference between two points. Software analogy: the pressure available to cause work, although the analogy is imperfect. |
| Current (A) | The rate of electric charge flow. One ampere is a large amount for a small logic circuit; values are often written in milliamperes (`mA`). |
| Resistance (Ω) | Opposition to current flow, measured in ohms. For simple direct-current cases, `V = I × R`. |
| Power (W) | The rate at which energy is used or delivered. For a simple direct-current load, `P = V × I`. |
| Energy (Wh) | Power accumulated over time. Battery capacity is often compared in watt-hours, not watts. |
| Ground (GND) | The circuit's chosen zero-volt reference and a current return path. It is not a place where electricity disappears. |
| Rail | A named power network such as `5V`, `3V3`, or `GND` shared by several components. |
| Battery | A chemical energy source that produces electrical voltage. Its voltage changes with chemistry, charge, load, and temperature. |
| Regulator | A circuit that converts a varying input voltage into a controlled output voltage. |
| Capacitor | A component that temporarily stores electric charge. Near a chip it can supply short current bursts and reduce power-rail noise. |
| Decoupling capacitor | A small capacitor placed close to a chip's power pin to handle fast local current changes. |
| Resistor | A component with a chosen resistance, used to limit current, divide voltage, bias a signal, or set timing/gain. |
| Voltage divider | Two or more series impedances used to create a fraction of an input voltage; a connected load can change that fraction. |
| RC time constant | The product of resistance and capacitance, `τ = R × C`, describing the characteristic charging or discharging time of a simple resistor-capacitor network. |
| MOSFET | Metal-oxide-semiconductor field-effect transistor; commonly used as a voltage-controlled electronic switch so a logic signal can control a larger load current. |
| Dropout voltage | Minimum input-to-output headroom a regulator needs to maintain its specified output under stated conditions. |
| Tolerance | The permitted difference between a component's nominal value and its actual value. |
| Thermal resistance | A measure of temperature rise per watt along a heat-flow path, used with power dissipation to estimate component temperature. |
| ESD | Electrostatic discharge: a fast high-voltage transient caused by accumulated charge, often entering through user-accessible conductors. |
| Inductance | A property of a current path that resists rapid changes in current. It can turn a fast current change into an unwanted voltage disturbance. |
| Electromagnetic coupling | Unwanted energy transferred from one conductor or circuit to another through changing electric or magnetic fields. Distance, geometry, current, and switching speed affect it. |
| LED | Light-emitting diode. It emits light when current flows in the allowed direction and normally needs current limiting. |
| Diode | A component that strongly favors current flow in one direction. Real diodes have a voltage drop and limits. |
| Short circuit | An unintended very-low-resistance path that can cause excessive current, heat, damage, or supply shutdown. |
| Open circuit | A broken or intentionally disconnected current path. Ideally, no current flows through it. |
| Continuity test | A multimeter check for a low-resistance electrical connection between two points. |
| Multimeter | A handheld tool for measuring voltage, resistance, continuity, and sometimes current. |
| Oscilloscope | A tool that plots voltage over time, revealing pulses, noise, clocks, and short power dips that a multimeter may miss. |

## Digital hardware and embedded software

| Term | Plain-language meaning |
|---|---|
| Logic level | A voltage range interpreted as digital `0` or `1`. A 5 V output is not automatically safe for a 3.3 V input. |
| GPIO | General-purpose input/output: a microcontroller pin software can read or drive, within its electrical limits. |
| Input | A pin whose voltage is observed by a circuit. An input should not be driven beyond its allowed range. |
| Output | A pin actively driven high or low by a circuit. Two disagreeing outputs should not be connected directly. |
| High impedance (high-Z) | A state that draws very little current and behaves approximately like a disconnected input. |
| Floating input | An input with no reliable high or low source. It can change from tiny noise and produce random-looking software values. |
| Pull-up / pull-down | A resistor that gives an otherwise undriven input a safe default high or low value. |
| Active-low | A signal whose asserted/true state is low voltage. A name such as `RESET_N` often uses `_N` to indicate this. |
| Open-drain | An output that can pull a line low but relies on a pull-up resistor for high. Multiple devices can safely share some open-drain buses. |
| Microcontroller (MCU) | A small computer chip containing a processor, memory, timers, and hardware peripherals for controlling a device. |
| Firmware | Software built for and stored on an embedded device. It interacts with hardware registers and timing constraints. |
| Bootloader | A small program that starts before the main firmware and can verify, select, or install an application image. |
| Peripheral | A hardware block or attached device that performs a specialized job, such as audio, timers, USB, or a sensor. |
| Register | A small hardware-controlled value used to configure or observe a peripheral. It is closer to a device control field than ordinary application memory. |
| Interrupt | A hardware event that asks the processor to run a short handler soon, instead of waiting for polling. |
| DMA | Direct memory access: hardware that moves data between a peripheral and memory without making the CPU copy every item. |
| Clock | A repeating electrical timing signal. Many digital interfaces agree on when bits are valid by following a clock. |
| Bus | A set of wires and protocol rules used to move control or data between components. |
| I²C | Inter-integrated circuit: a shared, addressed, two-wire control bus normally used for sensors and configuration registers. |
| SPI | Serial peripheral interface: a clocked bus with separate device-select signals, often used for displays and flash memory. |
| I²S | Inter-IC sound: a clocked stream for digital audio samples. It is unrelated to I²C despite the similar name. |
| UART | Universal asynchronous receiver-transmitter: a byte stream using transmit and receive wires with an agreed baud rate. |
| USB | Universal Serial Bus: a host/device protocol family that carries data and often power; connector shape alone does not establish roles or capabilities. |
| Module | A chip plus supporting parts and often a connector or antenna, packaged to make prototyping easier. |
| Datasheet | The component manufacturer's contract for electrical limits, pin behavior, timing, package, and operating conditions. |

## Printed circuit boards and manufacturing

| Term | Plain-language meaning |
|---|---|
| PCB | Printed circuit board: patterned copper and insulating material that mechanically holds and electrically connects components. |
| Schematic | A logical diagram of components and named electrical connections. It expresses intent, not physical placement. |
| Net | All PCB pins and copper intended to be electrically connected, similar to one named signal in a schematic. |
| Footprint | The physical copper-pad and outline pattern for mounting one component package. |
| Layout | The physical placement of footprints and routing of copper on a PCB. |
| Stack-up | The ordered construction of copper and insulating layers in a PCB, including their thicknesses and materials. |
| Net class | A group of nets assigned common routing constraints such as trace width, clearance, and via size. |
| Trace | A narrow copper path carrying a signal or power. |
| Plane | A broad copper area, often used for ground or power to reduce impedance and provide return paths. |
| Via | A plated hole that connects copper between PCB layers. |
| Return path | The route current takes back to its source. High-frequency signal current usually returns close to the outgoing trace. |
| BOM | Bill of materials: the exact component list, quantities, manufacturer part numbers, and approved substitutions. |
| DFM | Design for manufacture: checking whether the bare PCB can be fabricated reliably. |
| DFA | Design for assembly: checking whether parts can be placed, soldered, inspected, and reworked reliably. |
| DFT | Design for test: providing safe ways to measure, program, and diagnose an assembled board. |
| Bring-up | The first controlled power-on and subsystem-by-subsystem validation of a new board. |
| ERC | Electrical rules check: automated schematic checking against declared pin and connection rules; it does not prove the circuit is functional. |
| DRC | Design rules check: automated PCB geometry checking against configured manufacturing constraints; it does not prove electrical performance. |
| Gerber | A common set of manufacturing plot files describing PCB artwork layers; drill data is normally exported separately. |
| CPL | Component placement list: assembly coordinates, side, and rotation for placed components; its exact format depends on the assembler. |
| EVT / DVT / PVT | Engineering, design, and production validation stages. They ask respectively whether the engineering works, the product-like design survives its requirements, and manufacturing can build it repeatedly. |

## IoT and networking

| Term | Plain-language meaning |
|---|---|
| IoT | Internet of Things: physical devices that sense or act locally and exchange selected data or commands over a network. The device still needs safe local behavior when the network fails. |
| Sensor | A component that converts a physical property, such as sound or temperature, into an electrical or digital value. |
| Actuator | A component that affects the physical world, such as a speaker, motor, light, or power switch. |
| Provisioning | Supplying the initial configuration or credentials a device needs to operate. |
| Wi-Fi | A local wireless network technology that normally connects a device through an access point to an IP network. |
| BLE | Bluetooth Low Energy: a nearby radio protocol for small exchanges such as setup, not Mochi's live audio path. |
| GATT | Generic Attribute Profile: BLE's common model of services and readable/writable/notifiable characteristics. |
| Modem | Hardware and firmware that convert host data into signals for a communication network such as LTE cellular. |
| SIM | Subscriber identity module: carrier-issued credentials used by a cellular modem to authenticate to a mobile network. |
| APN | Access point name: a carrier setting that selects the packet-data service a cellular modem should use. |
| IP address | An address used to route packets across an Internet Protocol network. It may be private, public, temporary, IPv4, or IPv6. |
| NAT | Network address translation: mapping between address spaces, commonly causing many devices to share a public address. |
| DNS | Domain Name System: translates a hostname such as `api.example.com` into network addresses. |
| TLS | Transport Layer Security: authenticates a network peer and encrypts/integrity-protects data in transit. |
| Nonce | A fresh value intended for one protocol attempt. Including it in authenticated messages helps prevent an old valid message from being replayed as if it were new. |
| Gateway | Mochi's backend boundary that authenticates devices, holds provider credentials, applies policy, and translates protocols. |
| Authentication | Proving an identity. |
| Authorization | Deciding what an authenticated identity may do. |
| Latency | Time taken for an operation or data to travel through a system. |
| Jitter | Variation in packet arrival timing. |
| Packet loss | Data packets that never arrive and may need recovery, concealment, or cancellation. |

## Realtime voice and data

| Term | Plain-language meaning |
|---|---|
| Sample | One numeric measurement of an audio waveform at one instant. |
| Sample rate | Number of audio samples per second, such as 16,000 samples/s (`16 kHz`). |
| PCM | Pulse-code modulation: a direct sequence of numeric audio samples. |
| Codec | Encoder/decoder that changes an audio representation, commonly to compress it. |
| Buffer | Temporary storage that absorbs timing differences between a producer and consumer. |
| Full duplex | Input and output operate concurrently; Mochi can listen while speaking. |
| AEC | Acoustic echo cancellation: estimates and removes the device's own speaker signal from microphone input. |
| VAD | Voice activity detection: estimates whether an audio region contains speech. |
| Barge-in | The complete behavior that lets user speech interrupt active assistant playback and cancel the matching response. |
| Working context | Recent session content used to keep the current conversation coherent. |
| User memory | Opt-in structured facts or preferences retained across sessions. |
| Conversation history | Opt-in, user-visible durable records of past conversations. |
| Cursor | An opaque synchronization position the client returns to request later records. |
| Tombstone | A content-free record that tells replicas an item was deleted. |
| Idempotency key | A unique request identifier that makes retries have one logical effect. |
