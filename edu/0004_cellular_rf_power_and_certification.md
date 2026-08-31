# 0004 — Cellular, RF, power, and certification

Adding “4G” is not like adding a Wi-Fi library. Cellular is a coupled system: regional bands, operator acceptance, SIM identity, modem firmware, antennas, RF layout, burst power, thermal behavior, data plan, and legal approvals. A development HAT hides some hardware complexity but not the product obligations.

## Network generations and device categories

Generation labels are broad families. The useful comparison is the modem category and deployed network support:

- **LTE-M (Cat M1):** optimized for low-power IoT, modest bandwidth and often higher/variable latency. Excellent for telemetry; voice streaming must be tested with the actual operator and plan.
- **LTE Cat 1bis:** moderate LTE throughput with one receive antenna, which can reduce size. A strong candidate for compressed realtime audio.
- **LTE Cat 4:** mature, higher throughput, commonly uses main plus diversity antennas, and is easy to evaluate with SIM7600-class hardware.
- **5G broadband:** very high throughput with multiple antennas, USB 3/PCIe-class host links, large peak power, and heat. Poor fit for this pager unless a measured feature needs it.
- **5G RedCap:** reduced-capability 5G aimed at smaller IoT devices, but ecosystem, supply, cost, and certifications are still moving.

The cloud model does the compute. Mochi sends and receives compressed speech, control events, and occasional tool data. Throughput is not the dominant reason to select a radio; coverage, latency distribution, reconnect behavior, physical integration, operator lifetime, and cost are.

## From SIM to internet

A SIM/eSIM holds operator credentials. The modem attaches to a compatible radio band, authenticates, establishes a packet-data context using an APN, and receives an IP path generally behind carrier NAT. Firmware controls the modem through AT commands or a higher-level driver; data commonly moves over USB networking or a modem-managed socket API.

Before purchase, check all of the following:

1. The precise regional modem SKU supports the target operator's bands.
2. The operator accepts that model/IMEI and the device/use category.
3. The plan permits sustained bidirectional data and has enough high-speed allowance.
4. APN, IPv4/IPv6, NAT idle timeout, roaming, and activation are understood.
5. The modem and host drivers work together.

“Global modem” does not mean one certified consumer product works with every operator.

Useful radio metrics include RSSI (coarse received strength), RSRP (LTE reference-signal power), RSRQ (quality), and SINR (signal relative to interference/noise). None alone predicts conversation quality. Log them alongside RTT, jitter, loss, reconnects, audio underflows, cell changes, temperature, and current.

## Why power fails suddenly

Radio transmit happens in bursts. A modem whose average draw looks reasonable may demand roughly 2 A for a short interval. Resistance and inductance in a thin wire, connector, regulator, or battery create a transient voltage drop:

```text
voltage droop ≈ burst current × path resistance
```

Capacitors help at different frequencies, but they do not compensate for an undersized source. The design needs a regulator/power path with transient headroom, low-impedance planes and connectors, vendor-recommended local bulk/ceramic capacitance, and a cell capable of the pulse current at low charge and cold temperature.

Brownouts can masquerade as firmware bugs: modem detach, USB reset, audio click, MCU reboot, or corrupt storage. Measure the rail at the modem pins with an oscilloscope while forcing weak-signal uplink traffic. A slow USB meter is useful for energy averages but may miss the damaging peak.

Heat follows power loss in the modem, regulator, battery, and RF power amplifier. Test simultaneous microphone uplink, speaker downlink, AEC, display animation, poor signal, charging, Wi-Fi/BLE coexistence, and a closed enclosure. The user's hand changes both heat rejection and antenna tuning.

## Antennas are part of the enclosure

An antenna converts guided RF energy to a field and back. Its performance depends on frequency, ground plane, matching network, feedline impedance, nearby metal, battery, display, speaker magnet, flex cables, plastic, hand, and body. Moving it after mechanical freeze can invalidate earlier testing.

Follow the modem/antenna vendor reference design: usually a 50-ohm feed, short route over uninterrupted ground, controlled stack-up, appropriate connector, via fence/keep-out, and optional matching network placed for tuning. Keep LTE antennas separated from Wi-Fi/BLE and from noisy digital/power circuits. Use the evaluation board's documented antenna connectors and MAIN/AUX/GNSS configuration; do not assume U.FL or route its RF through the first carrier unnecessarily. External antennas make early tests replaceable but are not a production aesthetic. Power off before connecting or disconnecting antennas, and never transmit into an open MAIN port.

GNSS reception is especially sensitive because satellite signals are weak. It works poorly indoors and adds antenna/placement/privacy costs. Test the modem's GNSS outdoors before adding a separate receiver.

## Certification layers

A module's approvals are valuable evidence, not a pass for the final host. The finished device can change RF exposure, spurious emissions, antenna gain, simultaneous-transmission behavior, and operator behavior.

For a US/Canadian portable product, investigate at least the following; exact obligations depend on SKU, operator, antenna/integration, intended use, and commercialization:

- module integration conditions and allowed antennas;
- FCC/ISED emissions and portable/body-worn RF exposure (often SAR-related);
- PTCRB integrated-device testing and operator-specific acceptance;
- host EMC and simultaneous LTE/Wi-Fi/BLE cases;
- lithium battery safety, charger behavior, and UN 38.3 transport evidence;
- labeling, user instructions, and production-change control.

Requirements depend on geography and product classification. Engage an accredited RF/compliance lab before the antenna and enclosure are frozen, not after tooling. Keep exact module firmware, antenna, cable, PCB stack-up, and bill of materials traceable because “small” substitutions can require review.

## Mochi's staged proof

1. Use a phone hotspot to screen experience over that phone's mobile backhaul, recording its carrier and radio technology when available; this does not validate the target modem.
2. Use SIM7600G-H by USB on a Linux host to test activation, network, signal, data, GNSS, and operator behavior.
3. Power and thermally instrument the modem separately. With the pager's latching switch off, prove that modem power/data/control pins cannot back-power the system or microphone rails.
4. Prove one exact connection from the intended ESP32-S3 path to the modem, including host/device role, flow control, compression/throughput, CPU/RAM, reset/reconnect, power sequencing, and simultaneous face and sliding-caption rendering, AEC, I²S receive/transmit, and encrypted uplink/downlink. Measure provisioning-time BLE load separately while capture is gated; the companion BLE link is shut down before live audio. If the modem path fails, reopen compute architecture before PCB freeze.
5. Treat the large SIM7600 HAT as an external bench mule. Select an exact compact modular board before enclosure/carrier commitment and test its documented antenna positions in mock-ups.
6. Select a regional production module and compliance plan only with evidence.

This order is why [ADR 0002](../docs/decisions/0002_use_wifi_first_and_4g_lte_failover.md) chooses LTE rather than 5G and why [ADR 0005](../docs/decisions/0005_build_modular_carrier_before_integrated_rf.md) defers integrated RF.

## Primary references

- [SIM7600 series hardware design guide](https://files.waveshare.com/upload/5/52/SIM7600G%28-H%29_SIM7600NA%28-H%29_Hardware_Design_V1.08.pdf)
- [FCC KDB 996369 modular integration guidance](https://apps.fcc.gov/oetcf/kdb/forms/FTSSearchResultPage.cfm?id=44637&switch=P)
- [FCC KDB 447498 RF exposure guidance](https://apps.fcc.gov/oetcf/kdb/forms/FTSSearchResultPage.cfm?id=20676&switch=P)
- [PTCRB integrated-device process](https://www.ptcrb.com/get-certified/)
- [ISED RSS-102 radiofrequency exposure compliance](https://ised-isde.canada.ca/site/spectrum-management-telecommunications/en/devices-and-equipment/radio-equipment-standards/radio-standards-specifications-rss/rss-102-radio-frequency-rf-exposure-compliance-radiocommunication-apparatus-all-frequency-bands)
- [UN Manual of Tests and Criteria Rev.8 (2023) and Amendment 1 to Rev.8 (2025), lithium battery subsection 38.3](https://unece.org/transport/standards/transport/dangerous-goods/un-manual-tests-and-criteria-rev8-2023)
