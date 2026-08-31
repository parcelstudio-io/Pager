# ADR 0003 — Use a secure Realtime gateway

Status: Accepted for EVT  
Date: 2026-08-30

## Context

The pager needs low-latency bidirectional audio with OpenAI Realtime, tool calls, optional memory, observability, and revocable device access. Putting a standard provider API key in extractable MCU firmware would expose the project account. Direct device-to-provider integration also couples firmware to a changing event protocol and makes policy, rate limits, model migration, and multi-device support harder.

## Decision

Connect the device to our secure backend using an authenticated TLS WebSocket and a revocable per-device identity. The backend opens a server-to-server Realtime WebSocket, owns the standard OpenAI API credential, translates device audio/events, enforces tool policy and limits, records latency/health metrics, and connects to opt-in memory services.

Start development with configuration-selectable `gpt-realtime-2.1-mini`; compare important conversations with `gpt-realtime-2.1`. Never hardcode a permanent model name in device firmware.

## Why

- OpenAI documents WebSocket as the server-to-server transport and says standard API keys belong on a secure backend.
- A gateway keeps provider credentials and unrestricted tools off a physically accessible device.
- It gives us one place for per-device authentication, quotas, schema validation, safety policy, codec normalization, tracing, and rollouts.
- It lets firmware maintain a small stable protocol while provider APIs and model choices evolve.

## Consequences

- The service adds one network hop and an operational dependency; its latency must be measured.
- We own gateway availability, cost controls, credential rotation, observability, and privacy controls.
- Device and server need versioned event schemas and backpressure behavior.
- Long-term memory is a separate opt-in service. Raw audio is not retained by default.
- Direct WebRTC with short-lived client credentials remains a possible later path for richer clients, not the first MCU design.

## Revisit when

Revisit if the added hop prevents latency targets, provider-supported constrained-device authentication removes the key risk, WebRTC becomes practical on the selected embedded platform, or offline/local inference becomes a product requirement.

## Primary references

- [Realtime API with WebSocket](https://developers.openai.com/api/docs/guides/realtime-websocket)
- [`gpt-realtime-2.1-mini`](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini)
- [`gpt-realtime-2.1`](https://developers.openai.com/api/docs/models/gpt-realtime-2.1)

