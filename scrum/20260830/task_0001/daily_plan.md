# Task 0001 daily product-building plan

This is a 35-project-day sequence. One project day is a focused session; it need not equal a calendar day, and shipping pauses do not consume days. Record actual dates, orders, measurements, links, and deviations in a `daily_log.md` when execution starts. A failed exit condition pauses downstream purchases.

## Milestone 1 — Prove the experience before hardware complexity

### Day 1 — Freeze the experiment and place the only immediate order

- **Build/test:** Read the product concept and requirements, choose three representative conversations, create a separate OpenAI API project with billing/usage alerts, enforce a hard application quota in the gateway, and try the voice/persona in the [Realtime Playground](https://platform.openai.com/playground/realtime).
- **Purchase/decision:** Order exactly one [M5Stack CoreS3 Lite](https://shop.m5stack.com/products/m5stack-cores3-lite-esp32s3-iot-dev-kit?variant=46532030497025) and one known-good data-capable USB-C cable. Record landed cost and ETA. Do not buy cellular, a final battery, or a display.
- **Why:** An integrated mule removes wiring variables while software and interaction are still changing. The Playground tests the highest-risk subjective question immediately.
- **Exit evidence:** Versioned prompt/voice notes, three saved evaluation scripts, receipt, and an explicit API spend ceiling.

### Day 2 — Make a desktop end-to-end voice slice

- **Build/test:** Implement the smallest desktop/browser capture-to-gateway-to-Realtime-to-playback path with structured turn IDs and timestamps. Use server-to-server WebSocket from the gateway; keep the standard API key there.
- **Purchase/decision:** Buy nothing. Select `gpt-realtime-2.1-mini` as the configurable development baseline and `gpt-realtime-2.1` as the quality comparator.
- **Why:** It proves credentials, provider events, audio format, and model behavior without embedded debugging. A configurable comparison avoids confusing model quality with device quality.
- **Exit evidence:** One recorded two-way turn, timing breakdown, and proof the client bundle/logs contain no standard provider key.

### Day 3 — Prototype the face on a PC

- **Build/test:** Create the local expression state machine in an LVGL desktop simulator: booting, idle, listening, thinking, speaking, delighted, confused, muted, offline, and low battery. Drive speaking motion from an audio-amplitude trace and add the compact status line seen in the reference.
- **Purchase/decision:** Buy nothing. Choose one face grammar (eye radius, blink timing, motion limits, type scale) for EVT rather than many themes.
- **Why:** Animation can be evaluated and unit-tested faster on desktop, and a state grammar prevents inconsistent one-off screens.
- **Exit evidence:** State-transition tests plus a 30 fps screen recording reviewed at actual 2-inch scale.

### Day 4 — Define the device protocol and observability

- **Build/test:** Specify versioned control events, binary audio framing, turn/sequence IDs, cancellation, configuration, backpressure, and health metrics. Add end-to-end correlation and redact secrets/content from routine logs.
- **Purchase/decision:** Buy nothing. Decide that the device speaks only to our gateway with a revocable device credential.
- **Why:** A small stable protocol decouples firmware from provider changes and makes latency/failure diagnosable.
- **Exit evidence:** Protocol document/tests covering reorder, disconnect, duplicate cancel, queue overflow, and revoked credentials.

### Day 5 — Establish the software quality/latency gate

- **Build/test:** Run at least 50 desktop turns across the three evaluation scripts. Compare the mini/full model on response usefulness, personality, first-audio latency, and estimated cost. Break latency into capture finalization, gateway, provider first audio, network, and playback buffering.
- **Purchase/decision:** Buy nothing. Keep or revise the default model with evidence; do not tune the hardware to mask service latency.
- **Why:** This establishes a ceiling on device performance and catches prompt/service problems before hardware arrives.
- **Exit evidence:** Results table; Gate A software passes when the conversation is useful, interruption works, and no structural blocker prevents the 800 ms median target.

## Milestone 2 — Put the interaction on the ESP32-S3 mule

### Day 6 — Inspect and baseline the CoreS3 Lite

- **Build/test:** Photograph/record board revision and packaging, place an opaque cover over the built-in camera, omit its driver/clock initialization, update only through the vendor-supported path, and run display/touch/mic/speaker/Wi-Fi self-tests. Measure tethered idle/demo current only with the internal cell fully charged/stable or separately account for PMIC charging current.
- **Purchase/decision:** If shipment is delayed, continue simulator/gateway hardening; do not substitute impulsively. Return/exchange only for a reproducible hardware fault.
- **Why:** A known-good baseline distinguishes our bugs from delivery damage, board revision, or cable problems.
- **Exit evidence:** Inventory record, self-test results, board ID, toolchain version, and current baseline.

### Day 7 — Port the face and controls

- **Build/test:** Port the state machine, touchscreen hold-to-talk/action region, status line, and animation assets. Do not use the side power button for variable-length holds; a six-second hold invokes shutdown. Measure touch-to-face latency and frame time under deliberate CPU load.
- **Purchase/decision:** Buy nothing. Keep the camera disabled and retain the 2-inch screen for EVT.
- **Why:** The face must remain responsive independently of the cloud and audio path.
- **Exit evidence:** All local states at 30 fps, action response under 100 ms, no watchdog reset during a 30-minute animation soak.

### Day 8 — Validate audio locally

- **Build/test:** Capture raw mic samples, inspect level/clipping/noise, play swept tones and speech, and then run local record/playback without network. Record sample rate/format, DMA buffer sizes, gain, and speaker limits.
- **Purchase/decision:** Buy nothing. Select a conservative volume ceiling that avoids obvious clipping/rattle.
- **Why:** Network/model work cannot repair clipped capture or unstable drivers.
- **Exit evidence:** Saved short diagnostic samples, level plots, no buffer overflow/underflow during a 30-minute loop.

### Day 9 — Stream embedded audio to the gateway

- **Build/test:** Send microphone frames over Wi-Fi with bounded queues, sequence numbers, reconnect/backoff, and metrics; return a known server audio stream for playback. Inject delay, loss, and disconnects.
- **Purchase/decision:** Buy nothing. Choose initial codec/frame size from measured MCU load and latency, not bandwidth folklore.
- **Why:** Known audio separates embedded transport from model behavior.
- **Exit evidence:** One-hour known-audio soak with documented underflows, overflows, CPU/memory headroom, and reconnect time.

### Day 10 — Complete embedded push-to-talk voice

- **Build/test:** Connect the CoreS3 path to Realtime. Holding the touchscreen region starts capture/listening; release commits; returned audio speaks; a new touch cancels local and upstream work.
- **Purchase/decision:** Keep half-duplex. If the complete loop passes, order one relocatable acoustic-mule set for Day 22: [ICS-43434 mic](https://www.adafruit.com/product/6049), [MAX98357A amp](https://www.adafruit.com/product/3006), [8-ohm speaker](https://www.adafruit.com/product/3923), a product-like external tactile button, and safe prototyping connectors/board. Verify free I²S/GPIO and electrical compatibility before checkout; otherwise buy nothing.
- **Why:** This is the smallest honest product loop and preserves a clean AEC experiment boundary. Ordering discrete audio only after this pass enables relocatable ports/cavities without spending before the core path works.
- **Exit evidence:** Recorded ten-turn conversation with correct face transitions and no stuck state; if purchased, a compatibility note, receipt, and ETA for the relocatable acoustic mule.

### Day 11 — Make cancellation and state synchronization boring

- **Build/test:** Hammer release, double press, press-during-thinking, press-during-speech, late packets, timeout, and gateway restart. Define which state wins when mute/offline/cancel collide.
- **Purchase/decision:** Buy nothing. Lock precedence: hardware mute and faults override connectivity, which overrides model expression accents.
- **Why:** Cute devices feel broken when their animation and audio disagree more than when an answer is imperfect.
- **Exit evidence:** Automated transition matrix and 100 randomized interaction sequences without stale playback.

### Day 12 — Add privacy and bounded memory behavior

- **Build/test:** Implement software support for a simulated hardware-mute input, credential revocation, diagnostic redaction, raw-audio non-retention, and opt-in/forget flows for structured server memory.
- **Purchase/decision:** Buy nothing. Confirm no raw audio is retained by our service by default and no GPS/camera feature enters MVP.
- **Why:** Privacy architecture becomes expensive to retrofit after logs, storage, and UI expectations harden.
- **Exit evidence:** Storage/log inventory, successful delete/revocation tests, and a visible muted state that cannot be cleared remotely.

## Milestone 3 — Test mobile networking, then decide on standalone LTE

### Day 13 — Screen the experience over a phone's mobile backhaul

- **Build/test:** Run a 30–60 minute scripted/free conversation through a phone hotspot in strong and weak-but-usable coverage. Record the phone's carrier and 4G/5G radio access technology/band when exposed, plus RTT/jitter, first-audio latency, reconnects, bytes per minute, phone/device temperature, and audio failures. Force LTE only if the phone/carrier exposes a supported setting; otherwise label the result accurately. Exercise route loss and the proposed sequence: cancel/discard incomplete turn, reconnect TLS/device authentication, reconstruct committed session state, and never replay a side effect.
- **Purchase/decision:** Gate B opens only if Wi-Fi voice is stable, cellular backhaul is acceptable, deployment region is confirmed, and standalone use is still valuable enough to justify cost/size. Otherwise keep hotspot-only and document why.
- **Why:** This cheaply screens user experience on one phone/carrier/location. It does not validate the target modem's LTE coverage, carrier acceptance, RF, power, GNSS, or embedded failover.
- **Exit evidence:** Comparison table for normal Wi-Fi versus cellular-backed hotspot, route/session trace, unresolved target-modem risks, and a signed Gate B verdict.

### Day 14 — Conditional cellular order

- **Build/test:** Recheck target carrier bands/model listings, seller stock, return policy, SIM/service terms, supplied antenna list, and expected data volume. Confirm that the current package includes one LTE MAIN and one GNSS antenna, then get seller confirmation for a compatible LTE AUX/diversity antenna and an adequately powered documented 5 V HAT supply/cable.
- **Purchase/decision:** If Gate B passed, order one returnable [SIM7600G-H HAT](https://www.waveshare.com/product/iot-communication/sim7600g-h-4g-hat.htm), one compatible AUX LTE antenna, and **one** low-cost SIM path—Soracom plan-US for a US test or a direct-carrier SIM, not both. Do not commit to a nonrefundable/high-cost plan before reading the received IMEI. Acquire a USB meter only for average energy and arrange access to a bandwidth-appropriate scope plus probe/shunt or power analyzer for modem-rail transients. Otherwise buy nothing.
- **Why:** Region, operator, and plan compatibility are part of the component—not paperwork after purchase.
- **Exit evidence:** Country/carrier/model/antenna/power compatibility notes, one chosen service path, instrumentation plan, receipts, or a written no-buy decision.

### Day 15 — Activate and enumerate the modem

- **Build/test:** With MAIN and AUX LTE antennas connected before power, use the documented 5 V HAT input from a source/cable with adequate margin. On a Linux development host over USB, identify modem interfaces, record firmware/IMEI securely, check exact model/IMEI acceptance, activate the single selected SIM/APN/service, attach to LTE, resolve DNS, and reach only controlled endpoints first. If using Soracom plan-US, its base allocation is only a tiny telemetry allowance; activate a sufficiently large permitted bundle before voice traffic.
- **Purchase/decision:** Only after acceptance, activate/buy the chosen 5–10 GB-equivalent service for one test month. Do not order production modules or more antennas. Resolve rejection with seller/carrier while return windows remain open.
- **Why:** Host, SIM, APN, firmware, and radio problems are easier to isolate on Linux than inside the pager.
- **Exit evidence:** Reproducible attach procedure, sanitized command/log transcript, assigned network path, and speed/latency baseline.

### Day 16 — Characterize coverage and reconnect

- **Build/test:** With the vendor-recommended MAIN+AUX configuration, measure RSSI/RSRP/RSRQ/SINR, RTT, attach time, cold boot, weak-signal behavior, cell change, and reconnection across several indoor/outdoor locations. Power off before connecting/disconnecting antennas. Use natural coverage or expert-controlled attenuation/shielding for weak-signal work—never transmit into an open MAIN port.
- **Purchase/decision:** Buy no antenna beyond the documented MAIN/AUX/GNSS setup until a controlled result defines a different need.
- **Why:** A single successful speed test says little about a mobile conversational product.
- **Exit evidence:** Location/test matrix and a ranked list of failure modes.

### Day 17 — Run realtime voice over standalone LTE

- **Build/test:** Route the established gateway voice workload through the Linux/USB modem baseline for 30–60 minutes. Measure data in each direction, p50/p95 first-audio latency, jitter-buffer behavior, cancellation, reconnects, and carrier NAT/session behavior. Label this as a modem/network baseline, not embedded integration.
- **Purchase/decision:** Select a provisional monthly data assumption from measured bytes/hour. Reject ultra-low-data plans that throttle or prohibit the workload.
- **Why:** Raw PCM arithmetic and codec claims are not a bill; actual protocol overhead, silence, retries, and tools matter.
- **Exit evidence:** LTE versus hotspot/Wi-Fi report and projected light/medium/heavy monthly data.

### Day 18 — Prove embedded modem ownership, power, and heat

- **Build/test:** Connect the modem to the intended ESP32-S3 path and prove one exact transport (for example, high-rate UART/PPP with hardware flow control or a supported USB-host network class), including USB host/device ownership, independent programming/recovery, reset/power sequencing, compression/throughput, TLS, CPU/RAM, reconnect, and simultaneous face/I²S audio. A 115,200-baud UART cannot carry 384 kbit/s PCM. Separately measure average input energy and modem-rail transient current with bandwidth-appropriate instrumentation during uplink, weak signal, and reconnect; record temperatures against predefined datasheet-derived abort limits. Use the HAT's documented 5 V source—do not feed 3.4–4.2 V into its 5 V input or assume a laptop/thin cable/slow meter preserves bursts.
- **Purchase/decision:** Do not select the final battery and do not freeze a carrier if the embedded transport, USB roles, peak capture, supply margin, or thermal test is unresolved. If ESP32-S3 cannot own the path, reopen the compute architecture rather than adding an unbudgeted Linux companion.
- **Why:** Linux enumeration proves the modem, not the pager host. Host feasibility, brownouts, and heat constrain compute, interface, regulator, connector, battery, PCB, and enclosure together.
- **Exit evidence:** Working embedded encrypted voice path under concurrent load; interface/USB/debug decision; reset/reconnect trace; bandwidth/CPU/RAM numbers; scope/power-analyzer transient and average-energy traces; thermal log; preliminary rail requirements. If fast instrumentation is unavailable, mark peaks unverified and keep Gate C closed.

### Day 19 — Decide whether GNSS earns space

- **Build/test:** Test the SIM7600 GNSS outdoors, near a window, and indoors; record cold/warm time-to-fix, current cost, accuracy, and antenna coexistence. Write one concrete user flow that would use it safely.
- **Purchase/decision:** Default decision is omit/disable GNSS. Add a separate MAX-M10-class receiver only in a later task if the feature value and modem result justify it.
- **Why:** “Optional GPS” still costs antenna area, energy, privacy work, and certification complexity.
- **Exit evidence:** GNSS experiment plus keep/omit ADR proposal.

### Day 20 — Connectivity architecture freeze

- **Build/test:** Review voice, network, data, embedded-host, USB-role/debug, power, thermal, carrier, region, GNSS, and reconnect evidence. Prove warm route loss reaches an authenticated idle session within 15 seconds; separately measure cold attach. Freeze one exact modem transport, flow-control/reset/power interface, and no-replay session policy. Either select an exact compact replaceable modem board or label revision A LTE as externally tethered to the 56 × 65 mm-class HAT; use the selected vendor board's documented antenna connectors rather than inventing a carrier RF path.
- **Purchase/decision:** Confirm Wi-Fi preferred plus modular LTE failover, or document a different evidence-based outcome. Purchase no full-5G or bare LGA module.
- **Why:** PCB work needs a proven host role, transport, session transition, and mechanical module—not interchangeable “USB/UART” labels or an enclosure assumption around a bench HAT.
- **Exit evidence:** Updated ADRs, interface control document, and remaining-risk register.

## Milestone 4 — Turn measurements into product geometry and a battery decision

### Day 21 — Build full-scale volume models

- **Build/test:** Make 95 × 60 × 30 mm and ~80 × 56 × 26 mm paper/foam blocks with actual compute/display/audio/battery mock volumes. Do not pretend the 56 × 65 mm-class SIM7600 HAT fits: model LTE as externally tethered unless Day 20 selected an exact compact replaceable board, in which case use its confirmed STEP/dimensions. Test one-hand hold, pocketing, lanyard, clip, button reach, and screen readability with several hand sizes if possible.
- **Purchase/decision:** Spend only on inexpensive foam/paper/adhesive already available; do not order a cosmetic print yet.
- **Why:** CAD without embodied scale hides thickness, finger occlusion, connector access, and assembly order.
- **Exit evidence:** Photos, dimensions, grip notes, and selected provisional envelope.

### Day 22 — Build the acoustic/mechanical layout mule

- **Build/test:** Use the discrete relocatable mic/amp/speaker and external GPIO button ordered after Day 10 to trial speaker cavity/grille, gasket, mic port position, separation, and top-button feel in temporary safe enclosures. The CoreS3's fixed ports/cavity cannot validate new product geometry. Measure playback rattle, capture level, self-echo, hand occlusion, table effects, and safe volume; never ground either bridge-tied MAX98357A speaker output.
- **Purchase/decision:** If compatibility stopped the Day 10 order, resolve the exact GPIO/I²S/power issue and order a compatible discrete set now, then take a shipping pause. Do not freeze audio layout from the integrated CoreS3 alone. Enforce an amplitude limit so a 5 V amp cannot overdrive a 1 W test speaker.
- **Why:** A relocatable acoustic mule is required because port spacing, cavity, gasket leakage, and control placement determine whether later AEC and gain settings have usable inputs.
- **Exit evidence:** Layout comparison, chosen speaker/mic zones, and AEC risk assessment.

### Day 23 — Close the power budget and choose a battery architecture

- **Build/test:** Combine measured device/audio/network/modem active and sleep modes into defined active/mixed-standby duty-cycle profiles, recording brightness, turns/hour, audio duty, route, and modem registration/power state. Include conversion efficiency, peaks, cold/aging margin, cutoff, charge time, and target runtime. Select candidate charger/power-path/regulator/gauge evaluation hardware, then—after any shipping pause—bench-test load steps, charge-and-run/load sharing, thermal limits, cutoff, and recovery. Start with a battery simulator/current-limited source and pouch cell disconnected; verify polarity, charge voltage/current, NTC policy, and load sharing before attaching a protected cell under observation.
- **Purchase/decision:** Only now buy one evaluation set and one traceable protected, tabbed/connectorized candidate cell if the datasheets and test plan pass review. Do not solder directly to a pouch/can. A protected cell without a thermistor still requires external product temperature policy.
- **Why:** Capacity, charger, regulator, and thickness should follow measured load behavior. Putting an unvalidated power circuit directly on revision A converts a debuggable module test into a board-and-battery safety risk.
- **Exit evidence:** Signed power tree/budget and duty profiles, candidate datasheets, bench traces for representative modem load steps/charge-and-run/cutoff/recovery, predefined abort temperatures, safe peak margin, and active/standby estimates.

## Milestone 5 — Design and order the modular carrier

### Day 24 — Capture the carrier schematic

- **Build/test:** Only after Day 23's power gate, draw a four-layer carrier containing the exact validated power path/charger/gauge, exact compute/display/touch/microphone/codec/amplifier/speaker interfaces, physical mute and state-coupled indicator, resolved USB host/device plus independent debug/recovery, exact modular cellular transport, ESD/protection, and current measurement options. Add labeled low-speed test points; use reviewed impedance-safe inline/probe structures rather than ordinary stubs on USB differential pairs or RF.
- **Purchase/decision:** Select parts by exact manufacturer number, lifecycle, authorized availability, package risk, and alternates. Do not order boards or bulk parts.
- **Why:** A complete BOM and power intent are prerequisites for useful review and quotation.
- **Exit evidence:** ERC-clean schematic, power tree, interface table, preliminary BOM, and open-issue list.

### Day 25 — Review the electrical design adversarially

- **Build/test:** Review every voltage, boot strap, connector direction, polarity, protection path, regulator transient/thermal limit, charge condition, USB role, audio clock, and modem sequence. Simulate only the power/analog questions the model can represent.
- **Purchase/decision:** Replace risky/no-stock parts on paper; avoid paying for a board to discover a searchable datasheet error.
- **Why:** ERC checks syntax, not engineering intent.
- **Exit evidence:** Closed review checklist, annotated datasheets/reference circuits, and zero unexplained ERC waivers.

### Day 26 — Lay out and mechanically co-design the board

- **Build/test:** Place from enclosure, antenna, speaker cavity, mic path, buttons, USB, battery, and assembly order. Preserve a ground plane, route current loops and high-speed lines correctly, add keep-outs and appropriate low-speed/impedance-safe probe structures, import exact STEP models, and print the board 1:1.
- **Purchase/decision:** Buy nothing. Choose the stack-up only against a named fabricator capability and live constraints.
- **Why:** Layout is an electrical/mechanical design, not automatic wire packing.
- **Exit evidence:** DRC-clean layout, 3D interference review, 1:1 physical overlay, and peer/RF checklist.

### Day 27 — Run DFM and compare landed quotes

- **Build/test:** Export and independently inspect Gerber/drill/BOM/CPL/assembly files. Request quotes from JLCPCB plus at least one of PCBWay, MacroFab, or Seeed. Ask about substitutions, stencil/setup, inspection/X-ray, electrical test, shipping/duty, and lead time.
- **Purchase/decision:** Select a supplier only on total landed cost and risk. Do not let a $2 bare-board promotion hide PCBA costs.
- **Why:** Supplier capability and substitutions are part of the design.
- **Exit evidence:** Manufacturer DFM feedback resolved, comparable quote table, exact released source tag/hash, and purchase recommendation.

### Day 28 — Gate C order

- **Build/test:** Conduct a final readiness review: exact compute/display/touch/audio/power/connectors and USB/debug roles are frozen; one embedded modem transport and its external/compact mechanical status are explicit; measured load steps trace to validated power choices; no unresolved safety/RF/mechanical blocker remains; test procedure exists; and all order previews match the release.
- **Purchase/decision:** If Gate C passes, order 5–10 assembled four-layer carriers plus two bare boards and only their required prototype parts. Order one low-cost enclosure print only if CAD uses confirmed component models. If it fails, order nothing and schedule the missing experiment.
- **Why:** Small quantity supports rework/yield learning without turning revision A into inventory.
- **Exit evidence:** Signed gate checklist, saved order configuration/receipt, released manufacturing package, or explicit no-buy remediation.

### Shipping pause — no project-day charge

Use supplier lead time to improve tests and fixture software. Do not quietly redesign the ordered revision; branch changes for the next spin and preserve the release exactly.

## Milestone 6 — Bring up, verify, and decide the next spin

### Day 29 — Build diagnostics and the fixture before boards arrive

- **Build/test:** Create a deterministic test image/procedure for rail checks, board ID, buttons/mute LED, display/audio buses, USB, modem interface, current, and serial-numbered results. Separate production code under `src/` from fixture/developer code under `tools/`.
- **Purchase/decision:** Buy only low-cost pogo pins/cables/adapters called out by the reviewed test plan.
- **Why:** Testability designed before failure produces faster, less destructive bring-up.
- **Exit evidence:** Dry-run test sequence on the mule and a results schema.

### Day 30 — Incoming inspection and unpowered tests

- **Build/test:** Photograph packaging/boards, reconcile BOM substitutions, inspect polarity/joints/bridges under magnification, measure shorts/resistance from each rail to ground, and compare one bare board to files.
- **Purchase/decision:** Do not power a suspicious board. Open supplier issues within the claim window with evidence.
- **Why:** Current limiting cannot protect every reversed or shorted component.
- **Exit evidence:** Serialized inspection sheet and disposition for each board.

### Day 31 — Incremental powered bring-up

- **Build/test:** Set datasheet-derived abort limits and begin with the pouch cell disconnected. Use a battery simulator/current-limited bench source; validate polarity, rails, charge voltage/current, NTC behavior, load sharing, and sequencing one at a time. Then add reset/boot, independent debug/recovery, compute, controls, display, audio, and finally the modular modem. Attach a protected cell only after the charger path passes and under attended observation. Record rework rather than hiding it.
- **Purchase/decision:** Replace only diagnosed parts. Avoid broad reorders until common-mode versus one-board faults are known.
- **Why:** Incremental power localizes faults and protects scarce assemblies.
- **Exit evidence:** At least two boards reach the same documented baseline or a root-caused blocking defect is recorded.

### Day 32 — Run integrated voice/network soak

- **Build/test:** Run the acceptance conversation over Wi-Fi/hotspot and, if fitted, LTE. Exercise mute, cancellation, AP loss/failover, gateway restart, low battery, OTA rollback, and one-hour voice/animation soak.
- **Purchase/decision:** Buy nothing. Treat unstable behavior as data for the next spin, not a reason to add unreviewed modules.
- **Why:** Integration failures often appear only with concurrent radio, display, audio, and power loads.
- **Exit evidence:** Pass/fail matrix, latency/queue/reconnect/current traces, and defects with reproduction steps.

### Day 33 — Mechanical, battery, and thermal field trial

- **Build/test:** In the safe prototype enclosure, run desk/hand use, speaker/mic occlusion, attended charge/use, low-signal heat, and battery rundown. Do not perform body-worn/pocket LTE transmission until the RF-exposure plan establishes permitted antenna separation; use a fixture at the module/antenna's documented distance. Perform initial controlled short-drop trials with an inert battery mass, never while charging. Inspect after impact and retire any cell with denting, puncture, swelling, torn wrap/pouch, leakage, odor, or abnormal heat.
- **Purchase/decision:** Do not buy a larger battery to conceal efficiency or sleep bugs. Change capacity only through the measured power budget.
- **Why:** A bench-tethered success does not validate a carried product.
- **Exit evidence:** Runtime curve, temperatures, mechanical/acoustic observations, photographs, and safety disposition.

### Day 34 — Product acceptance demonstration

- **Build/test:** Record a reproducible ten-turn demo with idle/listen/think/speak expressions, personality, press-to-interrupt, physical mute, offline/recovery, Wi-Fi/hotspot, and optional LTE. Run the measurable MVP requirements and publish honest misses.
- **Purchase/decision:** Buy nothing. Decide whether the concept merits another EVT spin based on evidence, not video polish.
- **Why:** A shared acceptance script converts a charming prototype into a comparable product iteration.
- **Exit evidence:** Demo video, requirements matrix, test artifacts, known-issues list, and cost snapshot.

### Day 35 — Retrospective and next architecture decision

- **Build/test:** Compare plan versus actual time/cost, identify the largest latency/power/acoustic/RF/manufacturing risks, and rank the next experiments. Update BOM availability and archive receipts/source releases.
- **Purchase/decision:** Choose one next path: revise modular carrier; begin integrated LEXI-R10-class North American RF design with professional review; explore hands-free/AEC; or stop/pivot. Still do not buy 5G unless the LTE evidence opens its gate.
- **Why:** A deliberate decision preserves learning and prevents sunk-cost escalation.
- **Exit evidence:** `retrospective.md`, updated requirement results, new/superseding ADRs, and a narrowly scoped `task_0002` proposal.

## Decision rule for schedule changes

If a day uncovers a safety, credential, power-integrity, region/carrier, or irreversible manufacturing uncertainty, stop the dependent purchase and add the smallest experiment that resolves it. If a day merely exposes normal software defects, fix and measure them without expanding the product scope. The objective is not to finish on Day 35 at any cost; it is to finish with trustworthy evidence and a safe next decision.
