# Educational notes

This folder is a small course for a software engineer who is new to electronics, embedded systems, and Internet of Things (IoT) products. It assumes you can read code, reason about APIs, and debug distributed software. It does **not** assume you know what voltage, ground, a GPIO pin, a modem, or a printed circuit board does.

Start with lesson `0000`. Do not skip it because its concepts are the vocabulary used by every later lesson.

## How these lessons teach

Each lesson should:

- define a physical or networking concept before using its acronym;
- connect it to a familiar software idea, then state where that analogy stops working;
- include a concrete Mochi example or calculation;
- separate general teaching from the exact product decision;
- end with questions you can answer without memorizing prose.

Hardware ultimately follows physics and component datasheets, not an analogy. Examples such as voltages, resistor values, current, and battery life are explicitly illustrative unless they cite a measured prototype or accepted requirement.

## Reading order

0. [Start here: IoT and electrical fundamentals](0000_start_here_iot_and_electrical_fundamentals.md) — circuits, voltage, current, power, ground, digital pins, regulators, sensors, actuators, safe measurements, and the device/network/service loop.
1. [System architecture from a button press](0001_system_architecture.md) — how to divide one physical product into local state, realtime data paths, networks, and services.
2. [Modules, buses, and embedded audio](0002_modules_buses_and_audio.md) — how boards and chips communicate, and how microphone and speaker samples move on time.
3. [Printed circuit boards and manufacturing](0003_pcb_fundamentals_and_manufacturing.md) — how a schematic becomes physical copper, an assembled board, and a controlled first power-on.
4. [Cellular, radio, power, and certification](0004_cellular_rf_power_and_certification.md) — how a modem reaches a carrier, why antennas and current bursts are physical design problems, and what module approval does not cover.
5. [Realtime voice, memory, and privacy](0005_realtime_voice_memory_and_privacy.md) — sampled sound, streaming, full duplex, echo cancellation, interruption, gateway trust, and distinct kinds of memory.
6. [Companion apps, Bluetooth setup, and synchronization](0006_companion_app_provisioning_and_sync.md) — provisioning, claiming, Bluetooth Low Energy, secret paths, authoritative revisions, history cursors, and deletion tombstones.

Use the [plain-language glossary](GLOSSARY.md) whenever a later document introduces an unfamiliar term. The lesson must still explain important terms inline; the glossary is a backup, not required pre-reading.

## A practical first pass

If the complete course feels large, use this order:

1. Read sections 1–9 of lesson `0000` and answer its self-check.
2. Run the existing browser prototype; identify its device, network, and service boundaries using lesson `0001`.
3. With the purchased CoreS3 still unmodified, follow lesson `0000`'s measurement workflow and the beginner build guide. Do not begin by designing a battery charger or cellular PCB.
4. Read lessons `0002`–`0004` immediately before working with that hardware.
5. Read lessons `0005`–`0006` before changing the Realtime gateway, memory model, provisioning flow, or companion app.

When stuck on a hardware sentence, ask four questions:

```text
What supplies the energy?
What path does current take out and back?
Which component owns the signal or state?
What measurement would prove the claim?
```

Those questions turn words such as "rail," "bus," "ground," and "live" into testable statements.

## Teaching versus specification

Files in `edu/` explain mental models. They are not the product specification. Accepted product choices live in `docs/decisions/`, measurable requirements live in `docs/requirements/`, detailed designs live in `docs/design/`, and executable code lives in `src/` or `tools/`.

The primers link to those sources at the end. When a teaching example and an accepted requirement differ, the accepted requirement controls the product.

Add future lessons with the next monotonic prefix. Lesson `0000` is the one intentional prerequisite inserted before the original numbered series.
