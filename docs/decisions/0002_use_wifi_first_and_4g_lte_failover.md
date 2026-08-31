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

## Revisit when

Revisit if measured LTE latency/coverage fails requirements, an operator sunset horizon threatens launch lifetime, a high-volume transfer use case appears, a customer requires 5G, RedCap supply/certification matures, or target geography changes.
