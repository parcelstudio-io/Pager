# 0002 — Shared-conversation and prototype-video observations

Status: Source audit complete  
Observed: 2026-08-30

## Source boundary

The public [shared ChatGPT post](https://chatgpt.com/s/t_6a94cde1d71c81918d099f21601cf21b) exposes only one assistant answer under the title “Explain ESPHome.” It does not expose the preceding user messages or earlier assistant answers. The visible answer proposes a **95 × 60 × 30 mm** enclosure, calculates a 171,000 mm³ bounding-box volume, and describes it as a compact power bank/deck of cards rather than a tiny phone.

This repository uses 95 × 60 × 30 mm as the maximum envelope. It does not attribute any other product or architecture choice to the unavailable conversation.

An independent re-check on 2026-08-30/31 could confirm the page title (“ChatGPT - Explain ESPHome”) but not the body, which renders only for logged-in browsers. Because this link is the sole source for the maximum envelope — and the guide's firmware link and AliExpress part links are similarly login-gated — capture a text/screenshot snapshot of each into `docs/research/assets/` before they rot.

## What the video actually demonstrates

The reference is Huy Vector's [“[Satisfying] Building a Tiny Pocket AI Assistant”](https://www.youtube.com/watch?v=25RGnr407PM) (published 2026-08-27; verified 2026-08-31 via the watch page and oEmbed) and companion [build guide](https://www.huyvector.org/robots-kinetic/pocket-ai-assistant). The visible/claimed behavior includes:

- natural voice conversation with a cheeky configurable personality;
- answers, jokes, weather, music, multilingual behavior, and ESPHome tool actions;
- Wi-Fi setup through a temporary access point/captive portal (the upstream firmware family documents this as “Wi-Fi provisioning through hotspot or BluFi”);
- a rechargeable handheld build;
- two large cyan eyes, blink/squint animation, and a scrolling line for listening state, recognized speech, tool/action names, and replies;
- a physical slide power switch and otherwise voice-first interaction.

The footage does **not** clearly show a smiling mouth. Its charm primarily comes from eye motion, compact status text, and personality. Mochi likewise uses only two large eyes, with no mouth or lips. The footage also does not prove that capture remains usable while the speaker is playing or that speech can automatically interrupt output; Mochi's button-started full-duplex session is a new design proposal, not a copied observation.

The guide text lists an ESP32-C3, OLED, microphone module, a “98357BGA”-labelled amplifier entry, phone speaker, battery, Type-C charge module, mini slide switch, copper wire, and brass tube. The ESP32-C3 and 0.96-inch OLED are stated directly in the video description; the diagram, markings, and video appear to resolve the rest to an ESP32-C3 SuperMini, INMP441-class I²S microphone, MAX98357A-class I²S amplifier, and 14250 lithium-ion cell (the guide's AliExpress affiliate links are login-gated; resolved item IDs 1005009170035050 for the OLED and 1005005501929649 for the battery are recorded here for later manual confirmation). The build appears roughly 45–50 mm wide and in the low-30-mm height range when scaled from known parts, but that is only an image-based estimate—not a published dimension.

## Cloud and firmware distinction

The reference is configured through xiaozhi.me — an attribution that comes from the video description (“AI Configuration: Xiaozhi.me”), not the build-guide page, which links only web.esphome.io. The upstream [XiaoZhi ESP32 project](https://github.com/78/xiaozhi-esp32) (MIT-licensed, actively pushed as of 2026-08-30, ~29.5k stars) documents its own service/model paths — Wi-Fi, wired Ethernet, USB RNDIS, and ML307/EC801E/NT26 Cat.1 4G hardware, with xiaozhi.me as the default server — but the Huy video is not evidence of OpenAI Realtime or ChatGPT integration.

The upstream README also states that “AEC-capable hardware supports realtime full-duplex interaction,” i.e. it ties realtime full duplex to acoustic echo cancellation and lists no such capability for a plain I²S microphone/amplifier path. The reference build's ESP32-C3 with an INMP441-class microphone and MAX98357A-class amplifier has no hardware AEC, and neither the guide nor the footage shows interruption while the speaker plays, so the reference build should be presumed half-duplex (checked 2026-08-31). This independently supports [ADR 0006](../decisions/0006_use_button_started_full_duplex_sessions.md)'s premise that full duplex is Mochi's engineering risk to prove, not a property the reference demonstrates. The guide distributes a compiled firmware image (hosted as a Google Drive download) and a browser-flashing path via web.esphome.io; it does not identify corresponding source or a license for Huy's binary. Treat that binary as untrusted reference-only, do not use it on a trusted network or redistribute it, and do not infer its rights from the upstream project's MIT license. The hosted-service UI shown in the video also describes an “Open Source” tier as learning/noncommercial and warns that commercial features may require licensing; this is service UI evidence, not a legal conclusion about upstream firmware.

Therefore Mochi borrows interaction patterns, not firmware or service architecture. Our implementation uses an independently built device protocol and a secure gateway to the OpenAI API.

## Wiring clues, not product schematics

The guide's diagram appears to show:

- OLED I²C clock/data on ESP32-C3 GPIO20/GPIO21;
- microphone I²S clock/word-select/data on GPIO2/GPIO1/GPIO8;
- shared I²S clocks to the MAX98357A and output data on GPIO3;
- microphone at 3.3 V and amplifier on a nominal 5 V path;
- battery/switch powering the board and grounds joined through the brass structure.

These clues can reproduce the art prototype but should not be copied blindly. Module variants, pin boot functions, supply labels, charger protection, and current paths must be verified against exact schematics/datasheets.

## Gaps relative to Mochi

The reference does not validate standalone cellular, 5G, GNSS, Bluetooth behavior, local-memory capacity, OpenAI connectivity, security, credential storage, OTA, privacy, battery life, charge time, current peaks, thermals, far-field capture, echo cancellation, interruption quality, source licensing, weather resistance, drop safety, or manufacturing yield.

Its exposed brass-tube/copper-wire structure is a compelling sculpture but not a pocket-safe enclosure. In particular, the footage appears to remove the cell's outer covering and use exposed metal as a shared conductor. Mochi must keep cell insulation intact, use a protected/tabbed or approved connectorized cell, add a qualified charger/protection/power path and strain relief, and keep the exterior electrically isolated. Antennas require deliberate clearance from metal, battery, display, speaker magnet, and the user's hand.

## Design takeaways retained

- Make the face, not application chrome, the default screen.
- Two expressive eyes and irregular blink timing are enough to establish life.
- Keep a small text/status channel for accessibility and honest system state.
- Let personality do meaningful character work instead of overanimating every response.
- Preserve simple phone-assisted provisioning.
- Replace the fragile open sculpture with a rounded, insulating, serviceable enclosure and a physical privacy control.

These observations informed the [Mochi product concept](../design/0001_mochi_pager_product_concept.md); technical commitments are independently recorded in the [ADR log](../decisions/README.md).
