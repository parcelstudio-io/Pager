# 0001 — Component sources, staged BOM, and online tests

Status: Purchase research complete; prices and stock must be rechecked at checkout  
Observed: 2026-08-30  
Working checkout assumption: United States, inferred only from the workspace timezone. Confirm the actual test country, carriers, and future markets before Gate B; the North American production options below are exploratory.

## Purchase summary

### Buy now — Gate A

| Qty | Item | Observed price | Source | Why now |
|---:|---|---:|---|---|
| 1 | M5Stack CoreS3, K128 — **purchased 2026-08-31, $77.90** | $59.90 list | [Amazon, M5Stack Official Store](https://www.amazon.com/M5Stack-CoreS3-ESP32S3-IoT-Develpment/dp/B0C7G5GPGC) (bought); [DigiKey K128](https://www.digikey.com/en/products/detail/m5stack-technology-co-ltd/K128/18839257) at list | Integrated screen, touch, dual microphones, speaker/amp, synchronized speaker-feedback input, battery, microSD, Wi-Fi/BLE, IMU, and ESP32-S3 let us validate the concurrent interaction/audio path without breadboard noise. The full K128 was chosen over the K128-LITE for its 500 mAh cell (vs 200 mAh) and additional expansion; see the [ADR 0001 amendment](../decisions/0001_use_esp32s3_interaction_mule.md). |
| 1 | Known-good USB-C data cable | $5–10 | Existing cable or reputable local supplier | Power-only cables cause misleading flash/debug failures. |

The CoreS3 family shares one design (M5Stack publishes a single `Sch_M5_CoreS3_v1.0.pdf` schematic across it): a 2-inch 320 × 240 capacitive display, 16 MB flash, 8 MB PSRAM, two microphones, I²S audio, a 1 W speaker, Wi-Fi, BLE, GC0308 camera, BMI270 IMU, and AXP2101 PMIC. The Lite (K128-LITE, 54 × 54 × 16.5 mm) carries a 200 mAh cell and a magnetic backplate; the full K128 carries a 500 mAh cell and M5Stack's base module. The audio subsystem — the part this project actually depends on — is identical. M5Stack describes its ES7210/AW88298 path as a [full-duplex audio solution](https://docs.m5stack.com/en/core/CoreS3-Lite), and its [reference implementation](https://github.com/m5stack/StackChan/blob/main/firmware/main/hal/board/cores3_audio_codec.cc) opens simultaneous receive/transmit and selects the ES7210 MIC3 reference lane. Those facts justify an early AEC experiment; they do not prove usable double-talk in Mochi's enclosure. The internal cell is for untethered demonstrations, not evidence for final runtime.

Do **not** add a separate display, audio board, final battery, custom PCB, GPS board, or 5G modem to this order.

### Buy only after the CoreS3 concurrent-audio baseline — Gate A acoustic/privacy mule

If Day 8 verifies simultaneous I²S receive/transmit, the MIC3 reference lane, and enough resource headroom, order one compatible relocatable digital microphone, I²S amplifier, 8-ohm speaker, illuminated conversation control, a switched-microphone gate with state-coupled indicator (bench instrumentation for capture-gate/fault-injection measurements per [ADR 0008](../decisions/0008_use_exactly_two_physical_controls.md) — not a product control), and safe prototyping interconnect. The current target is $20–40 plus shipping. Recheck pins, voltage, clocks, reference strategy, capture-gate/indicator topology, stock, and landed price before purchase; take a shipping pause rather than advancing to the cellular gate without this evidence.

### Buy after the Wi-Fi full-duplex voice gate — Gate B

| Qty | Item | Observed price | Source | Purchase condition |
|---:|---|---:|---|---|
| 1 | SIM7600G-H 4G HAT, 56.21 × 65.15 mm | $97.99 | [Waveshare](https://www.waveshare.com/product/iot-communication/sim7600g-h-4g-hat.htm) | End-to-end Wi-Fi full-duplex voice passes its acoustic/privacy/stability gate and region/model compatibility is checked. This is an external bench mule, not an enclosure board. The listed package includes one LTE MAIN antenna and one GNSS antenna; its AUX/diversity connector needs a separate compatible LTE antenna. |
| 1 | Compatible LTE AUX/diversity antenna | Live quote required | Confirm connector, bands, gain, cable, and approval with Waveshare/seller | Cat 4 evaluation should use the vendor-recommended MAIN plus diversity receive configuration rather than treating the included GNSS antenna as a second LTE antenna. |
| 1 | **One** SIM/service path: Soracom plan-US **or** a direct-carrier SIM/plan | Soracom physical SIM $5 plus usage; T-Mobile prepaid data-only $20/month for 5 GB or $30/month for 10 GB plus a one-time $25/line connection charge; AT&T prepaid data-only from $35/month (15 GB); Verizon from $40/month (5 GB); T-Mobile-network MVNOs from about $10–15/month (observed 2026-08-31) | [Soracom plan-US](https://store.soracom.io/product/soracom-plan-us-iot-ecosim-card/), [carrier/plan coverage](https://developers.soracom.io/en/docs/reference/carriers/), [T-Mobile](https://prepaid.t-mobile.com/prepaid-internet), [AT&T](https://www.att.com/prepaid/mobile-hotspot-tablet/), or [Verizon](https://www.verizon.com/prepaid/plans/data-only-plans/) | These are alternatives, not stackable plans. The observed plan-US store SKU includes only a 1 MB monthly allocation and base coverage is US-only; voice needs a permitted larger bundle. Canada needs a suitable international/local profile. Commit after reading the modem IMEI and confirming acceptance. |
| 1 | Average-energy meter and access to transient instrumentation | USB meter $15–30 typical; scope/current probe/shunt varies | Reputable electronics/test supplier or borrowed/rented lab equipment | A USB meter can measure input average/energy. A bandwidth-appropriate oscilloscope plus suitable probe/shunt or specified logger is required to claim modem-rail peak evidence. |

SIM7600G-H remains purchasable and vendor-supported in 2026 (not EOL; observed 2026-08-31), but it is a previous-generation Qualcomm design, and community reports document T-Mobile "registration denied" for SIM7600-based devices with uncertified IMEIs — which is why the IMEI-acceptance check below precedes any plan purchase. Two current alternatives are worth quoting at Gate B: the Waveshare SIM7670G LTE Cat-1/GNSS HAT ($44.99 direct, observed 2026-08-31 — an earlier ~$28 figure in this document was wrong and did not match any current SKU) rehearses the single-antenna Cat 1bis-class architecture the production direction targets at under half the price, and the Sixfab Raspberry Pi 4G/LTE Modem Kit ($140 observed) offers the US-carrier-certified Telit LE910C4-NF, which directly de-risks IMEI acceptance. SIM7600G-H provides broad regional LTE Cat 4 coverage, USB/UART, antenna connectors, and GNSS for evaluation; “global” does not guarantee carrier acceptance. The bare modem's [hardware design guide](https://files.waveshare.com/upload/5/52/SIM7600G%28-H%29_SIM7600NA%28-H%29_Hardware_Design_V1.08.pdf) specifies a 3.4–4.2 V rail capable of roughly 2 A transients, while the evaluation HAT accepts its documented 5 V input. Do not feed 3.4–4.2 V into the HAT's 5 V input. Follow its manual and use a known-good adequately rated source/cable. A laptop USB test can prove basic networking, but it proves neither the final battery supply nor the ESP32-S3's modem interface/driver capacity.

Use a phone hotspot before buying this stage. It cheaply screens how the experience behaves over mobile backhaul, but the phone may be using 4G or 5G, another carrier/profile, and completely different RF hardware. Log the phone's carrier and radio access technology when available; target-modem coverage and acceptance remain unresolved until physical modem tests.

## Deferred or gate-conditioned candidates

| Subsystem | Candidate and source | Observed price/status | Verdict |
|---|---|---|---|
| Compact compute | [Seeed XIAO ESP32-S3, 113991114](https://www.seeedstudio.com/XIAO-ESP32S3-p-5627.html) | $7.49; 21 × 17.8 mm; observed available | Good later Wi-Fi/BLE compute module for a custom carrier; it lacks the integrated UX needed now. |
| Narrow all-in-one | [M5StickS3, K150](https://shop.m5stack.com/products/m5sticks3-esp32s3-mini-iot-dev-kit?variant=47548831072513) | $21.50; 48 × 24 × 15 mm; observed available | Too narrow for the selected face and weaker for acoustic experiments. |
| Rounded display | [Waveshare 1.69-inch Touch LCD, SKU 27057](https://www.waveshare.com/1.69inch-Touch-LCD-Module.htm) | $14.99; board about 33.13 × 41.13 mm; observed available | Attractive 240 × 280 touch candidate after face/layout measurements; do not lock it now. |
| Audio reference | [Seeed ReSpeaker Lite, 107990273](https://www.seeedstudio.com/ReSpeaker-Lite-p-5928.html) | $24.90; 35 × 86 mm; observed in stock | Optional independent USB/I²S AEC/noise/AGC comparator if the CoreS3 result needs diagnosis; too long for the product and not part of the initial order. |
| Digital mic | [Adafruit ICS-43434, product 6049](https://www.adafruit.com/product/6049) | $8.95; observed available | Day 8-conditioned I²S candidate for the relocatable acoustic mule. **Design flag (2026-08-31): Adafruit's own page states the ICS-43434 is discontinued by TDK and names the SPH0645LM4H ([product 3421](https://www.adafruit.com/product/3421)) as the replacement.** Buying 6049 for a bench mule is fine; do not carry a discontinued MEMS part into the carrier BOM without an explicit lifetime decision. Evaluate the SPH0645LM4H, or a currently-produced TDK/Knowles equivalent, before Gate C freezes the microphone. |
| I²S amp | [Adafruit MAX98357A, product 3006](https://www.adafruit.com/product/3006) | $5.95; observed available | Day 8-conditioned acoustic-mule module. Its bridge-tied outputs must never be grounded. |
| Speaker | [Adafruit 8 ohm, 1 W speaker, product 3923](https://www.adafruit.com/product/3923) | $1.95; observed available | Day 8-conditioned acoustic test part; enforce volume/amplitude so a 5 V amplifier cannot overdrive it. Enclosure cavity matters more than its catalog line. |
| Battery | [Adafruit protected 2500 mAh LiPo, product 328](https://www.adafruit.com/product/328) | $14.95; 50 × 60 × 7.3 mm; observed available | Energy/volume reference, not a production recommendation. It has protection but no thermistor, must be charged at no more than 1.2 A per the supplier, must not be charged/used unattended, and needs external temperature policy/power-path validation. |
| Power slide switch | [C&K JS102011SAQN](https://www.digikey.com/en/products/detail/c-k/JS102011SAQN/1640095) | $0.85 observed 2026-08-31 | Latching-slide candidate, recast per [ADR 0008](../decisions/0008_use_exactly_two_physical_controls.md) as the product power switch (off de-energizes the system). The Day-12 bench rig (ordered after Day 8) still uses a switched microphone gate for instrumentation, not as a product control. |
| Conversation button | [C&K PTS645VL39-2 LFS, DigiKey CKN9103-ND search](https://www.digikey.com/en/products?keywords=PTS645VL39-2%20LFS) | ~$0.31 observed 2026-08-31 (search-snippet price; DigiKey blocks automated fetches — confirm in browser at checkout) | Day 8-conditioned tactile mechanism candidate for start/stop; force and cap geometry require an ergonomic mock-up, and the live-state light and capture-enable coupling require separate parts and circuitry. |
| GNSS | [u-blox MAX-M10 series](https://www.u-blox.com/en/product/max-m10-series?legacy=Current) | Exact regional MPN, stock, and price not selected | Only if the SIM7600 GNSS trial proves a user feature worth the power/privacy cost. |

An approximate 2,500 mAh, 3.7 V cell stores 9.25 Wh. At 85% conversion efficiency that is only about 3.9 hours at a 2 W average load or 2.0 hours at 4 W. Those are arithmetic examples, not a runtime forecast; modem bursts, sleep duty cycle, conversion loss, temperature, aging, and usable cutoff all matter.

## Production cellular direction, not a shopping order

For a North American integrated prototype, the 16 × 16 mm LEXI-R10 LTE Cat 1bis family is the leading size/power architecture candidate. The cellular business has transferred from u-blox to Trasna; [Trasna reports the family in production](https://www.trasna.io/blog/u-blox-cellular-modules), and current documentation is now obtainable (observed 2026-08-31): the [Trasna LEXI-R10 product page](https://www.trasna.io/product/lexi-r10-cellular-iot-module) and R18 public data sheet confirm the 16 × 16 mm, 133-pin LGA form factor, with regional order codes including LEXI-R10401D for North America — the module carried by the [MIKROE 4G LTE 3 Click for North America](https://www.mikroe.com/4g-lte-3-click-for-north-america), a $129-class evaluation board, not a final form factor. Cat 1bis offers one receive antenna and sufficient nominal throughput for compressed voice. Before using it, revalidate regional SKU, operator approvals, supply, and reference design with Trasna. Treat SGP.32 support as a later modem/eUICC/carrier-system evaluation, not a Gate B dependency; the physical-SIM EVT comes first ([ADR 0007](../decisions/0007_use_companion_app_and_cloud_history_sync.md)).

Do not purchase a tray of bare LGA modules. Distributor availability observed during this research ranged from no stock/MOQ 500 to small authorized quantities, which is a supply-chain risk as much as an electrical decision. Telit's [LE910Cx-NF certification announcement](https://www.telit.com/press/telit-le910cx-nf-lte-iot-modules-now-certified-by-the-three-largest-u-s-mobile-network-operators/) documents another mature US-carrier fallback.

The first custom PCB keeps cellular on a replaceable breakout. Before PCB freeze, one exact host path—not an ambiguous “USB/UART” placeholder—must demonstrate independently flowing encrypted uplink/downlink audio plus simultaneous capture, playback, AEC, and display load on the intended embedded host. The carrier should mechanically support the selected vendor board and leave RF on that board's documented antenna connectors unless a reviewed interface says otherwise. Only a later EVT integrates a bare module, after attach, host-driver, power, heat, RF placement, carrier, and compliance risks have been measured.

### Why not 5G now

The [Quectel RM520N series](https://www.quectel.com/product/5g-rm520n-series/) is approximately 30 × 52 mm before its carrier, requires multiple RF paths and a demanding high-speed/power/thermal design, and is already much of a pager's footprint. A [Sixfab Raspberry Pi 5G development kit](https://sixfab.com/product/raspberry-pi-5g-development-kit-5g-hat/) is useful for network experiments but is not an enclosure path — the kit is now sold as "5G Development Kit v2" at $195 excluding the 5G module itself, so a working setup lands in the $300+ range (observed 2026-08-30).

5G RedCap may eventually fit the product better. The [Quectel RG255C series](https://www.quectel.com/product/5g-redcap-rg255c-series/) is smaller and retains LTE fallback, but current evaluation hardware is expensive (the DigiKey-listed 5G-REDCAP-EVB-KIT is ~$421 and excludes the module; observed 2026-08-30) and availability is immature. LTE is the decision until measured latency, coverage, carrier sunset policy, or a customer requirement disproves it. Standard Starlink can only be an external dish/router whose Wi-Fi the pager uses. Starlink Direct to Cell is now a conditional participating-carrier IoT path for compatible Cat-1/Cat-1-bis/Cat-4 modems and bands, but it is not the MVP baseline until an exact country, partner carrier, SIM/plan, modem, and realtime-session profile pass Gate B; see [ADR 0002](../decisions/0002_use_wifi_first_and_4g_lte_failover.md).

### Companion app: no hardware purchase, native-bridge spike required

The [ADR 0007](../decisions/0007_use_companion_app_and_cloud_history_sync.md) companion app adds nothing to the hardware BOM. React Native is only the current UI candidate. Bridge Espressif's official iOS and Android provisioning libraries and prove Security 2, custom endpoints, permissions, foreground behavior, failure recovery, memory use, and licenses on both platforms before freezing the stack. Third-party wrappers may be evaluated as spike accelerators, but none is a selected production dependency.

## Reference build: inspiration, not BOM

Huy Vector's [build guide](https://www.huyvector.org/robots-kinetic/pocket-ai-assistant) text lists an ESP32-C3, OLED, microphone module, a “98357BGA”-labelled amplifier entry, phone speaker, battery, Type-C charger, and switch. Its current linked products, diagram, and video resolve these to an ESP32-C3 SuperMini, 0.96-inch OLED, INMP441-class I²S microphone, MAX98357A-class I²S amplifier, and 14250 cell. The guide links browser flashing; the video demonstrates temporary-AP/captive-portal provisioning. The video does not demonstrate cellular, GPS, OpenAI, battery life, acoustic echo cancellation, certification, or production safety.

The guide links a compiled firmware binary but does not supply corresponding source or a license for that artifact. Treat it as untrusted reference-only: do not use it on a trusted network, redistribute it, or base product firmware on it until provenance, license, endpoints, credentials, and network behavior are audited. The upstream [XiaoZhi ESP32 project](https://github.com/78/xiaozhi-esp32) is MIT-licensed, but that does not establish the license of Huy's binary or rights to the xiaozhi.me hosted service. The video's hosted-service UI also labels its “Open Source” tier for learning/noncommercial use and warns that commercial features may require licensing; treat that as service UI evidence, not an interpretation of the upstream firmware license.

Do not reproduce the visible removal of the cell wrapper, direct soldering to a cell, or use of an exposed metal frame as a ground bus. Use a protected/tabbed cell or approved connector, insulation, strain relief, a qualified charger/power path, and an RF-aware enclosure.

## New York sourcing: where to actually buy each part

Observed 2026-08-31 for a New York City buyer. Amazon, DigiKey, Mouser, Waveshare, and Micro Center all block automated fetches, so prices marked *unconfirmed* came from search snippets or could not be read at all; confirm in a browser at checkout. **Amazon is not an authorized Adafruit distributor** ([distributor list](https://www.adafruit.com/distributors) names DigiKey, Mouser, Jameco, and Micro Center), so every "Adafruit" Amazon listing is a third-party reseller.

### The headline: Micro Center Brooklyn changes the plan

[Micro Center Brooklyn](https://www.microcenter.com/site/stores/brooklyn.aspx), 850 3rd Ave, Sunset Park, is the only place in New York City where this project's parts can be bought over a counter. Mon–Sat 10:00–21:00, Sun 11:00–18:00, 18-minute in-store pickup. It stocks **genuine Adafruit-branded** product, including every acoustic-mule part: [ICS-43434 mic](https://www.microcenter.com/product/691530/adafruit-industries-i2s-mems-microphone-breakout-ics-43434), [MAX98357A amp](https://www.microcenter.com/product/613583/adafruit-industries-max98357a-i2s-3w-class-d-amplifier-breakout) at $5.95, [Mini Oval Speaker](https://www.microcenter.com/product/612827/adafruit-industries-mini-oval-speaker-8-ohm-1-watt), and the [2500 mAh LiPo](https://www.microcenter.com/product/454401/adafruit-industries-lithium-ion-polymer-battery-37v-2500mah) at $14.99. Buying the cell in person also sidesteps lithium shipping rules entirely. Always check the Brooklyn store's stock toggle before travelling — a catalog listing is not shelf stock.

### Per-part sourcing

| Part | Amazon? | Best source for NYC | Delivery |
|---|---|---|---|
| CoreS3 interaction mule — superseded sourcing note | The original Lite search found no Amazon listing | **Do not buy another board.** The full CoreS3 K128 was purchased from M5Stack's official Amazon storefront on 2026-08-31; see the purchase record above and [daily log](../../scrum/20260830/task_0001/daily_log.md). The former K128-LITE/DigiKey option is retained only as historical research. | Purchased K128 arrival was recorded for 2026-09-02 |
| USB-C data cable | Yes, commodity | Amazon Same-Day, Best Buy, or B&H | Same day |
| Adafruit ICS-43434 (6049) | **No US listing.** Every cheap "I²S MEMS mic" on Amazon is a different chip (usually INMP441) | Micro Center Brooklyn, or [Adafruit direct](https://www.adafruit.com/product/6049) $8.95 | Same day walk-in, or next-day ground from Brooklyn |
| Adafruit MAX98357A (3006) | [B01K5GCFA6](https://www.amazon.com/Adafruit-I2S-Class-Amplifier-Breakout/dp/B01K5GCFA6), third-party reseller, price unconfirmed | Micro Center Brooklyn or Adafruit direct, both $5.95 | Same day walk-in |
| Adafruit speaker (3923) | [B07KKP4YP7](https://www.amazon.com/Adafruit-Mini-Oval-Speaker-Watt/dp/B07KKP4YP7), reseller | Add to the Adafruit order, $1.95 | With the rest |
| Adafruit 2500 mAh LiPo (328) | [B01NAX9XYG](https://www.amazon.com/Adafruit-328-Battery-Lithium-Polymer/dp/B01NAX9XYG), reseller — **high risk** | Micro Center Brooklyn $14.99 (no shipping rules), or Adafruit $14.95 ground-only | Same day walk-in |
| C&K JS102011SAQN power switch | [B00M1S2NUO](https://www.amazon.com/dp/B00M1S2NUO), unconfirmable seller/price | [DigiKey 1640095](https://www.digikey.com/en/products/detail/c-k/JS102011SAQN/1640095) $0.85, no minimum — buy ~10 in one order with the tactile switch | Next day |
| C&K PTS645VL39-2 LFS | [B0748MGX1J](https://www.amazon.com/COMPONENTS-PTS645SL502LFS-Compact-Through-Tactile/dp/B0748MGX1J), reseller | [DigiKey CKN9103-ND](https://www.digikey.com/en/products/detail/c-k/PTS645VL39-2-LFS/1146765) ~$0.31 | Next day |
| Illuminated conversation button (prototype) | — | [Adafruit 16 mm illuminated pushbutton #1477](https://www.adafruit.com/product/1477) $1.95, LED independently drivable | Next day |
| Waveshare SIM7600G-H HAT | [B0BD544MRN](https://www.amazon.com/dp/B0BD544MRN) $120.99 from Waveshare's **official** store | [Waveshare direct](https://www.waveshare.com/sim7600g-h-4g-hat.htm) $97.99 — Amazon is a 23.5% markup with no speed benefit | Direct: 5–10 days from Shenzhen |
| Waveshare SIM7670G HAT | [B0CXP7ZPVL](https://www.amazon.com/dp/B0CXP7ZPVL) $59.99 official store | Waveshare direct $44.99 — Amazon is a 33% markup | 5–10 days |
| LTE AUX/diversity antenna | [B07ZYXDSDK](https://www.amazon.com/dp/B07ZYXDSDK) Bingfu 2-pack $9.89, brand storefront, FBA | Same — best option. **Does not cover Band 71 (600 MHz)** | Prime next-day |
| USB power meter | [B0D9B93YDQ](https://www.amazon.com/dp/B0D9B93YDQ) Eversame PD3.1 $15.99, accumulates mAh/Wh | Same; B&H stocks a Plugable VAMETER3 at $29.95 for same-day, but it does not accumulate | Next day |
| Sixfab 4G Modem Kit | Listing exists but **out of stock**, and cannot be configured with the Telit module | [Sixfab direct](https://sixfab.com/product/raspberry-pi-4g-lte-modem-kit/) $140, ships from Texas via UPS | Next-day available |
| Seeed XIAO ESP32-S3 | Official Seeed store exists; multiple confusable ASINs | [DigiKey 113991114](https://www.digikey.com/en/products/detail/seeed-technology-co-ltd/113991114/19285530) $7.49, zero markup. **The plain board already has 8 MB PSRAM — do not pay for Sense**, which only adds a camera/PDM mic/SD | Next day |
| Seeed ReSpeaker Lite | **No Amazon listing** | [Seeed direct](https://www.seeedstudio.com/ReSpeaker-Lite-p-5928.html) $24.90, select US warehouse | Domestic |
| Waveshare 1.69" Touch LCD | [B0D17CN13C](https://www.amazon.com/1-69inch-LCD-Module-Touch-Communication/dp/B0D17CN13C) official store | Amazon is genuinely best here — next-day beats a China ship. **Verify the ASIN is the touch version**; several near-identical Waveshare 1.69" ASINs are SPI-only non-touch | Next day |

### Cellular antenna trap

The plain SIM7600G-H HAT (P/N 17372) uses **SMA female** jacks; the **(B) variant uses IPEX-1/u.FL** and costs the same $97.99. The two are easy to confuse and need different antennas. Confirm which variant is in the cart before ordering antennas.

### Adafruit logistics

Adafruit moved out of Manhattan in 2024 and is now at Industry City, Brooklyn ([announcement](https://blog.adafruit.com/2024/08/08/adafruit-industry-city/)). **There is no will-call or public storefront** — do not travel there. Orders placed by 11:00 ET ship the same day, and Brooklyn-to-NYC ground is a one-zone lane that typically lands next day. A [$30 flat same-day courier](https://www.adafruit.com/sameday) exists (11:00 cutoff, Mon–Fri, all four boroughs) but is rarely worth it given next-day ground. Free shipping starts at $199.

### Instrumentation: borrow the oscilloscope

Gate C requires a bandwidth-appropriate oscilloscope for modem transient capture — a significant purchase. [Fat Cat Fab Lab](https://fatcatfablab.org/electronics), 224 W 4th St in the West Village, publishes an equipment list including an oscilloscope, bench power supplies, a function generator, soldering stations, and a reflow oven, with 24/7 member access at a reported ~$99–110/month (confirm directly; their site blocks automated checks). One month of membership costs far less than a scope. [NYC Resistor](https://www.nycresistor.com/participate/) in Boerum Hill runs free public Craft Nights every Monday and Thursday at 18:30 — the cheapest way to meet people with test gear, though a current bench scope there was not confirmed.

### Venues to rule out

- **Tinkersphere's Lower East Side storefront is closed.** Their site states the current office "is not open to the public." Online-only; do not travel there.
- **Best Buy** is, for this BOM, essentially a cable-and-storage backstop. Its Arduino/Pi listings are largely third-party Marketplace fulfilment, not shelf stock.
- **B&H Photo** is useful for cables, power supplies, storage, and some test gear with 30-minute Midtown pickup, but carries no breakout boards — and it is **closed every Saturday and after 14:00 Friday**, with the website also offline over that window.
- **NYU and Columbia makerspaces** are restricted to affiliates.
- **Amazon Same-Day** is fine for cables, enclosures, and tools, but its inventory skews to anonymous marketplace sellers — precisely the channel through which cloned ESP32 boards and mislabelled I²S microphones enter.

## Online and pre-hardware test matrix

| Question | Cheapest valid test | What it cannot prove |
|---|---|---|
| Does the face feel alive? | Build the state machine in the [LVGL PC simulator](https://docs.lvgl.io/9.1/integration/ide/pc-simulator.html); test timings and screen recordings. | Display viewing angle, touch feel, GPU/MCU contention, and physical scale. |
| Does the conversation/prompt work? | Use the [OpenAI Realtime Playground](https://platform.openai.com/playground/realtime), then a desktop/browser client through our gateway; exercise semantic VAD, speech-driven interruption, cancellation, and truncation. | Embedded AEC/audio drivers, render-cursor accuracy, enclosure acoustics, and real network transitions. |
| Does event/network logic fit ESP32? | Use [Wokwi ESP32 simulation](https://docs.wokwi.com/guides/esp32) for the session toggle, parallel input/output states, generation/cursor handling, Wi-Fi logic, and failure injection. | Cellular RF, real audio fidelity/AEC, current peaks, antennas, and thermals. |
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
