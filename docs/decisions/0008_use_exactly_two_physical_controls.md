# ADR 0008 — Use exactly two physical controls

Status: Accepted for EVT
Date: 2026-08-31

Supersedes: the microphone-kill-slider portions of [ADR 0004](0004_start_with_push_to_talk_and_ble.md) (carried forward through [ADR 0006](0006_use_button_started_full_duplex_sessions.md)) and the side-volume-button element of the product concept.

## Context

The product owner now requires exactly two switches/buttons: a listening start/stop control and a power control. Earlier explorations included a top conversation button, side volume buttons, a mechanically latching microphone-kill slider, and a power control. The slider was well-motivated as an independent, software-proof privacy authority, but both it and the volume buttons conflict with the newly fixed simplicity requirement.

## Decision

The product target has exactly two physical controls:

1. **The illuminated top conversation button** — requests and closes the live session as defined in ADR 0006. Its indicator semantics are unchanged.
2. **A latching power slide switch** — powers the device on and off. Off de-energizes the system and microphone rails; the power-path design must prevent USB charger, debug, or modem connections from back-powering them. Verified power-off is the ultimate microphone kill: no software state can capture audio from a de-energized microphone. A slide switch is chosen over a momentary PMIC button precisely so that "off" is an electrical fact rather than a firmware request. An ordinary claimed boot without the recovery chord returns to private idle; factory-first-boot and the deliberate chord instead enter capture-gated setup and never start listening.

Volume moves to the touchscreen UI and the companion app ([ADR 0007](0007_use_companion_app_and_cloud_history_sync.md)); there are no side volume buttons.

The conversation button has one meaning during normal product operation: one press starts a visibly indicated full-duplex session and the next press stops it. There is no shipping push-to-talk mode, hold-to-capture gesture, or mode selection that changes this contract. A failed AEC gate closes the session and reports a fault. Push-to-talk may exist only in developer-only firmware or a bench fixture and never counts as product acceptance.

Setup and recovery reuse the two controls without adding an ambiguous runtime gesture:

- A factory-fresh, unclaimed pager automatically enters capture-gated setup on first boot.
- A signed-in owner can request a time-bounded setup window from the app while the pager is online and private-idle; the authenticated gateway request causes the pager to advertise BLE locally. The touchscreen may offer the same network-repair entry while private-idle; it is UI on the existing display, not a third physical switch/button, and it cannot transfer ownership.
- If the pager is offline, the user holds the conversation button while sliding power on for eight seconds. This boot-only chord enters capture-gated local recovery; it is sampled before normal button behavior begins and cannot start listening.
- The boot chord plus the current binding's recovery proof can repair local network credentials, but cannot transfer cloud ownership or reveal prior history. Factory-package bootstrap proof works only before initial claim. Normal transfer requires current-owner release. Account-loss transfer requires a server-authorized process with account verification plus a factory-key signature over a fresh server challenge/request ID, device and requested-account IDs, `setup_epoch`, `recovery_epoch`, expected binding generation, current claim nonce, and expiry after the local Security 2 recovery proof succeeds; attempts are bounded/audited and follow the notification/cooldown policy frozen before Gate C. The atomic transfer compare-and-swaps generation/nonce/recovery epoch, revokes old credentials, streams, and recovery proof, advances all three values, resets new-binding consent, and causes the pager to purge all prior-binding live/cache state plus local Wi-Fi and custom cellular/APN/authentication credentials. Immutable factory identity remains; the new binding receives a new recovery secret once over Security 2. No recovery secret goes to the gateway.

Each successful claim, transfer, release, recovery, or revocation advances the gateway's `binding_generation`, rotates `claim_nonce` and `recovery_epoch`, and atomically invalidates outstanding claim tokens and the prior binding recovery proof; device and app credentials/streams bound to an older generation are rejected. A static printed QR may identify the unit and carry single-use first-claim bootstrap material, but that proof is disabled after initial claim. Account-loss transfer of a still-claimed binding requires the current binding proof plus a fresh, short-lived challenge from the active setup session, so a photographed factory label or prior owner's code cannot authorize later recovery. Initial claim and post-owner-release claim instead use their unclaimed-device setup/claim flow. The complete flow is specified in [the companion-app and sync architecture](../design/0002_companion_app_and_sync_architecture.md).

The dedicated microphone-kill slider is removed from the product target. Its software-command coupling is preserved differently: on the custom carrier, one capture-enable net is hardware-biased inactive through reset/boot/crash/watchdog/recovery/OTA, gates the microphone path (rail or data), **and** drives the cyan capture indicator, so firmware cannot command the light and gate independently. Component, open/short, and stuck faults can still disagree and must be tested; only the verified hard-off power switch is hardware-certain. Requirements PR-04 and MP-05 are rewritten around this scheme: capture leaves the device only while the command/indicator is asserted, power-off kills everything, and an ordinary power-on never resumes capture without a fresh conversation-button press.

On the EVT mule, the CoreS3 Lite keeps its own side power button (a 6-second hold invokes PMIC shutdown; do not repurpose it). The Day-12 switched-microphone rig ordered for the acoustic mule is retained **as bench instrumentation** for measuring gate behavior and fault injection — it is test equipment, not a product control, and no longer appears in the industrial design.

## Why

- The two-control constraint is the product owner's explicit requirement; honoring stated constraints beats silently "improving" them.
- Capture in this product is session-scoped and button-gated (ADR 0006) — there is no always-listening mode for a standing kill switch to defend against. The slider's strongest scenario (mic dead while the device stays usable) is narrow once every capture path already requires a visible cyan assertion.
- A hard power slide switch recovers most of the slider's value: the paranoid state is "off," and it is provably off.
- Fewer controls simplify the enclosure, gasketing, ergonomics, BOM, and the honesty story users must understand.

## Consequences

- The "powered on but guaranteed-mic-dead" state is lost; a user who wants the face/clock visible with hardware-certain mute does not have that option. This is the recorded cost of the constraint.
- The privacy story now rests on three legs: the session model (capture only inside cyan states), the electrically coupled capture-enable/indicator net, and the hard power switch.
- PR-04, MP-05, Gate A, the design doc's physical language and expression table, and every "hardware kill"/"mute slider" reference in the plan and edu notes must be swept to match.
- The `MUTED` face state disappears; `OFF` is dark by definition. A "software stop" remains just the private-idle state.
- The C&K JS102011SAQN slide switch remains a valid candidate part — recast as the power switch instead of the mute slider.
- Setup-state entry, ownership transfer, and account recovery require explicit security and replay tests because they now share the two existing controls rather than a dedicated reset control.

## Revisit when

Revisit if user research, a privacy review, or a regulatory/market requirement shows a dedicated hardware mute is expected for this product class, or if the capture-enable/indicator coupling proves impractical on the carrier. Reinstating the slider is a superseding ADR, not an edit to this one.
