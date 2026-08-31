# 0006 — Companion app, BLE provisioning, and cloud sync

A connected device without a keyboard needs a safe way to receive secrets it cannot type: a home Wi-Fi password, a cellular profile, and proof that a signed-in person may claim it. The companion app also gives the user a place to inspect settings and opt-in history. Those jobs need different authorities and transports:

| Job | Authority and path |
|---|---|
| Nearby setup and recovery | Foreground mobile app ↔ protocomm Security 2 over BLE ↔ pager |
| Custom Wi-Fi and cellular credentials | Pager's encrypted local credential store; never Mochi cloud or persistent app storage |
| Public signed carrier-preset catalog | May ship in the app/pager or synchronize from Mochi cloud; it contains no user credential |
| Ownership, consent, and non-secret settings | Gateway, synchronized to pager and authenticated app clients |
| Opt-in conversation history | Gateway's durable store, synchronized to an encrypted app cache |
| Live audio and working context | Pager ↔ gateway ↔ OpenAI Realtime; never BLE and never the history database |

This hybrid split is the central design choice. BLE solves the chicken-and-egg problem before the pager has internet access. Cloud sync keeps operation and history independent of phone proximity. The complete contract lives in the [companion-app and synchronization architecture](../docs/design/0002_companion_app_and_sync_architecture.md).

## The chicken-and-egg of provisioning

Before provisioning, the device has no network. Two common escape hatches exist:

- **SoftAP / captive portal:** the device becomes a temporary Wi-Fi access point; the phone joins it and posts credentials locally. It can work without a native app, but the phone must leave its current network, operating-system UX varies, and the product still has to authenticate and encrypt the temporary channel.
- **BLE:** the phone remains on its current network while it configures the nearby device. It also supports Mochi-specific fields such as a cellular profile and a short-lived claim token.

Mochi uses BLE only for foreground commissioning, recovery, network tests, and bounded diagnostics. Mobile operating systems constrain background BLE differently, and the pager must remain useful when the phone is absent, so BLE never becomes a live-audio relay or a history-sync channel. General accessory Bluetooth—headphones, keyboards, watches, or arbitrary pairing—is deferred beyond the MVP.

BLE's unit of interaction is a GATT service: the device exposes characteristics that the phone reads or writes. Designing a proprietary secure protocol would mean owning key exchange, transcript binding, replay resistance, and two mobile implementations. Espressif's current `network_provisioning` component supplies a GATT transport, the protocomm session protocol, official Android/iOS libraries, and custom protected endpoints. Mochi uses the standard Wi-Fi messages plus `/cell-config`, `/claim`, `/info`, and `/network-test`. See Espressif's [network provisioning component](https://components.espressif.com/components/espressif/network_provisioning) and [protocomm documentation](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/provisioning/protocomm.html).

## Exactly two controls, including setup and recovery

The shipping pager has only an illuminated conversation button and a latching power switch. The conversation button always starts or stops a full-duplex session in normal operation; there is no user-facing push-to-talk or fallback mode.

Setup and recovery never weaken the hardware boundary. The capture-enable command is biased inactive before GPIO configuration and through reset, boot, crash/watchdog, recovery, and OTA. The latching switch's off path must keep the system and microphone rails de-energized even with USB charging, debug, or modem connections attached; none may back-power the pager.

Setup does not require a hidden third button:

1. A factory-fresh, unclaimed pager enters capture-gated setup automatically on boot.
2. A claimed pager may reopen setup from the app only while it is online and private-idle: the signed-in app sends an authenticated request to the gateway, which authorizes a short BLE-advertising window on that pager. The app does not directly unlock setup over an unsolicited local connection.
3. If normal online entry is unavailable, the owner may use the touchscreen while private-idle or hold the conversation button while sliding power on for eight seconds. Firmware recognizes the chord only during boot and enters setup with the cyan capture indicator off.

The boot chord is evidence of physical presence, not ownership authority. The chord plus the current binding's recovery proof may repair local network credentials, but an owned pager remains unclaimable. Factory-package proof is single-use bootstrap for first unclaimed setup and is disabled after initial claim. The current owner releases the pager in the app before resale. If that account is unavailable, transfer requires a server-authorized account/support recovery with account verification and physical proof: after the app proves the current recovery secret locally over Security 2, the pager signs a fresh server challenge/request ID, device and requested-account IDs, `setup_epoch`, `recovery_epoch`, expected `binding_generation`, current `claim_nonce`, and expiry with its immutable factory key. The server bounds and audits attempts, applies the notification/cooldown policy, and compare-and-swaps generation/nonce/recovery epoch during the atomic binding change; no recovery secret goes to the gateway.

After release or authorized recovery advances the binding generation, the pager gates capture, closes any live session, and purges the prior binding's credentials, recovery verifier, configuration cache, captions, playback/media queues, working context, volatile transcripts, Wi-Fi credentials, and custom cellular/APN/authentication profile before returning to capture-gated setup; only immutable factory identity remains. The new binding generates a new recovery secret, installs only its verifier with a new `recovery_epoch`, and delivers the secret once over Security 2 for the new owner to save. The prior owner's retained cloud history stays with that account and is never exposed to the new binding. This replaces the earlier idea of a generic long-press reclaim, which was too easy to trigger or abuse.

## Why “encrypted BLE” is not enough

BLE link-layer pairing is not sufficient authentication for a screen-constrained product. Mochi uses protocomm Security 2, which Espressif defines as SRP6a key exchange followed by AES-GCM protection. Production builds compile out or reject Security 0 and Security 1 instead of relying on SDK defaults that may change across releases.

Security 2 is a password-authenticated key exchange: the device proves knowledge of a verifier and the app proves knowledge of the per-device setup secret without sending that secret as plaintext. A passive observer cannot derive it from a captured handshake. That does not eliminate online guessing or copied-label risk, so the device rate-limits failures, advertises only in an intentional setup state under a randomized identifier, and binds each attempt to a fresh session plus a short-lived single-use claim token.

Manufacturing installs the bootstrap salt/verifier on the pager; the packaged QR carries only the unit identifier and corresponding single-use factory bootstrap secret. That verifier is disabled after first claim and cannot recover a later owner binding. Because a verifier cannot reconstruct its secret, the pager never pretends to redisplay that factory or an earlier active/recovery secret. An on-screen setup QR contains a newly generated active secret only when the pager atomically installs its new salt/verifier and increments `setup_epoch`; the screen also supplies a fresh expiring challenge for that epoch. Each successful claim/new binding separately generates a random binding-recovery secret, installs only its verifier with a new `recovery_epoch`, and shows/delivers the secret once inside Security 2 for explicit save/export. Plaintext remains only until bounded acknowledgement/timeout; interrupted delivery requires authenticated owner rotation. The app keeps entered custom Wi-Fi/APN credentials only in memory, length-checks every field, sends them inside Security 2, and discards them after the pager acknowledges a bounded success or failure result. The pager never makes those values readable back. Provisioning is unavailable while a conversation is connecting, live, or reconnecting, and the BLE stack shuts down after setup to release radio and RAM resources.

## Claiming: binding a device to an account

BLE proximity and cloud ownership are separate proofs. The signed-in app requests a short-lived, audience-bound, single-use claim token containing the account, immutable device identity, current `setup_epoch`, expected `binding_generation`, and current server `claim_nonce`, then writes it through the protected `/claim` endpoint. The pager redeems it over TLS using its factory identity. In one atomic compare-and-swap the gateway checks generation and nonce, invalidates all outstanding claim tokens, rotates `claim_nonce`, binds the device, and advances `binding_generation`. Claim/new binding also rotates `recovery_epoch` and installs the new verifier; claim, release, recovery, and revoke invalidate stale tokens, credentials, streams, and prior recovery proofs.

Notice the boundaries:

- Wi-Fi passwords, user-entered/custom APNs, derived modem profiles, cellular usernames/passwords, and SIM secrets never enter Mochi cloud; a signed public carrier-preset catalog may.
- The claim token is encrypted on BLE, expires quickly, and cannot claim an already-owned pager.
- The OpenAI API key exists only in the gateway.
- Releasing, revoking, or recovering a pager changes gateway ownership without granting access to another account's history.

## What “configure 4G” actually means

The app cannot make an arbitrary modem work with an arbitrary carrier. Before setup, the modem SKU, supported bands, carrier acceptance, antennas, SIM/eSIM, subscription, and launch country must already be compatible. For the physical-SIM EVT, most users choose a local carrier preset; advanced fields are:

| Field | MVP handling |
|---|---|
| Carrier/profile name | Signed public preset identifier and metadata; may ship locally or synchronize from Mochi cloud |
| APN | Public preset value or validated manual entry; user-entered/custom values remain BLE-local |
| PDP type | `IPv4`, `IPv6`, or `IPv4v6`, limited to carrier/modem support |
| Authentication | None, PAP, or CHAP when required |
| Username/password | Optional BLE-only credentials; never logged or cloud-synced |
| Roaming | Explicit local choice with a cost warning |
| SIM PIN | Disabled for EVT; later support needs a secure cold-boot unlock design |

The SIM normally carries subscriber identity; activation, plan choice, billing, and cancellation remain in the carrier's portal. Cloud release cannot deactivate a physical card. Resale therefore requires confirmation that the SIM was removed or carrier-deactivated; loss/account deletion direct the owner to deactivate the line. A future managed eSIM design needs its own explicit profile deactivation/transfer operation. A signed public carrier-preset catalog is metadata, not a credential, and may be distributed through the app, pager image, or cloud. User-entered/custom APNs, derived modem profiles, authentication values, and any future SIM PIN remain memory-only in the app, travel only through the protected BLE session, and live only in the pager's protected credential store.

Consumer eSIM provisioning is not a generic QR field Mochi can invent. A later IoT eSIM design should use an eUICC/modem vendor and the GSMA SGP.32 model for remotely managed, UI- and network-constrained IoT devices. See [GSMA SGP.32](https://www.gsma.com/solutions-and-impact/technologies/esim/gsma_resources/sgp-32-v1-3/).

A standard Starlink terminal is not a pager radio. Starlink Direct to Cell is a different, conditional carrier path: Starlink currently advertises IoT plans through participating mobile operators and compatibility with qualifying Release-10-or-newer Cat-1, Cat-1 bis, and Cat-4 modems on the required bands. That makes it a carrier/SIM/coverage experiment—not a universal `Starlink` APN and not the MVP baseline. Mochi must validate the exact partner operator, country, modem bands, plan, data allowance, and Realtime latency before selecting it. See [Starlink Direct to Cell](https://www.starlink.com/business/direct-to-cell).

## Non-secret configuration synchronization

Volume, model/voice profile, prompt-profile version, history consent, and structured-memory consent are cloud settings. They live in one gateway document scoped to `(account_id, device_id, binding_generation)` with a monotonically assigned `config_revision`; custom network credentials do not. Both app and pager mutations carry `client_mutation_id`, the current binding generation, and `If-Match: config_revision`. The gateway either commits the next revision or returns the current document as a conflict. Claim, transfer, or recovery starts a fresh document with both consents off and rejects stale-generation writes. Phone clocks never decide which value wins. A touchscreen volume change may apply locally while offline but remains visibly pending with its base revision; on reconnect it follows the same pager-origin mutation path, and a conflict resolves to the gateway document with an explicit notice. Consent never changes before server acknowledgement. The pager clears prior binding-scoped preferences and acknowledges each revision it applies.

Capture state is not configuration. The app may display device status, but it cannot remotely press the conversation button or assert that the microphone is live.

## Conversation-history synchronization

History is a separate, explicit opt-in that defaults off. When future saving is off, Mochi's gateway/history stores create no new durable transcript; previously retained records remain viewable until the user separately deletes them. When saving is on, machine input transcription can run even if user captions are hidden, and the gateway is the sole writer that commits only user-visible finalized records:

```text
account_id, device_id, binding_generation, conversation_id
history_event_id, session_epoch, source_item_id
server_seq, kind, role, finalized_text
interrupted, heard_through_ms, created_at, deleted_at
```

The gateway deduplicates source commits on the stable conversation/session/source identity before assigning an immutable `history_event_id`. It assigns account-scoped `server_seq` values transactionally and publishes a change cursor. An app fetches `changes?after=<opaque_cursor>` over authenticated HTTPS; a live stream or push notification is only an invalidation hint that triggers the same cursor fetch. This avoids CRDT complexity and wall-clock last-write-wins bugs while allowing two phones, duplicate deliveries, and long offline periods to converge.

History contains finalized machine transcripts, not live deltas. For an interrupted assistant response, it stores only the prefix aligned to samples actually rendered; if a trustworthy text boundary cannot be established, it marks the item `interrupted` instead of claiming the generated suffix was heard. Tool entries contain a sanitized user-visible action and status, never raw provider/tool payloads, tokens, or unrelated results. Raw microphone and output audio are not retained by default, even when transcript history is enabled.

Delete-item, delete-conversation, and delete-all mutations carry `client_mutation_id` plus the expected record version. The server removes content and emits a content-free tombstone; a tombstone is not a hidden transcript. It exposes `oldest_available_seq`, retains tombstones through the maximum valid cursor age, and rejects any cursor older than that boundary. That client must authenticate and fully reconcile before showing a restored cache, so an indefinitely offline or restored installation cannot miss a deletion and resurrect content. Turning future saving off is a separate choice from deleting existing history, and retained history stays accessible while saving is off. Offline deletes are visibly pending until acknowledged, and exports come from the server authority rather than one possibly stale phone.

Structured memory and history remain separate consents, but deletion has a provenance rule: every fact derived from transcript history carries its source event IDs. Deleting those sources defaults to cascading the derived fact; keeping an individually confirmed fact requires an explicit choice. Disabling future history saving alone does not silently disable memory consent.

The app keeps only an encrypted, account-scoped cache. Its database key is device-bound and non-synchronizing in iOS Keychain or non-exportable Android Keystore-backed storage where supported; authentication tokens use the corresponding secure store, and both cache and key are excluded from OS cloud/device backup. A restored database without its key is discarded. A reinstall, restore, or cursor older than `oldest_available_seq` must authenticate and fully reconcile before displaying restored content. Offline display requires a signed, installation-bound authorization lease lasting at most 24 hours and renewable only through authenticated server contact. Same-boot validation uses monotonic elapsed time and wall time; clock rollback or boot/time discontinuity without rollback-resistant platform time locks the cache until contact. Sign-out or account switch erases the prior account's cache. The pager retains neither history nor a second sync log, and BLE carries no audio or transcript content.

Account deletion requires reauthentication and explicit confirmation. The gateway immediately revokes and unbinds devices, advances generations/nonces/recovery epochs, closes streams, cancels pending exports, and deletes account/config/history/memory content under the published server-side SLA. Connected apps purge on the server signal; offline pagers are unauthorized at the gateway immediately and, on reconnect, purge binding/recovery state plus local Wi-Fi/custom cellular credentials before capture-gated setup. A disconnected phone cannot receive an instant remote wipe, so it may display already authorized cached history only until its current authorization lease expires—at most 24 hours. It then locks the cache; the next server contact that returns an authoritative deletion/revocation or revoked-credential response causes key/cache purge instead of lease renewal. The deletion UI must distinguish the server SLA, connected-replica purge, offline lease/erasure limit, required carrier-SIM action, and separate provider-retention boundary.

## Realtime state and provider retention are different

OpenAI describes each Realtime Session as a stateful live interaction containing a Conversation and its Items/Responses, with a current 60-minute session limit. Mochi treats this as ephemeral working state and uses its own opt-in gateway store for cross-session history. It should not use OpenAI `/v1/conversations` as an accidental product database: OpenAI documents that those application-state endpoints retain data until deletion and are not Zero Data Retention eligible. See [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations) and [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

“Mochi stores no history” is only a statement about Mochi-controlled durable storage. OpenAI states that API data is not used to train models unless the customer opts in, but default abuse-monitoring logs may retain content for up to 30 days; eligible customers can apply for Modified Abuse Monitoring or Zero Data Retention. The launch privacy notice and acceptance evidence must state the project's actual provider controls rather than promise zero provider retention by inference.

## App stack notes

React Native is a reasonable cross-platform UI candidate, but it is not yet an architectural commitment. The provisioning spike should bridge Espressif's maintained native Android/iOS libraries and verify Security 2, custom endpoints, Bluetooth permissions, foreground lifecycle, recovery, memory use, and licenses on real phones. A third-party React Native wrapper may accelerate the spike, but it is not a dependency to freeze before those checks pass. Keep app code in `src/app/`, and treat every BLE or cloud payload as untrusted input: length-check it, schema-validate it, and never log secrets or conversation content.

See [ADR 0007](../docs/decisions/0007_use_companion_app_and_cloud_history_sync.md), [ADR 0008](../docs/decisions/0008_use_exactly_two_physical_controls.md), the companion-app requirements, and the memory taxonomy in [primer 0005](0005_realtime_voice_memory_and_privacy.md).
