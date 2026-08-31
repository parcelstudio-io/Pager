# ADR 0005 — Build a modular carrier before integrated RF

Status: Accepted for EVT  
Date: 2026-08-30

## Context

A custom PCB is needed for product geometry, power, controls, testability, and repeatability. Integrating a fine-pitch cellular LGA on the first board would simultaneously introduce RF transmission lines, antenna matching, USB differential routing, multi-amp transient power, SIM ESD, modem firmware, assembly yield, regional SKU, certification, and supply-chain risk.

## Decision

The first custom board is a four-layer modular carrier. It contains the bench-validated power/charger/fuel-gauge architecture, exact compute-module connections, exact audio/display/control connectors or circuits, hardware mute, and an independent recovery/debug path. It has accessible test points on ordinary nets; USB differential pairs and future RF paths use impedance-safe inline/probe structures rather than casual stubs.

The 56 × 65 mm-class SIM7600G-H HAT remains an external bench mule, not an enclosure daughterboard. Before carrier freeze, either select an exact smaller replaceable modem board or explicitly accept an externally tethered LTE demonstration. Prove one exact ESP32-S3 modem transport, host/device role, hardware flow control, reset/power sequencing, and recovery path under simultaneous encrypted voice/display/audio load. A 115,200-baud UART cannot carry 24 kHz mono PCM16 at 384 kbit/s; any UART/PPP path requires measured compression, adequate baud rate, and hardware flow control. “USB/UART” is not a frozen interface.

A later board may integrate LEXI-R10-class cellular by following the chosen vendor reference design exactly and receiving RF/DFM review.

## Why

- The carrier still validates nearly every product-specific mechanical, power, audio, and manufacturing choice.
- Known breakouts preserve modem replacement and make power/RF bugs observable.
- Four layers provide continuous ground and controlled routing at little prototype-volume penalty.
- Assembly yield and bring-up remain tractable for a first board.

## Consequences

- The first custom assembly is not yet the smallest possible pager.
- We need explicit connector, host/device-role, debug, cable, and external-mule budgets.
- A second PCB spin is expected, not considered failure.
- Gate C requires measurements, schematic/ERC review, 3D fit, appropriate low-speed and impedance-safe probe access, current limiting, and manufacturer DFM before ordering 5–10 assembled boards plus two bare boards.

## Revisit when

Integrate RF only after the cellular mule passes attach/reconnect/data/power/thermal tests, regional/carrier and supply choices are firm, antenna keep-outs fit CAD, and a compliance/RF reviewer accepts the plan.
