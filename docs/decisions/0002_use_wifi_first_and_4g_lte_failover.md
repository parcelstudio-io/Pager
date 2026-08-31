# ADR 0002 — Use Wi-Fi first and 4G LTE failover

Status: Accepted for EVT  
Date: 2026-08-30

## Context

The companion should work away from home. Available options include a phone hotspot, LTE-M/Cat 1bis/Cat 4, conventional 5G, and emerging 5G RedCap. Standalone cellular introduces carrier bands, SIM/APN activation, antennas, burst power, heat, drivers, RF coexistence, recurring data cost, operator approval, and regulatory work.

Realtime compressed voice needs reliable latency and modest sustained throughput. It does not inherently need multi-hundred-megabit 5G.

## Decision

Prefer Wi-Fi and screen mobile-backhaul experience through a phone hotspot first; this does not validate the target modem or even guarantee that the phone used LTE rather than 5G. If the experience passes, evaluate standalone 4G with a SIM7600G-H USB/Linux bench mule, then prove one exact modem-to-ESP32-S3 transport under simultaneous encrypted voice, audio, and display load before freezing a carrier. If ESP32-S3 cannot own that path, reopen the compute architecture instead of silently adding a Linux companion.

Treat LTE Cat 1bis as the leading production-size direction for North America, subject to region, carrier, supply, current manufacturer documentation, and measured performance. GNSS is an optional by-product of the modem evaluation, not a committed feature.

Network failover is an application-session transition, not transparent interface switching. On link loss the device marks itself reconnecting, cancels and discards the incomplete turn, drains media, applies hysteresis before selecting a route, performs new DNS/TLS/device authentication, creates or reconstructs a session from committed server state, and returns to idle. It never automatically replays a side-effecting turn. Warm failover and cold modem attach have separate latency/power targets.

Defer conventional 5G and 5G RedCap purchasing.

## Why

- Wi-Fi isolates the core voice and interaction risks.
- A hotspot cheaply tests the experience over that phone, carrier, radio technology, and location without embedding a modem.
- LTE throughput comfortably exceeds compressed voice needs while reducing antennas, board area, heat, and cost relative to full 5G.
- A separate modem mule makes current, signal, data volume, and reconnection observable before a PCB commitment.

## Consequences

- The earliest portable demo depends on a phone or known Wi-Fi.
- Standalone connectivity arrives after, not before, a useful companion experience.
- The product requires a network manager with reachability checks, hysteresis, bounded retry/backoff, route/session reconstruction, and explicit face/turn transitions.
- Linux enumeration is only a modem baseline. The exact embedded host/device role, transport, flow control, debug/recovery path, throughput, CPU/RAM load, power sequencing, and reconnect behavior must pass before carrier freeze.
- The final regional SKU cannot be selected globally by a single US-centric BOM.
- Pre-certified radio modules reduce but do not eliminate host, carrier, RF exposure, and coexistence testing.

## Amendment — 2026-08-31: Starlink is a conditional carrier path, not the MVP modem

There are two materially different Starlink paths. A standard Starlink terminal is a separate powered dish/router; the pager could use its Wi-Fi like any other external network, but the terminal is not an embedded pager radio. Starlink Direct to Cell is carrier-integrated cellular coverage. Starlink's current business page advertises IoT service through participating mobile operators in approved countries and compatibility with off-the-shelf 3GPP Release-10-or-newer Cat-1, Cat-1 bis, and Cat-4 modems that support the operator's bands.

Direct to Cell is therefore a plausible **conditional coverage path**, not a generic `Starlink` APN or a reason to change the MVP architecture. Before treating it as supported, Gate B must verify the exact country, partner carrier, SIM/plan, modem SKU and bands, device acceptance, IP behavior, permitted data use, latency/jitter, and session stability. The physical-SIM Wi-Fi/LTE plan remains the baseline; a partner-carrier Direct-to-Cell trial may be added after those checks. See [Starlink Direct to Cell](https://www.starlink.com/business/direct-to-cell) and the detailed [companion-app and sync architecture](../design/0002_companion_app_and_sync_architecture.md).

## Amendment — 2026-08-31: cellular configuration surface and eSIM posture

[ADR 0007](0007_use_companion_app_and_cloud_history_sync.md) defines how "4G information" is configured: signed public carrier-preset metadata may ship/download normally, while the companion app writes any user-entered/custom APN, derived profile, optional PDP authentication, IP type, roaming, and enable state directly to the pager over encrypted BLE. Those custom values and credentials never transit or persist in Mochi's cloud. Use a physical, activated, PIN-disabled SIM for MVP. Supporting a SIM PIN later requires secure persistence for cold boot; it cannot truthfully be described as "use once and forget." Consumer SGP.22 eSIM is out of scope, while SGP.32 IoT eSIM remains a later modem/carrier-management option.

## Amendment — 2026-08-30: live-session failover semantics

[ADR 0006](0006_use_button_started_full_duplex_sessions.md) replaces the original single-turn interaction model. For a live session, “cancel and discard the incomplete turn” now means: show amber reconnecting, close microphone uplink, discard raw/uncommitted input and every queued output generation, and never buffer speech across the outage. Reconstruct only committed conversation items and settled tools. Capture can reopen only after authentication and cyan `LIVE` return inside a maximum 10-second grace period from detected route loss; expiry clears live intent and requires a fresh press even if connectivity later returns. Speech and side effects are never replayed automatically.

## Revisit when

Revisit if measured LTE latency/coverage fails requirements, an operator sunset horizon threatens launch lifetime, a high-volume transfer use case appears, a customer requires 5G, RedCap supply/certification matures, or target geography changes.
