# 0001 — Component sources, staged BOM, and online tests

Status: Purchase research complete; prices and stock must be rechecked at checkout  
Observed: 2026-08-30  
Working checkout assumption: United States, inferred only from the workspace timezone. Confirm the actual test country, carriers, and future markets before Gate B; the North American production options below are exploratory.

## Purchase summary

### Buy now — Gate A

| Qty | Item | Observed price | Source | Why now |
|---:|---|---:|---|---|
| 1 | M5Stack CoreS3 Lite, K128-LITE | $44.90 | [M5Stack](https://shop.m5stack.com/products/m5stack-cores3-lite-esp32s3-iot-dev-kit?variant=46532030497025) | Integrated screen, touch, dual microphones, speaker/amp, battery, microSD, Wi-Fi/BLE, IMU, and ESP32-S3 let us validate interaction without breadboard noise. |
| 1 | Known-good USB-C data cable | $5–10 | Existing cable or reputable local supplier | Power-only cables cause misleading flash/debug failures. |

The CoreS3 Lite is 54 × 54 × 16.5 mm with a 2-inch 320 × 240 capacitive display, 16 MB flash, 8 MB PSRAM, two microphones, I²S audio, a 1 W speaker, Wi-Fi, BLE, and a 200 mAh internal cell. That cell is for untethered demonstrations, not evidence for final runtime.

Do **not** add a separate display, audio board, final battery, custom PCB, GPS board, or 5G modem to this order.

### Buy after the Wi-Fi voice gate — Gate B

| Qty | Item | Observed price | Source | Purchase condition |
|---:|---|---:|---|---|
| 1 | SIM7600G-H 4G HAT, 56.21 × 65.15 mm | $97.99 | [Waveshare](https://www.waveshare.com/product/iot-communication/sim7600g-h-4g-hat.htm) | End-to-end Wi-Fi voice works and region/model compatibility is checked. This is an external bench mule, not an enclosure board. The listed package includes one LTE MAIN antenna and one GNSS antenna; its AUX/diversity connector needs a separate compatible LTE antenna. |
| 1 | Compatible LTE AUX/diversity antenna | Live quote required | Confirm connector, bands, gain, cable, and approval with Waveshare/seller | Cat 4 evaluation should use the vendor-recommended MAIN plus diversity receive configuration rather than treating the included GNSS antenna as a second LTE antenna. |
| 1 | **One** SIM/service path: Soracom plan-US **or** a direct-carrier SIM/plan | Soracom physical SIM $5 plus usage; consumer examples about $30–40/month for 5–10 GB | [Soracom plan-US](https://store.soracom.io/product/soracom-plan-us-iot-ecosim-card/), [carrier/plan coverage](https://developers.soracom.io/en/docs/reference/carriers/), [T-Mobile](https://prepaid.t-mobile.com/prepaid-internet), [AT&T](https://www.att.com/prepaid/mobile-hotspot-tablet/), or [Verizon](https://www.verizon.com/prepaid/plans/data-only-plans/) | These are alternatives, not stackable plans. The observed plan-US store SKU includes only a 1 MB monthly allocation and base coverage is US-only; voice needs a permitted larger bundle. Canada needs a suitable international/local profile. Commit after reading the modem IMEI and confirming acceptance. |
| 1 | Average-energy meter and access to transient instrumentation | USB meter $15–30 typical; scope/current probe/shunt varies | Reputable electronics/test supplier or borrowed/rented lab equipment | A USB meter can measure input average/energy. A bandwidth-appropriate oscilloscope plus suitable probe/shunt or specified logger is required to claim modem-rail peak evidence. |

SIM7600G-H provides broad regional LTE Cat 4 coverage, USB/UART, antenna connectors, and GNSS for evaluation; “global” does not guarantee carrier acceptance. The bare modem's [hardware design guide](https://files.waveshare.com/upload/5/52/SIM7600G%28-H%29_SIM7600NA%28-H%29_Hardware_Design_V1.08.pdf) specifies a 3.4–4.2 V rail capable of roughly 2 A transients, while the evaluation HAT accepts its documented 5 V input. Do not feed 3.4–4.2 V into the HAT's 5 V input. Follow its manual and use a known-good adequately rated source/cable. A laptop USB test can prove basic networking, but it proves neither the final battery supply nor the ESP32-S3's modem interface/driver capacity.

Use a phone hotspot before buying this stage. It cheaply screens how the experience behaves over mobile backhaul, but the phone may be using 4G or 5G, another carrier/profile, and completely different RF hardware. Log the phone's carrier and radio access technology when available; target-modem coverage and acceptance remain unresolved until physical modem tests.

## Deliberately deferred candidates

| Subsystem | Candidate and source | Observed price/status | Verdict |
|---|---|---|---|
| Compact compute | [Seeed XIAO ESP32-S3, 113991114](https://www.seeedstudio.com/XIAO-ESP32S3-p-5627.html) | $7.49; 21 × 17.8 mm; observed available | Good later Wi-Fi/BLE compute module for a custom carrier; it lacks the integrated UX needed now. |
| Narrow all-in-one | [M5StickS3, K150](https://shop.m5stack.com/products/m5sticks3-esp32s3-mini-iot-dev-kit?variant=47548831072513) | $21.50; 48 × 24 × 15 mm; observed available | Too narrow for the selected face and weaker for acoustic experiments. |
| Rounded display | [Waveshare 1.69-inch Touch LCD, SKU 27057](https://www.waveshare.com/1.69inch-Touch-LCD-Module.htm) | $14.99; board about 33.13 × 41.13 mm; observed available | Attractive 240 × 280 touch candidate after face/layout measurements; do not lock it now. |
| Audio reference | [Seeed ReSpeaker Lite, 107990273](https://www.seeedstudio.com/ReSpeaker-Lite-p-5928.html) | $24.90; 35 × 86 mm; observed in stock | Useful USB/I²S AEC/noise/AGC lab reference, but too long for the product. |
| Digital mic | [Adafruit ICS-43434, product 6049](https://www.adafruit.com/product/6049) | $8.95; observed available | I²S candidate for a relocatable acoustic mule. |
| I²S amp | [Adafruit MAX98357A, product 3006](https://www.adafruit.com/product/3006) | $5.95; observed available | Known class-D acoustic-mule module. Its bridge-tied outputs must never be grounded. |
| Speaker | [Adafruit 8 ohm, 1 W speaker, product 3923](https://www.adafruit.com/product/3923) | $1.95; observed available | Cheap acoustic test part; enforce volume/amplitude so a 5 V amplifier cannot overdrive it. Enclosure cavity matters more than its catalog line. |
| Battery | [Adafruit protected 2500 mAh LiPo, product 328](https://www.adafruit.com/product/328) | $14.95; 50 × 60 × 7.3 mm; observed available | Energy/volume reference, not a production recommendation. It has protection but no thermistor, must be charged at no more than 1.2 A per the supplier, must not be charged/used unattended, and needs external temperature policy/power-path validation. |
| Mute switch | [C&K JS102011SAQN](https://www.digikey.com/en/products/detail/c-k/JS102011SAQN/1640095) | $0.90 | Good mechanical-latch candidate for the later carrier. |
| Action button | [C&K PTS645VL39-2 LFS, DigiKey CKN9103-ND search](https://www.digikey.com/en/products?keywords=PTS645VL39-2%20LFS) | $0.42 observed | Tactile candidate; force and cap geometry require an ergonomic mock-up. |
| GNSS | [u-blox MAX-M10 series](https://www.u-blox.com/en/product/max-m10-series?legacy=Current) | Exact regional MPN, stock, and price not selected | Only if the SIM7600 GNSS trial proves a user feature worth the power/privacy cost. |

An approximate 2,500 mAh, 3.7 V cell stores 9.25 Wh. At 85% conversion efficiency that is only about 3.9 hours at a 2 W average load or 2.0 hours at 4 W. Those are arithmetic examples, not a runtime forecast; modem bursts, sleep duty cycle, conversion loss, temperature, aging, and usable cutoff all matter.

## Production cellular direction, not a shopping order

For a North American integrated prototype, the 16 × 16 mm LEXI-R10 LTE Cat 1bis family is the leading size/power architecture candidate. The cellular business has transferred from u-blox to Trasna; [Trasna reports the family in production](https://www.trasna.io/blog/u-blox-cellular-modules), but the old u-blox datasheet URL is stale. Cat 1bis offers one receive antenna and sufficient nominal throughput for compressed voice. Before using it, obtain a current manufacturer datasheet/revision and exact order code, then revalidate regional SKU, operator approvals, supply, and reference design. The [MIKROE 4G LTE 3 Click for North America](https://www.mikroe.com/4g-lte-3-click-for-north-america) is a $129-class evaluation board, not a final form factor.

Do not purchase a tray of bare LGA modules. Distributor availability observed during this research ranged from no stock/MOQ 500 to small authorized quantities, which is a supply-chain risk as much as an electrical decision. Telit's [LE910Cx-NF certification announcement](https://www.telit.com/press/telit-le910cx-nf-lte-iot-modules-now-certified-by-the-three-largest-u-s-mobile-network-operators/) documents another mature US-carrier fallback.

The first custom PCB keeps cellular on a replaceable breakout. Before PCB freeze, one exact host path—not an ambiguous “USB/UART” placeholder—must demonstrate encrypted duplex audio plus display/audio load on the intended embedded host. The carrier should mechanically support the selected vendor board and leave RF on that board's documented antenna connectors unless a reviewed interface says otherwise. Only a later EVT integrates a bare module, after attach, host-driver, power, heat, RF placement, carrier, and compliance risks have been measured.

### Why not 5G now

The [Quectel RM520N series](https://www.quectel.com/product/5g-rm520n-series/) is approximately 30 × 52 mm before its carrier, requires multiple RF paths and a demanding high-speed/power/thermal design, and is already much of a pager's footprint. A [Sixfab Raspberry Pi 5G development kit](https://sixfab.com/product/raspberry-pi-5g-development-kit-5g-hat/) is useful for network experiments but costs hundreds of dollars and is not an enclosure path.

5G RedCap may eventually fit the product better. The [Quectel RG255C series](https://www.quectel.com/product/5g-redcap-rg255c-series/) is smaller and retains LTE fallback, but current evaluation hardware is expensive and availability is immature. LTE is the decision until measured latency, coverage, carrier sunset policy, or a customer requirement disproves it.

## Reference build: inspiration, not BOM

Huy Vector's [build guide](https://www.huyvector.org/robots-kinetic/pocket-ai-assistant) text lists an ESP32-C3, OLED, microphone module, a “98357BGA”-labelled amplifier entry, phone speaker, battery, Type-C charger, and switch. Its current linked products, diagram, and video resolve these to an ESP32-C3 SuperMini, 0.96-inch OLED, INMP441-class I²S microphone, MAX98357A-class I²S amplifier, and 14250 cell. The guide links browser flashing; the video demonstrates temporary-AP/captive-portal provisioning. The video does not demonstrate cellular, GPS, OpenAI, battery life, acoustic echo cancellation, certification, or production safety.

The guide links a compiled firmware binary but does not supply corresponding source or a license for that artifact. Treat it as untrusted reference-only: do not use it on a trusted network, redistribute it, or base product firmware on it until provenance, license, endpoints, credentials, and network behavior are audited. The upstream [XiaoZhi ESP32 project](https://github.com/78/xiaozhi-esp32) is MIT-licensed, but that does not establish the license of Huy's binary or rights to the xiaozhi.me hosted service. The video's hosted-service UI also labels its “Open Source” tier for learning/noncommercial use and warns that commercial features may require licensing; treat that as service UI evidence, not an interpretation of the upstream firmware license.

Do not reproduce the visible removal of the cell wrapper, direct soldering to a cell, or use of an exposed metal frame as a ground bus. Use a protected/tabbed cell or approved connector, insulation, strain relief, a qualified charger/power path, and an RF-aware enclosure.

## Online and pre-hardware test matrix

| Question | Cheapest valid test | What it cannot prove |
|---|---|---|
| Does the face feel alive? | Build the state machine in the [LVGL PC simulator](https://docs.lvgl.io/9.1/integration/ide/pc-simulator.html); test timings and screen recordings. | Display viewing angle, touch feel, GPU/MCU contention, and physical scale. |
| Does the conversation/prompt work? | Use the [OpenAI Realtime Playground](https://platform.openai.com/playground/realtime), then a desktop/browser client through our gateway. | Embedded audio drivers and real network transitions. |
| Does event/network logic fit ESP32? | Use [Wokwi ESP32 simulation](https://docs.wokwi.com/guides/esp32) for buttons, display states, Wi-Fi logic, and failure injection. | Cellular RF, real audio fidelity, current peaks, antennas, and thermals. |
| Is the schematic electrically coherent? | Run ERC and simple analog/power checks in [EasyEDA](https://docs.easyeda.com/en/Simulation/Chapter1-Introduction/) or KiCad plus a circuit simulator. | RF certification, acoustic feedback, and layout-dependent power integrity. |
| Does the board fit? | Exchange STEP models between ECAD and CAD; print a 1:1 paper/foam model; order a cheap shell from [JLC3DP](https://jlc3dp.com/3d-printing-quote) or [Xometry](https://www.xometry.com/). | Drop life, RF detuning, finish, and injection molding behavior. |
| Does voice tolerate mobile backhaul? | First use a phone hotspot and log its carrier/RAT when available. Then use SIM7600G-H by USB with one selected SIM/service path. Log latency, data, signal, reconnects, average energy, and temperature. | The phone does not prove target-modem LTE coverage. Linux USB does not prove the embedded host/interface, final antenna, carrier approval, peaks, SAR, or battery life. |

No online simulator honestly validates antenna placement, network attach, RF coexistence, acoustic echo, enclosure vibration, modem current spikes, heat, or battery runtime. These require physical mules and instrumentation.

## PCB suppliers for the later gate

- [JLCPCB order flow](https://jlcpcb.com/help/article/how-do-i-place-an-order) and [PCBA pricing components](https://jlcpcb.com/help/article/pcb-assembly-price): good low-quantity economics and integrated parts/3D-print workflow; obtain a live quote.
- [PCBWay assembly](https://www.pcbway.com/pcb-assembly.html): useful second quote and assembly option.
- [MacroFab](https://www.macrofab.com/platform): higher-touch North American prototype/production option.
- [Seeed Fusion PCBA FAQ](https://support.seeedstudio.com/knowledgebase/topics/150804-fusion-pcb-assembly-faq): another small-batch comparison.

At Gate C, quote 5–10 assembled four-layer carrier boards plus two bare boards. Compare landed cost, component substitutions, inspection/X-ray, stencil/NRE, electrical test, lead time, and import/shipping—not the headline PCB promo alone.

## Regulatory and carrier checks

A pre-certified modem does not certify the finished pager. Exact obligations depend on region, operator, SKU, antenna/integration, use, and commercialization. Before freezing antenna or enclosure geometry, review the [PTCRB integrated-device process](https://www.ptcrb.com/get-certified/), selected-carrier approval, [FCC modular integration guidance](https://apps.fcc.gov/oetcf/kdb/forms/FTSSearchResultPage.cfm?id=44637&switch=P), [portable/body-worn RF exposure guidance](https://apps.fcc.gov/oetcf/kdb/forms/FTSSearchResultPage.cfm?id=20676&switch=P), host EMC, simultaneous Wi-Fi/BLE/LTE transmit cases, and battery/transport compliance with a qualified lab.

Blues Notecard is not selected: its event/data economics and standard allowance are a poor fit for continuous streaming, while its [hardware terms](https://shop.blues.com/pages/hardware-terms) explicitly restrict PSTN-interoperating realtime voice/SMS, IP telephony, MSISDN applications, and emergency calling. Those terms do not clearly decide every non-PSTN AI-audio workload; obtain written vendor approval before reconsidering it.
