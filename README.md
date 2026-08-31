# Mochi Pager

Mochi Pager is a pager-sized, expressive voice AI companion. The first product target is a rounded handheld device with a face, microphone, speaker, Wi-Fi, BLE, and optional standalone 4G LTE. It connects through a private gateway to the OpenAI Realtime API; it does not run the language model on the device.

The current phase is architecture and EVT (engineering validation) planning. No production firmware or service code exists yet, so `src/` is intentionally empty rather than filled with planning files or placeholders.

## Start here

- [Product concept](docs/design/0001_mochi_pager_product_concept.md)
- [MVP requirements](docs/requirements/0001_mvp_requirements.md)
- [Component sources and staged BOM](docs/research/0001_component_sources_and_bom.md)
- [Shared-conversation and video source audit](docs/research/0002_reference_observations.md)
- [35-project-day build plan](scrum/20260830/task_0001/daily_plan.md)
- [Technical decision log](docs/decisions/README.md)
- [Educational notes](edu/README.md)

## Current verdict

Buy only the interaction mule now: one M5Stack CoreS3 Lite and a known-good data-capable USB-C cable. Use Wi-Fi and then a phone hotspot to prove the end-to-end voice/face experience over cellular-backed Wi-Fi. Buy the separate SIM7600G-H cellular mule only after the Wi-Fi vertical slice passes its gate. Do not buy a final battery, custom display, bare cellular module, or 5G hardware yet.

This ordering protects the project from three expensive early mistakes: choosing an enclosure before measuring the parts, choosing a battery before measuring modem peaks, and integrating RF onto the first PCB.

## Repository organization

```text
docs/
  decisions/       numbered architecture decision records (ADRs)
  design/          product and industrial-design specifications
  requirements/    measurable product requirements
  research/        source audits, comparisons, and BOMs
edu/               short concept primers, each capped near three pages
scrum/
  YYYYMMDD/
    task_NNNN/      task brief, daily plan, evidence, and retrospective
hardware/           future PCB and mechanical source files
src/                production device, gateway, and cloud code only
tests/              automated tests spanning production components
tools/              simulators, fixtures, flashing, and developer utilities
```

Create directories only when they gain real content. When implementation begins, a sensible source split is `src/device/`, `src/gateway/`, and `src/cloud/`. Hardware design should live in `hardware/pcb/` and `hardware/mechanical/`, not under `src/`.

Task IDs are repository-wide, zero-padded, and monotonically increasing. Decision records have their own monotonically increasing sequence because a decision's history is independent of sprint/task history. Never renumber an accepted or superseded record.

## Reference boundary

The shared ChatGPT post exposes only one answer, which proposes a **95 × 60 × 30 mm** enclosure. The earlier conversation is not present in the public page, so this repository treats that size as a maximum envelope rather than inventing unavailable prior decisions.

The visual reference is Huy Vector's [Tiny Pocket AI Assistant](https://www.youtube.com/watch?v=25RGnr407PM) and its [build guide](https://www.huyvector.org/robots-kinetic/pocket-ai-assistant). We borrow its face-first charm, blinking eyes, compact status text, and cheeky personality. We do not copy its exposed battery, conductive frame, cloud service, or electronics as a product architecture.
