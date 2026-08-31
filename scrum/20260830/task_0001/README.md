# Task 0001 — Design and validate the Mochi Pager EVT path

Start date: 2026-08-30  
Status: Planned  
Owner: Project team

## Outcome

Produce an evidence-backed EVT that demonstrates a cute local face with a sliding live caption and a button-started, visibly live, full-duplex voice conversation through our secure OpenAI Realtime gateway. Inside the live session, capture and playback are concurrent and speech interrupts assistant output without a per-turn press; a second button press returns to private idle. The shipping interaction exposes exactly two physical controls: one illuminated conversation start/stop button and one latching power on/down switch. Also validate the hybrid companion architecture: foreground BLE for secure nearby provisioning/recovery, the gateway as the authority for account binding, non-secret settings, and opt-in history, Wi-Fi and phone-hotspot portability, and a separately measured standalone-LTE option. End with either a reviewed modular-carrier PCB order and validated assembled boards or a documented gate failure with the specific next experiment.

## In scope

- Product interaction and expression system, including the sliding caption (PR-07).
- ESP32-S3 interaction mule.
- Gateway and OpenAI Realtime integration.
- Companion-app Track B: foreground BLE provisioning (Security 2 with downgrade rejection), secure claiming/recovery, BLE/local-only custom Wi-Fi/APN/authentication secrets, cloud-delivered signed public carrier presets, binding-scoped revisioned configuration, and opt-in history synchronization (ADR 0007 and the companion-app requirements).
- Wi-Fi, hotspot, and conditional standalone 4G tests.
- Audio, latency, data, power, thermal, and reconnect measurements.
- Paper/foam and printed enclosure iterations.
- Conditional four-layer modular carrier PCB.
- Education, purchasing rationale, and ADR trail.

## Out of scope for this task

- Full 5G integration.
- Injection-mold tooling or production certification.
- Bare cellular LGA routing on the first PCB.
- Background always-listening/wake-word launch behavior or a production-grade guarantee that AEC works in every acoustic environment. Functional session-scoped full duplex is in scope and gated.
- A shipping/user-facing push-to-talk or half-duplex mode. Half-duplex may be measured only in developer fixtures to diagnose an acoustic failure; it fails Gate A rather than becoming a third interaction mode.
- General-purpose BLE pairing, audio, or accessory support; BLE is reserved for foreground commissioning/recovery in this EVT.
- Camera features, GPS-backed product features, and bulk component orders.
- Production launch, consumer data-policy sign-off, or carrier certification completion.

## Purchase ceilings before re-approval

- Gate A: one CoreS3 Lite ($44.90 observed), cable ($5–10), tax/shipping.
- Acoustic mule, only after Day 8's concurrent local audio baseline: one compatible discrete digital mic ($8.95 observed), I²S amp ($5.95), speaker ($1.95), illuminated conversation control, latching power switch, and safe prototyping board/connectors; target $20–40 plus shipping after pin/power/reference-path review.
- Gate B, only after Day 13: one SIM7600G-H HAT ($97.99 observed), one compatible AUX/diversity LTE antenna (live quote), and **one** SIM/service path. Order a low-cost SIM first, read/check the received IMEI, then activate one month of suitable 5–10 GB-equivalent data. Soracom and direct-carrier plans are alternatives, not combined purchases.
- Instrumentation: a $15–30 USB meter may be bought for average energy only. Gate C peak evidence requires access to a bandwidth-appropriate oscilloscope/current probe or shunt/power analyzer and an adequate documented 5 V HAT supply; quote, borrow, or rent before purchase if these are not already available.
- Gate C: no PCB/enclosure order until a live quote, BOM, measured power budget, and DFM review are attached to the daily log. Quote rather than assume cost.
- 5G and bare production cellular modules: $0 in task 0001.

All prices were observed on 2026-08-30 and are not purchase guarantees. Recheck price, lead time, return policy, region, carrier/IMEI acceptance, and shipping at checkout.

## Success evidence

- A recorded live session with at least ten exchanges and no per-turn presses, concurrent capture/playback evidence, a caption that tracks speech and trims on interruption, speech-driven barge-in, explicit button stop, and recovery after network loss. The capture gate and its indicator fail low through reset, crash, bootloader, and OTA paths; hard-off prevents auto-resume and USB/debug/modem back-power.
- A recorded first-boot and recovery walkthrough: foreground Security 2 BLE provisioning with downgrade attempts rejected and no plaintext custom Wi-Fi/APN/authentication secrets in a BLE trace, cloud, durable app storage, or logs; provisioning remains alive through claim and new-recovery-proof acknowledgement; signed public carrier-preset metadata may come from the cloud; and the eight-second power-on boot chord is capture-gated but cannot steal or reclaim an owned pager. Factory bootstrap fails after first claim, every new binding rejects the prior owner's recovery code, and an online app opens claimed-device setup only after authenticated app→gateway authorization; offline setup uses the touchscreen or boot chord. Release/recovery erases local network/cellular credentials, and resale/loss/account-deletion flows handle physical-SIM removal or carrier deactivation explicitly.
- A recorded app synchronization walkthrough: binding-scoped app- and pager-origin `config_revision` conflict/idempotency handling plus default-off history opt-in/inspect/export/delete across two app installations, offline recovery, reinstall/restore, ordered cursor catch-up, and content-free deletion tombstones. It demonstrates expected-version conflicts, `oldest_available_seq` full reconciliation, a device-bound backup-excluded cache, retained-history access after future saving is disabled, derived-memory deletion cascades, and truthful account-deletion behavior across the at-most-24-hour offline authorization lease. Stored history contains only finalized machine transcripts, the assistant prefix known to have been heard (or an interruption marker), sanitized visible tool results, and no raw audio.
- Reviewed privacy copy that distinguishes Mochi-controlled storage from the current provider data-retention policy and does not promise zero provider retention without verified approved controls.
- At least 50 timed Wi-Fi speech segments, a 100-utterance endpoint-correctness corpus, 100 scripted barge-ins, 60 assistant-speaking minutes for false-interruption testing, a 65-minute duplex/provider-renewal soak, and a 30–60 minute phone-hotspot session.
- If Gate B opens: standalone LTE attach/reconnect, signal, data, average/peak current, temperature, GNSS trial, and one exact ESP32-S3 modem transport under concurrent encrypted voice/display/audio load.
- Current/energy measurements supporting the battery decision.
- Mechanical volume model plus measured AEC reference delay, residual echo, double-talk, false-interruption, and acoustic-layout observations.
- Reviewed schematic/layout/DFM evidence before any PCB purchase.
- Incoming inspection and bring-up records for any ordered PCBs.
- New ADRs for decisions that changed during execution.

## Planning sources

- [Product concept](../../../docs/design/0001_mochi_pager_product_concept.md)
- [Companion app and synchronization architecture](../../../docs/design/0002_companion_app_and_sync_architecture.md)
- [MVP requirements](../../../docs/requirements/0001_mvp_requirements.md)
- [Component research](../../../docs/research/0001_component_sources_and_bom.md)
- [Independent verification and corrections](../../../docs/research/0003_independent_verification_and_corrections.md)
- [Full-duplex interaction decision](../../../docs/decisions/0006_use_button_started_full_duplex_sessions.md)
- [Companion app decision](../../../docs/decisions/0007_use_companion_app_and_cloud_history_sync.md)
- [Two physical controls decision](../../../docs/decisions/0008_use_exactly_two_physical_controls.md)
- [Daily plan](daily_plan.md)
