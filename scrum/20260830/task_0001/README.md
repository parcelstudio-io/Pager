# Task 0001 — Design and validate the Mochi Pager EVT path

Start date: 2026-08-30  
Status: Planned  
Owner: Project team

## Outcome

Produce an evidence-backed EVT that demonstrates a cute local face, push-to-talk voice conversation through our secure OpenAI Realtime gateway, Wi-Fi and phone-hotspot portability, physical privacy behavior, and a separately measured standalone-LTE option. End with either a reviewed modular-carrier PCB order and validated assembled boards or a documented gate failure with the specific next experiment.

## In scope

- Product interaction and expression system.
- ESP32-S3 interaction mule.
- Gateway and OpenAI Realtime integration.
- Wi-Fi, hotspot, and conditional standalone 4G tests.
- Audio, latency, data, power, thermal, and reconnect measurements.
- Paper/foam and printed enclosure iterations.
- Conditional four-layer modular carrier PCB.
- Education, purchasing rationale, and ADR trail.

## Out of scope for this task

- Full 5G integration.
- Injection-mold tooling or production certification.
- Bare cellular LGA routing on the first PCB.
- Always-listening launch behavior or guaranteed full-duplex AEC.
- Camera features, GPS-backed product features, and bulk component orders.
- Production launch, consumer data-policy sign-off, or carrier certification completion.

## Purchase ceilings before re-approval

- Gate A: one CoreS3 Lite ($44.90 observed), cable ($5–10), tax/shipping.
- Acoustic mule, only after Day 10's embedded voice loop: one compatible discrete digital mic ($8.95 observed), I²S amp ($5.95), speaker ($1.95), tactile control, and safe prototyping board/connectors; target $20–40 plus shipping after pin/power review.
- Gate B, only after Day 13: one SIM7600G-H HAT ($97.99 observed), one compatible AUX/diversity LTE antenna (live quote), and **one** SIM/service path. Order a low-cost SIM first, read/check the received IMEI, then activate one month of suitable 5–10 GB-equivalent data. Soracom and direct-carrier plans are alternatives, not combined purchases.
- Instrumentation: a $15–30 USB meter may be bought for average energy only. Gate C peak evidence requires access to a bandwidth-appropriate oscilloscope/current probe or shunt/power analyzer and an adequate documented 5 V HAT supply; quote, borrow, or rent before purchase if these are not already available.
- Gate C: no PCB/enclosure order until a live quote, BOM, measured power budget, and DFM review are attached to the daily log. Quote rather than assume cost.
- 5G and bare production cellular modules: $0 in task 0001.

All prices were observed on 2026-08-30 and are not purchase guarantees. Recheck price, lead time, return policy, region, carrier/IMEI acceptance, and shipping at checkout.

## Success evidence

- A recorded ten-turn conversation with responsive expression states, output interruption, physical mute, and recovery after network loss.
- At least 50 timed Wi-Fi turns and a 30–60 minute phone-hotspot session.
- If Gate B opens: standalone LTE attach/reconnect, signal, data, average/peak current, temperature, GNSS trial, and one exact ESP32-S3 modem transport under concurrent encrypted voice/display/audio load.
- Current/energy measurements supporting the battery decision.
- Mechanical volume model and acoustic layout observations.
- Reviewed schematic/layout/DFM evidence before any PCB purchase.
- Incoming inspection and bring-up records for any ordered PCBs.
- New ADRs for decisions that changed during execution.

## Planning sources

- [Product concept](../../../docs/design/0001_mochi_pager_product_concept.md)
- [MVP requirements](../../../docs/requirements/0001_mvp_requirements.md)
- [Component research](../../../docs/research/0001_component_sources_and_bom.md)
- [Daily plan](daily_plan.md)
