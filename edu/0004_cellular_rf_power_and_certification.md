# 0004 — Cellular fundamentals: from a subscriber identity module (SIM) to an Internet connection

Start with [0000 — Internet of Things and electrical fundamentals](0000_start_here_iot_and_electrical_fundamentals.md), especially the sections on power rails, regulators, peak current, ground, and safe measurement. Read [0002 — Modules, buses, and real-time audio](0002_modules_buses_and_audio.md) for Universal Serial Bus, Universal Asynchronous Receiver/Transmitter, audio data rates, flow control, codecs, and echo cancellation. Read [0003 — Printed circuit board fundamentals](0003_pcb_fundamentals_and_manufacturing.md) before designing a modem carrier or antenna connection.

This chapter explains why adding “4G” is more than installing a network library. It does not ask you to design radio-frequency circuitry. Mochi's safe learning path uses evaluated modules and their approved antennas first.

## Prerequisites

You should be able to:

- distinguish voltage, current, power, and energy;
- explain why a short current peak can cause a brownout even when average current looks acceptable;
- recognize a regulator, decoupling capacitor, PCB trace, and ground return path; and
- reason about an outbound Internet connection using an Internet Protocol address, Domain Name System lookup, and encrypted connection.

The networking terms are reviewed below, so deep network administration experience is not required.

## Learning goals

By the end, you should be able to:

1. distinguish the host processor, cellular modem, subscriber identity module, mobile carrier, plan, and antenna;
2. describe the sequence from modem boot to an Internet Protocol path;
3. explain an access point name and why carrier-grade network address translation affects reconnect behavior;
4. select a modem by exact region, radio bands, carrier acceptance, and measured behavior—not by a “global 4G” label;
5. explain why antenna placement and burst power are system properties;
6. measure attach time, network quality, rail droop, peak current, and temperature; and
7. explain why a pre-certified modem module does not certify the complete Mochi product.

## 1. The five parts hidden by the word “cellular”

A cellular connection involves several independent things:

| Part | Plain-language job | Software-engineering analogy | Where the analogy stops working |
|---|---|---|---|
| **Host** | Runs Mochi firmware and the conversation application | application computer | It must also sequence physical power and meet real-time deadlines |
| **Cellular modem** | Implements the cellular protocol and radio link | network-interface controller plus its firmware | It transmits physical radio energy and can draw large current bursts |
| **Subscriber identity module (SIM)** | Holds credentials that identify a carrier subscription | hardware-backed client credential | It does not provide coverage, radio-band support, or plan permission by itself |
| **Carrier** | Operates the mobile network and authenticates the subscription | Internet service provider plus identity authority | It also controls radio access, device acceptance, roaming, and plan policy |
| **Antenna** | Converts electrical radio-frequency energy into electromagnetic waves and back | no close software equivalent | Its behavior changes with size, placement, enclosure, and the user's hand |

The word **modem** originally meant *modulator-demodulator*. A modern cellular modem module contains much more: a radio transceiver, protocol processor, firmware, memory, power-management support, and host interfaces.

Do not confuse the mobile **carrier** with Mochi's printed circuit board (PCB) **carrier board**. The mobile carrier is the network operator. The PCB carrier is the board that physically connects replaceable hardware modules.

The system path is:

```text
Mochi application
       |
       v
ESP32-S3 host <-- control/data interface --> cellular modem <-- feed --> antenna
                                                     |
                                                     v
                                              nearby cell site
                                                     |
                                                     v
                                   carrier core network -> Internet -> Mochi gateway
```

Every arrow is a separate contract. A correct SIM cannot repair an unsupported radio band. A good antenna cannot activate an unpaid plan. A fast modem cannot repair an under-sized power rail.

## 2. From power-on to the Internet, one step at a time

An operating system may show a cellular connection as one network interface. Underneath, the modem performs a state machine:

```text
power stable
    -> modem boots
    -> SIM is read and accepted
    -> modem scans supported radio bands
    -> suitable carrier cell is found
    -> subscription authenticates and modem attaches
    -> data profile is activated using an access point name
    -> modem receives an Internet Protocol configuration
    -> Mochi resolves a gateway name and opens an encrypted session
```

Understanding each state turns “cellular is broken” into a debuggable report.

### The SIM proves subscription identity

A **subscriber identity module (SIM)** is the removable card familiar from phones. An **embedded SIM (eSIM)** stores the equivalent subscription identity in a soldered secure component and may support controlled profile downloads. eSIM is not simply a physical SIM with no tray; its provisioning ecosystem, modem support, and carrier contracts are additional product work.

For Mochi's first cellular mule, use one activated physical SIM whose personal identification number (PIN) lock is disabled. Record the carrier and plan. Consumer eSIM support is deferred.

The SIM does **not** determine all of the following:

- which radio frequencies the modem hardware can use;
- whether the carrier permits that exact modem or device class;
- whether coverage exists at the test location;
- how much data or what traffic the plan permits; or
- whether the host driver works.

### The carrier must accept both subscription and device

The **carrier**, also called a mobile network operator, runs the radio access and core network. It may check the modem's **International Mobile Equipment Identity (IMEI)**, a device identifier, as well as the SIM subscription. A plan can be active while an unapproved device is rejected or restricted.

Before buying a modem for a product, ask the carrier or IoT connectivity provider:

1. Is this exact regional modem stock-keeping unit (SKU) accepted?
2. Which required bands are deployed in the launch region?
3. Does the plan allow sustained bidirectional Internet data for real-time audio?
4. What are the data allowance, throttling, roaming, and inactivity policies?
5. Which data profile and Internet Protocol version are required?

“Unlocked” and “global” are marketing descriptions, not evidence for these answers.

### The access point name (APN) selects a carrier data service

An **access point name (APN)** tells the carrier which packet-data service the subscription wants. Depending on the provider, that may select public Internet access, a private company network, an Internet Protocol version, or a billing/policy profile.

An APN is configuration, not a radio band and not a substitute for SIM activation. Some providers also require a username and password; many do not.

For Mochi, public carrier-preset metadata can ship with the app or synchronize from the cloud. A custom APN and any accompanying credentials are sensitive local settings. The companion app sends them directly to the nearby pager over an encrypted Bluetooth Low Energy setup session; they do not pass through or persist in Mochi's cloud. See [architectural decision record 0007 — Companion app and cloud history sync](../docs/decisions/0007_use_companion_app_and_cloud_history_sync.md).

### Internet Protocol (IP) and network address translation (NAT) create an outbound path

Internet Protocol provides addresses and routes packets between networks. The modem or carrier connection receives an IP configuration after the data profile is active.

Mobile devices are often placed behind **carrier-grade network address translation (CGNAT)**. Network address translation maps many private device addresses onto fewer public addresses:

```text
Mochi private address
       |
       v
carrier NAT mapping -> shared public address -> Internet service
```

This usually allows Mochi to initiate an outbound encrypted connection. It usually does not let an arbitrary Internet host open a new inbound connection directly to Mochi. That is acceptable: Mochi should authenticate outward to its gateway, not expose a public listening port.

The mapping may expire while idle or disappear during a cell change. The device must therefore detect lost reachability and create a fresh authenticated session. A modem reporting “attached” proves radio registration, not that Domain Name System (DNS), Transport Layer Security (TLS), and the application session still work.

## 3. How host software talks to a modem

There are two logical paths:

```text
control path: host asks for status, signal, reset, APN, attach, and power state
data path:    application packets move between host and carrier network
```

Many modems accept **AT commands**, text commands whose `AT` prefix historically means “attention.” For example, commands can query SIM state, registration, signal measurements, and firmware version. Treat AT-command parsing as a stateful device protocol, not a human terminal that firmware can casually scrape.

Common data paths include:

- **USB networking:** the modem appears as one or more Universal Serial Bus devices, including a network interface and control ports;
- **Point-to-Point Protocol (PPP) over a Universal Asynchronous Receiver/Transmitter (UART):** serial bytes carry framed network packets; or
- **modem-managed sockets:** host commands ask the modem firmware to open and service network connections.

The names do not prove that the path is suitable. Confirm who is USB host and device, available drivers, memory usage, sustained throughput, flow control, reset behavior, and recovery after disconnect.

### Why UART speed needs arithmetic

A **baud rate** is the symbol rate of a serial link; in common simple UART configurations it is close to bits per second, with framing overhead reducing useful bytes. A link configured for 115,200 baud cannot carry a raw 24 kHz, mono, 16-bit audio stream that requires:

```text
24,000 samples/second × 16 bits/sample = 384,000 bits/second
```

That is one audio direction before serial and network overhead. Compressed voice can be much smaller. Mochi's current candidate is Opus around 20–24 kbit/s for a 16 kHz mono voice stream, but the exact encoder cost, UART rate, hardware flow control, packet overhead, audio echo cancellation, and simultaneous uplink/downlink must be measured on the ESP32-S3.

The software lesson is familiar: compare payload rate with the whole transport budget. The hardware addition is that buffering, processor load, and missed real-time audio deadlines can fail even when the long-term average appears below link capacity.

## 4. Radio bands: compatibility is a set intersection

**Radio frequency (RF)** describes alternating electrical and electromagnetic behavior used for wireless communication. Frequency is how many cycles occur per second, measured in hertz. A radio **band** is a named range of frequencies allocated for a purpose.

Fourth-generation cellular systems commonly use **Long-Term Evolution (LTE)**. “LTE” does not mean one worldwide frequency. Each LTE band has defined uplink and downlink ranges, and carriers deploy different subsets by region.

Compatibility is approximately an intersection:

```text
modem SKU bands
       ∩ carrier-deployed bands
       ∩ bands permitted in the country
       ∩ antenna's usable frequencies
       ∩ plan/device acceptance
       = possible service
```

A modem can attach on one supported band yet perform poorly because the best local coverage band is missing. Always check the exact regional stock-keeping unit; two modules with similar product names can support different bands.

Lower-frequency signals often travel farther and penetrate buildings better, while higher-frequency bands can offer more capacity but often experience greater path loss. This is a useful tendency, not a coverage guarantee. Tower spacing, terrain, walls, interference, carrier configuration, and antenna design all matter.

## 5. LTE categories: choose for the workload, not the largest number

An LTE **category**, commonly shortened to `Cat`, describes capability limits and radio features. It is not a promise of real-world throughput or latency.

| Technology | Beginner mental model | Mochi position |
|---|---|---|
| Long-Term Evolution for Machines (LTE-M), also called Category M1 | Low-power wide-area cellular for small Internet of Things (IoT) traffic; bandwidth and latency are more constrained | Good for telemetry; real-time voice must be proven on the exact carrier and plan |
| LTE Cat 1bis | Moderate LTE data with one receive antenna, enabling a smaller design | Leading production-size direction for North America, subject to current regional/carrier/supply evidence |
| LTE Cat 4 | Mature, faster LTE; commonly uses main and receive-diversity antennas | Convenient evaluation class used by the SIM7600G-H bench mule |
| Conventional 5G broadband | Much higher throughput, more antennas, host bandwidth, power, and heat | Deferred because compressed conversation audio does not need it |
| 5G Reduced Capability (5G RedCap) | A smaller 5G device class intended partly for IoT | Deferred until ecosystem, supply, certification, and measured need justify it |

Mochi sends compressed speech, response audio, captions, control events, and occasional tool data. Its harder network requirements are latency distribution, jitter, loss, reconnect behavior, coverage, and cost—not headline peak download speed.

## 6. Signal strength is not the same as conversation quality

Modems expose several measurements. Their units and exact ranges depend on radio mode and modem documentation:

| Full term | Abbreviation | What it roughly tells you |
|---|---|---|
| Received Signal Strength Indicator | RSSI | Total received power in the channel, including wanted signal, interference, and noise |
| Reference Signal Received Power | RSRP | Strength of the LTE reference signal |
| Reference Signal Received Quality | RSRQ | Quality related to reference signal and total received energy/load |
| Signal-to-Interference-plus-Noise Ratio | SINR | How distinguishable the wanted signal is from interference and noise |

Power readings are often reported in **decibels referenced to one milliwatt (dBm)**, a logarithmic unit. More negative received-power numbers mean weaker power: for example, −110 dBm is weaker than −80 dBm. Do not convert one metric into a green/yellow/red product verdict without the modem and carrier documentation.

None of these values alone predicts a good conversation. Log them with application measurements:

- round-trip time (RTT), the time for a request to travel out and a response to return;
- jitter, the variation in packet arrival timing;
- packet loss and retransmission;
- audio buffer underflow/overflow;
- session setup and reconnect time;
- cell and band changes;
- current and rail voltage; and
- modem and enclosure temperature.

A strong received signal can coexist with congestion or interference. A weaker stable connection may sound better than a strong connection with loss and jitter.

## 7. Antennas turn PCB and enclosure geometry into radio behavior

An antenna is a conductor shaped and placed to exchange energy with an electromagnetic field. It is not a generic “signal booster.” Its behavior depends on:

- operating frequency;
- antenna geometry and orientation;
- its nearby ground plane;
- the feed cable and connector;
- nearby battery, display, speaker magnet, flex cables, screws, and shielding;
- plastic enclosure thickness and material; and
- the user's hand and body.

The **feedline** carries RF energy between modem and antenna. Cellular reference designs commonly target a **50-ohm characteristic impedance**. That does not mean placing a 50 Ω resistor in series, and a normal multimeter cannot verify it. Characteristic impedance comes from trace width, copper thickness, dielectric material, distance to the reference plane, and surrounding geometry.

A **matching network** is a small group of components used to tune the electrical transition between radio and antenna in the actual product geometry. Copying its component values from an unrelated enclosure is not tuning.

For early Mochi tests:

1. use the modem evaluation board's documented antennas and ports;
2. power the modem off before connecting or disconnecting the tiny coaxial connectors;
3. connect the required main antenna before allowing transmit;
4. follow the documented `MAIN`, auxiliary/diversity (`AUX`), and Global Navigation Satellite System (`GNSS`) port roles;
5. keep cables away from the speaker, switching regulators, and fast digital wiring where practical;
6. record antenna part number, cable, orientation, and placement for every result; and
7. test with the intended battery, display, enclosure mock-up, and a hand holding the device.

Never transmit into a required open main antenna port. Do not route the evaluation board's RF path through Mochi's first carrier merely for neatness; keep the proven module and its documented coaxial path intact.

Global Navigation Satellite System reception, which includes the Global Positioning System (GPS), uses extremely weak satellite signals. It usually performs poorly indoors and adds antenna, placement, power, and privacy work. Treat GNSS as an optional experiment on the cellular mule, not a committed Mochi feature.

## 8. Why a modem can reboot a board that looked adequately powered

Cellular transmission is bursty. The modem may consume moderate average current, then demand amp-scale current for a short transmit interval. The source path is a chain:

| Part of the power path | Job | Selection mistake to avoid |
|---|---|---|
| Battery or external source | Stores or supplies energy; its terminal voltage and pulse capability vary with load and condition | Choosing only by milliampere-hours or average load |
| Protection and power-path circuit | Limits unsafe conditions and controls whether battery, charger, or external power feeds the system | Allowing an external data/control cable to back-power an “off” device |
| Voltage regulator | Converts the varying source into the voltage rail required by the modem | Checking only nominal continuous current, not transient response and heat |
| Local decoupling and bulk capacitors | Supply part of a fast current change close to the modem | Treating capacitance as a replacement for an adequate source and regulator |
| Connectors, copper, vias, and ground return | Carry the pulse to the modem and back | Ignoring small resistance and inductance because continuity passes |

```text
battery or bench supply
        -> protection/power-path circuit
        -> regulator
        -> connector and cable
        -> PCB copper and vias
        -> modem supply pins
        -> ground return through the same physical chain
```

Every link has resistance and inductance. In the simple resistive approximation:

```text
voltage drop = current × path resistance
```

For an illustrative example, a 2 A burst through a total 0.20 Ω supply-and-return path produces:

```text
2 A × 0.20 Ω = 0.40 V drop
```

Those numbers are not Mochi measurements. They demonstrate why a cable or connector that seems “almost zero ohms” can matter at high current.

Local ceramic and bulk capacitors provide current for parts of a transient, but they are not an infinite reservoir. The battery or source must deliver the pulse, the regulator must remain stable, the connector and copper must have low enough impedance, and the ground return must be adequate. Cell state of charge, age, and cold temperature can make the same design fail later even if it works on a full warm battery.

Typical symptoms are misleading:

- modem detaches or resets;
- USB device disappears and re-enumerates;
- ESP32-S3 brownout or watchdog reset;
- speaker click or microphone corruption;
- display flicker; or
- storage corruption during a power interruption.

These can look like driver bugs. Check the power rail at the modem pins before rewriting the protocol stack.

### What each instrument can and cannot show

| Instrument | Useful for | Common limitation |
|---|---|---|
| Digital multimeter | steady rail voltage, resistance while unpowered, rough average current | often averages away a brief damaging droop |
| USB power meter | convenient input energy and average current | may not observe the battery/modem branch or fast peaks |
| Current-limited bench supply | controlled voltage and fault energy; logged average behavior on some models | leads and supply transient response may differ from the final battery |
| Oscilloscope | voltage versus time, startup, ripple, and short droop | probe location and long ground leads can produce misleading traces |
| Current probe or shunt with oscilloscope | current pulse shape and timing | requires suitable bandwidth, safe setup, and interpretation |
| Temperature probe or thermal camera | heating over time and hot spots | surface temperature may not equal internal junction temperature |

Measure the rail at the modem supply pins or the nearest intended test point, using a short probe ground connection. Also measure at the regulator. The difference helps locate the weak part of the path.

## 9. Heat and coexistence appear only in combined tests

Power lost in the modem, regulator, battery path, and RF power amplifier becomes heat. Test after the device reaches a steady temperature, not only for the first minute.

Run a combined worst-reasonable case:

- weak-signal uplink traffic;
- simultaneous microphone upload and speaker playback;
- audio echo cancellation and voice encoding;
- face and sliding-caption rendering;
- charging, if product policy permits those functions together;
- Wi-Fi/Bluetooth activity in the setup-specific tests; and
- a closed enclosure mock-up held in a hand.

Mochi's Bluetooth Low Energy provisioning link is shut down before live audio, so provisioning coexistence and live-session operation are separate test cases. Still test LTE near Wi-Fi, display, audio, and switching-power circuitry because they share a small physical enclosure.

## 10. Network failover is session reconstruction, not a magic cable swap

Switching from Wi-Fi to LTE changes IP addresses, network address translation state, routing, latency, and possibly Domain Name System results. An existing encrypted connection normally cannot simply continue on the new interface.

Mochi therefore treats failover as an application state transition:

```text
link failure
  -> stop microphone uplink and show reconnecting
  -> discard incomplete input and queued output
  -> choose a usable route only after it remains stable long enough to avoid flapping
  -> repeat DNS, TLS, device authentication, and session setup
  -> reconstruct only committed conversation state
  -> return to live only inside Mochi's maximum 10-second grace period
```

Requiring a route to remain stable before switching is called **hysteresis**; it prevents rapid Wi-Fi/LTE switching when both links are marginal. Mochi measures the grace period from detected route loss. If reconnection exceeds 10 seconds, live intent is cleared and the user must press Start again. Speech is never buffered across the outage and side-effecting work is never replayed automatically. This is a distributed-systems rule driven by network behavior, not a modem limitation. See [architectural decision record 0002 — Wi-Fi first and 4G LTE failover](../docs/decisions/0002_use_wifi_first_and_4g_lte_failover.md).

## 11. Certification is a stack of evidence

Certification here means several different reviews by regulators, industry groups, carriers, battery shippers, and test laboratories. Exact obligations depend on country, antenna, transmitters, body distance, product category, and how the device is sold. This chapter is an orientation, not a legal compliance determination.

### A module approval is conditional reuse, not inheritance

A modem module may already have regulatory test reports and identifiers. Those approvals normally assume specific integration conditions such as approved antennas, maximum antenna gain, power supply behavior, labeling, separation distances, and no unreviewed change to the RF path.

The finished Mochi device adds Wi-Fi/Bluetooth, a new board, enclosure, cables, power converters, display, and simultaneous transmit cases. These can change emissions and human RF exposure. The final host therefore needs its own integration review and tests.

### The major layers for a North American portable device

**PTCRB** originally stood for “PCS Type Certification Review Board”; today it is the name of a cellular-device certification program. Its current public process describes a separate streamlined **IoT Network Certified** route for cellular IoT products that integrate a PTCRB-certified module. A qualified lab must determine which current route and operator-specific tests apply to Mochi.

| Layer | Question it answers | Typical Mochi concern |
|---|---|---|
| Module evidence and integration conditions | Was the radio module tested, and may this antenna/integration reuse that evidence? | exact modem firmware, allowed antennas/gain, labels, RF path |
| Federal Communications Commission (FCC) / Innovation, Science and Economic Development Canada (ISED) | Does the finished intentional/unintentional radiator meet emissions and RF-exposure rules? | portable/body-worn use, Wi-Fi/Bluetooth plus LTE simultaneous transmission |
| PTCRB or IoT Network Certified | Does the cellular device meet the applicable industry interoperability process? | exact module, antenna, software, integration, and current program route |
| Carrier acceptance | Will a specific operator allow and support this device on its network? | IMEI/device class, bands, features, plan, regional launch |
| Battery safety and transport | Is the cell/pack/system safe and is required transport evidence available? | charger behavior, protection, United Nations subsection 38.3 evidence |
| Product labeling and change control | Can each sold unit and revision be traced to approved evidence? | identifiers, user instructions, bill-of-materials/antenna/firmware substitutions |

**Specific absorption rate (SAR)** is one method used to evaluate radio-frequency energy absorbed by the body. Whether SAR measurement or another exposure evaluation applies depends on transmitter power, frequency, distance, simultaneous transmission, and applicable rules. Do not choose the enclosure and antenna location first and ask this question after tooling.

Engage an accredited radio-frequency/compliance lab before antenna and enclosure freeze. Give the lab the exact target regions, user-worn/handheld use, radios, antenna data, simultaneous-transmit modes, battery system, and module approval documents. Keep modem firmware, antenna, cable, PCB stack-up, enclosure, and bill of materials under change control; a “small” substitution can require review.

## 12. Mochi's staged cellular learning plan

The stages intentionally separate experience, networking, power, embedded integration, and product compliance.

### Stage A — Use a phone hotspot

Connect Mochi over Wi-Fi to a phone hotspot and run real conversations. Record phone model, carrier, location, time, and radio technology when the phone exposes it.

This tests the experience over that phone's mobile backhaul. It does **not** validate Mochi's future modem, antenna, SIM, embedded driver, power rail, or certification.

### Stage B — Use the SIM7600G-H as a Linux bench mule

Connect the large SIM7600G-H development board by USB to a Linux host, using its documented supply, required antennas, and an activated PIN-disabled physical SIM. Prove:

- USB enumeration and control ports;
- SIM readiness, carrier registration, and data-profile activation;
- outbound DNS, TLS, and Internet traffic;
- signal/band/cell reporting;
- disconnect and recovery behavior; and
- optional GNSS outdoors.

The 56 × 65 mm-class board is an observable development mule, not Mochi's enclosure daughterboard.

### Stage C — Instrument power independently

Measure average current, transmit-burst current, minimum voltage at the modem pins, startup behavior, and temperature. Repeat under a strong and weak signal, low source voltage within the allowed range, and sustained uplink traffic.

With Mochi's latching switch off, connect modem power, data, and control paths one at a time. Prove none can back-power the system or microphone rail.

### Stage D — Prove one exact ESP32-S3 path

“USB/UART modem” is not an interface decision. Freeze and measure:

- exact modem/module and firmware;
- exact host and device roles;
- USB class/driver or UART rate, packet framing, and hardware flow control;
- power-on, reset, shutdown, and recovery sequencing;
- compressed throughput in both directions;
- processor, memory, and queue headroom;
- audio echo cancellation and codec load;
- simultaneous microphone capture, speaker playback, encrypted network traffic, face animation, and sliding caption; and
- attach, session setup, disconnect, reconnect, and repeated-failure behavior.

If the ESP32-S3 cannot own this path with measured headroom, reopen the compute architecture before the PCB is frozen. Do not silently hide an additional Linux computer in the product.

### Stage E — Select a replaceable production-size direction

Choose an exact compact modem board that fits the enclosure and carrier before integrating a bare radio module. LTE Cat 1bis is the leading North American production direction, subject to current band, carrier, supply, power, firmware, antenna, and certification evidence. Evaluate antenna positions in enclosure mock-ups.

### Stage F — Integrate RF only after evidence

Only a later board should integrate a bare modem and custom feed/matching path. Follow the selected vendor reference design, stack-up rules, antenna guidance, and compliance-lab plan. This is why [architectural decision record 0005](../docs/decisions/0005_build_modular_carrier_before_integrated_rf.md) defers integrated radio-frequency circuitry.

## 13. A repeatable measurement workflow

Use the same test script at multiple locations and conditions. Change one variable at a time.

### Before the test

Record:

- date, time, indoor/outdoor location, and whether the device is held;
- modem exact model/SKU, hardware revision, and firmware;
- antenna part number, port, cable, orientation, and enclosure state;
- SIM provider, carrier, plan class, APN profile name, roaming setting, and IP version—never copy credentials into ordinary logs;
- host hardware, operating system/firmware revision, transport, and driver;
- power source, voltage, current limit, battery state, and ambient temperature; and
- expected result and stop conditions.

### During the test

1. Start from a defined powered-off condition.
2. Capture boot-to-SIM-ready, SIM-ready-to-registered, registered-to-data-ready, and data-ready-to-session-ready times separately.
3. Record serving operator, radio technology, band, cell identity when permitted, and RSSI/RSRP/RSRQ/SINR.
4. Verify actual application reachability with DNS, TLS, device authentication, and a live conversation; do not stop at “registered.”
5. During at least ten minutes of full-duplex conversation traffic, record RTT, jitter, loss, audio underflows, interruptions, data volume, current, minimum rail voltage, and temperature.
6. Force or safely create defined failures: remove network reachability, move between coverage conditions, restart the modem, and switch routes according to the test plan.
7. Confirm incomplete speech/output is discarded and only committed history is reconstructed.
8. Let the system reach steady temperature and repeat while charging only if that is an allowed product mode.
9. Save raw measurements, instrument screenshots, serial logs with credentials redacted, and observed user-visible behavior.

### What a useful result table looks like

| Claim | Measurement | Condition | Pass rule | Evidence |
|---|---|---|---|---|
| modem can attach | time to registration and data-ready | carrier/location/SIM/APN named | project target, not “eventually” | timestamped modem log |
| Internet path works | DNS/TLS/session success | same | authenticated application session established | gateway and device trace IDs |
| power path survives transmit | lowest voltage at modem pins and peak current | weak-signal sustained uplink | above documented minimum with margin | oscilloscope capture |
| conversation remains usable | RTT/jitter/loss/underflows and interruption behavior | ten-minute full-duplex script | current product gate | synchronized session log |
| enclosure is thermally viable | component/enclosure temperature over time | closed, held, combined load | reviewed safe/design limits | time series and test setup photo |
| recovery is bounded | detection-to-ready time and resulting state | named disconnect/failover | correct discard/reconstruction behavior | state/event trace |

All numeric budgets must be marked **illustrative** until this exact setup measures them and the project promotes them into an accepted requirement.

## 14. Beginner equipment and material checklist

You do not need all of this for the phone-hotspot stage. Acquire equipment as each stage requires it.

| Stage | Materials/equipment | Purpose |
|---|---|---|
| Hotspot | phone with hotspot plan, Mochi Wi-Fi prototype | screen the user experience over mobile backhaul |
| Linux modem mule | SIM7600G-H development board, documented main/auxiliary antennas, data-capable USB cable, activated PIN-disabled physical data SIM, Linux host | observe attach, controls, and data path |
| Basic electrical checks | digital multimeter, documented supply/cables, USB power meter | verify steady voltage and approximate input energy/current |
| Transient power work | current-limited bench supply, oscilloscope, suitable probes/test points, optional current probe or characterized shunt | capture burst current and rail droop |
| Thermal work | contact temperature probes or thermal camera, enclosure mock-up | find hot spots and steady-state temperatures |
| RF/product work | exact candidate antennas/cables and early engagement with an accredited lab | evaluate integration and build a compliance plan |

Do not improvise a modem supply, antenna adapter, or lithium charging path because its connector fits. Follow the exact development-board and modem hardware guide.

## Self-check

Try to answer without looking back:

1. What separate jobs do the modem, SIM, carrier, APN, and antenna perform?
2. Why can a modem be registered to a cell while Mochi still has no working application connection?
3. Why does a modem advertised as “global LTE” still need an exact regional band and carrier check?
4. Why can a multimeter show a normal average rail voltage while the modem repeatedly resets?
5. What does a local bulk capacitor help with, and what can it not replace?
6. Why should antenna tests be repeated with the enclosure, battery, and user's hand present?
7. Why does certification of the modem module not automatically certify Mochi?
8. What has a phone-hotspot test proven, and what has it not proven?

### Answer check

1. The modem implements the cellular/radio protocol; the SIM identifies a subscription; the carrier authenticates and operates service; the APN selects a carrier data profile; the antenna exchanges RF energy with the cell site.
2. Registration proves part of the radio/core-network state. APN activation, IP configuration, DNS, TLS, device authentication, and the application session can still fail.
3. Carriers deploy different bands by region, modem SKUs support different subsets, and operators may accept only specific device/module combinations and plans.
4. A short transmit burst can produce a voltage droop that a slow meter averages away. Measure at the modem pins with an oscilloscope.
5. It supplies some transient current locally. It cannot replace a capable battery/source, stable regulator, low-impedance connector/copper path, or adequate return path.
6. Nearby materials and the body change antenna tuning, absorption, orientation, and radiation behavior.
7. The host changes antennas, enclosure, simultaneous transmitters, emissions, exposure, power, labels, and integration conditions; it needs review against the module approval and product rules.
8. It screens conversation behavior over that phone, carrier, location, and current mobile backhaul. It does not validate Mochi's modem, SIM, radio bands, antenna, power path, embedded driver, or certification.

## Primary references for later design work

These are implementation references, not substitutes for the staged measurements above:

- [SIM7600 series hardware design guide](https://files.waveshare.com/upload/5/52/SIM7600G%28-H%29_SIM7600NA%28-H%29_Hardware_Design_V1.08.pdf)
- [Federal Communications Commission Knowledge Database (FCC KDB) 996369 modular integration guidance](https://apps.fcc.gov/oetcf/kdb/forms/FTSSearchResultPage.cfm?id=44637&switch=P)
- [FCC KDB 447498 radio-frequency exposure guidance](https://apps.fcc.gov/oetcf/kdb/forms/FTSSearchResultPage.cfm?id=20676&switch=P)
- [PTCRB certification process and IoT-device route](https://www.ptcrb.com/get-certified/)
- [ISED RSS-102 radiofrequency exposure compliance](https://ised-isde.canada.ca/site/spectrum-management-telecommunications/en/devices-and-equipment/radio-equipment-standards/radio-standards-specifications-rss/rss-102-radio-frequency-rf-exposure-compliance-radiocommunication-apparatus-all-frequency-bands)
- [United Nations (UN) Manual of Tests and Criteria Rev.8 (2023) and Amendment 1 to Rev.8 (2025), lithium battery subsection 38.3](https://unece.org/transport/standards/transport/dangerous-goods/un-manual-tests-and-criteria-rev8-2023)
