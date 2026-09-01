# Mochi Pager

Mochi Pager is a pager-sized, expressive voice AI companion. The first product target is a rounded handheld device with two large round eyes, curious idle gaze, a sliding live caption, microphone, speaker, Wi-Fi, BLE, and optional standalone 4G LTE—and exactly two physical controls: the top conversation button and a power slide switch. The conversation button deliberately opens or closes a visibly live session; while it is open, the user and assistant can speak in a full-duplex, voice-interruptible conversation without pressing for each turn, while the assistant's words slide through the caption below its face. A companion mobile app onboards the device over BLE (Wi-Fi credentials, cellular APN, account claiming) and shows an encrypted local cache of opt-in cloud conversation history. The pager connects through a private gateway to the OpenAI Realtime API; it does not run the language model on the device.

The current phase is V1 interaction implementation plus EVT (engineering validation) planning. A zero-dependency local session broker and browser device simulator now provide the first runnable full-duplex slice; embedded firmware, the mobile app, cloud history, and cellular work remain staged behind it.

## Start here

- [Product concept](docs/design/0001_mochi_pager_product_concept.md)
- [V1 prototype high-level design](docs/prototype/0001_v1_high_level_design.md)
- [V1 beginner build guide and exact materials](docs/prototype/0002_v1_beginner_build_guide.md)
- [Companion app and synchronization architecture](docs/design/0002_companion_app_and_sync_architecture.md)
- [MVP requirements](docs/requirements/0001_mvp_requirements.md)
- [Component sources and staged BOM](docs/research/0001_component_sources_and_bom.md)
- [Shared-conversation and video source audit](docs/research/0002_reference_observations.md)
- [Independent verification and corrections](docs/research/0003_independent_verification_and_corrections.md)
- [35-project-day build plan plus companion-app track](scrum/20260830/task_0001/daily_plan.md)
- [Technical decision log](docs/decisions/README.md)
- [Educational notes](edu/README.md)

## Current verdict

The interaction mule is already ordered: one full M5Stack CoreS3 K128, recorded in the [daily log](scrum/20260830/task_0001/daily_log.md). Confirm only a known-good data-capable USB-C cable now; do not buy a second CoreS3. First run the laptop V1-A slice, then use the K128's documented full-duplex audio path to measure simultaneous capture/playback, AEC feasibility, voice barge-in, on-device captions, and truthful session indication. Use Wi-Fi and then a phone hotspot before adding radio complexity. Buy the separate SIM7600G-H cellular mule only after the Wi-Fi full-duplex vertical slice passes its gate. Do not buy a final battery, custom display, bare cellular module, or 5G hardware yet.

This ordering protects the project from three expensive early mistakes: choosing an enclosure before measuring the parts, choosing a battery before measuring modem peaks, and integrating RF onto the first PCB.

The major load-bearing claims reviewed in the 2026-08-30/31 verification pass, its corrections, and its explicitly unverifiable items are logged in [research 0003](docs/research/0003_independent_verification_and_corrections.md). That pass also added requirements the first draft missed: the sliding caption, companion app, and two-control constraint.

## Run V1-A now

Node.js 20 or newer and an OpenAI API project are required. The standard API key stays in the local server process.

```bash
cp .env.example .env
# Edit .env and replace OPENAI_API_KEY=replace_me
npm test
npm start
```

Then open `http://localhost:3000`. No `npm install` is required because V1-A has no runtime package dependencies. The idle face begins calm and centered: its first curious gesture arrives after 3–5 seconds, later gestures follow 6–12 second pauses, and every synchronized up/down glance, side-to-side look-around, or clockwise/counterclockwise roll returns to center. Conversation and battery state take priority. Face animation loads as an optional enhancement after Start/Stop is wired, so an animation import or initialization failure leaves a static face without disabling conversation control. The gateway renders the versioned [`prompt/mochi-realtime.ftl`](prompt/mochi-realtime.ftl) on the server, so the browser cannot inject history or system instructions. The localhost default has no real account/history service and truthfully marks that context unavailable. API use may incur charges; set a conservative project budget before testing. The [beginner build guide](docs/prototype/0002_v1_beginner_build_guide.md) contains the complete safety, setup, acceptance, and CoreS3 bring-up sequence.

## Repository organization

```text
docs/
  decisions/       numbered architecture decision records (ADRs)
  design/          product and industrial-design specifications
  requirements/    measurable product requirements
  research/        source audits, comparisons, and BOMs
edu/               short concept primers, each capped near three pages
prompt/            version-controlled server-side Realtime instruction templates
scrum/
  YYYYMMDD/
    task_NNNN/      task brief, daily plan, evidence, and retrospective
hardware/           future PCB and mechanical source files
src/                production device, gateway, companion-app, and cloud code only
tests/              automated tests spanning production components
tools/              simulators, fixtures, flashing, and developer utilities
```

Create directories only when they gain real content. When implementation begins, a sensible source split is `src/device/`, `src/gateway/`, `src/app/` (the companion mobile app), and `src/cloud/`. Hardware design should live in `hardware/pcb/` and `hardware/mechanical/`, not under `src/`.

Task IDs are repository-wide, zero-padded, and monotonically increasing. Decision records have their own monotonically increasing sequence because a decision's history is independent of sprint/task history. Never renumber an accepted or superseded record.

## Reference boundary

The shared ChatGPT post exposes only one answer, which proposes a **95 × 60 × 30 mm** enclosure. The earlier conversation is not present in the public page, so this repository treats that size as a maximum envelope rather than inventing unavailable prior decisions.

The visual reference is Huy Vector's [Tiny Pocket AI Assistant](https://www.youtube.com/watch?v=25RGnr407PM) and its [build guide](https://www.huyvector.org/robots-kinetic/pocket-ai-assistant). We borrow its face-first charm, blinking eyes, compact status text, and cheeky personality. We do not copy its exposed battery, conductive frame, cloud service, or electronics as a product architecture.
