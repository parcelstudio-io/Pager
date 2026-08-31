# Technical decision log

Architecture decision records (ADRs) preserve why a choice was made, its costs, and the evidence that should cause us to revisit it. They prevent later iterations from silently turning old assumptions into facts.

## Rules

- Use the next zero-padded monotonic number: `NNNN_short_title.md`.
- Record one consequential decision per file.
- States are Proposed, Accepted for EVT, Accepted, Superseded, or Rejected.
- Never edit history to make it look inevitable. Add consequences as they emerge and create a new ADR when reversing a decision.
- A superseding ADR links to the old record; the old record links forward to the new one.
- Prices, stock, APIs, carrier support, and regulations are time-sensitive evidence and always include an observation date.

## Index

1. [Use an ESP32-S3 integrated interaction mule](0001_use_esp32s3_interaction_mule.md)
2. [Use Wi-Fi first and 4G LTE failover](0002_use_wifi_first_and_4g_lte_failover.md)
3. [Use a secure Realtime gateway](0003_use_secure_realtime_gateway.md)
4. [Start with push-to-talk and BLE](0004_start_with_push_to_talk_and_ble.md)
5. [Build a modular carrier before integrated RF](0005_build_modular_carrier_before_integrated_rf.md)

