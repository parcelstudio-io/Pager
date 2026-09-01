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
4. [Start with push-to-talk and BLE — superseded](0004_start_with_push_to_talk_and_ble.md)
5. [Build a modular carrier before integrated RF](0005_build_modular_carrier_before_integrated_rf.md)
6. [Use button-started full-duplex conversation sessions](0006_use_button_started_full_duplex_sessions.md)
7. [Use a companion app with BLE provisioning and opt-in cloud history sync](0007_use_companion_app_and_cloud_history_sync.md)
8. [Use exactly two physical controls](0008_use_exactly_two_physical_controls.md)
9. [Use server-owned contextual prompt assembly](0009_use_server_owned_contextual_prompt_assembly.md)
10. [Use local hierarchical expression arbitration](0010_use_local_hierarchical_expression_arbitration.md)
11. [Integrate LEXI-R10401D and a camera on the first carrier — rejected for Rev A](0011_integrate_lexi_r10401d_on_four_layer_carrier.md)
12. [Use a modular North-American Cat 1bis Click for Rev A — superseded](0012_use_modular_north_american_cat1bis_click_for_rev_a.md)
13. [Use the Walter family for the Rev A EVT carrier](0013_use_walter_family_for_rev_a_evt.md)

The implementation contract shared by ADRs 0002, 0003, 0007, 0008, and 0009 is consolidated in [Companion app and synchronization architecture](../design/0002_companion_app_and_sync_architecture.md).
