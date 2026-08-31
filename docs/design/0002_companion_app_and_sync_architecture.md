# 0002 — Companion app and synchronization architecture

Status: Selected for EVT specification
Date: 2026-08-31

## Outcome

Mochi uses a hybrid architecture with a strict division of responsibility:

- **Bluetooth Low Energy is the nearby commissioning and recovery link.** It carries Wi-Fi credentials, the cellular profile, a short-lived claim token, and bounded diagnostics while the pager is in the distinct capture-gated setup/recovery state. It never carries live conversation audio or conversation history.
- **The gateway/cloud is the synchronization authority.** It owns account↔device binding, non-secret settings revisions, consent state, and opt-in conversation history. The mobile app is an authenticated client and encrypted local cache of that state.
- **The pager is the live interaction endpoint.** It owns the truthful capture indicator, full-duplex audio, playback cursor, and a small working context. It does not become a second durable history database.

This split makes first setup possible before the pager has internet access without making normal operation or history depend on the phone being nearby.

## ChatGPT Live interaction reference

OpenAI describes ChatGPT Live as able to listen and speak at the same time, so a person can interrupt or continue speaking while the assistant responds; it also shows response text during speech and warns that overlap, noise, networks, and microphones still affect what is heard. Mochi adopts that conversational shape—continuous duplex audio, natural barge-in, and text paced with speech—but not ChatGPT's mobile control layout or consumer-data behavior. Mochi's one conversation button opens or closes the entire listening session, the cyan indicator is driven by the same fail-closed command as the microphone gate, and its own acoustic suite must validate echo cancellation, false interruptions, and electrical fault behavior. Only hard power-off is hardware-certain. See [ChatGPT Voice](https://help.openai.com/en/articles/20001274-chatgpt-voice).

## Component ownership

| Concern | Authority | Replicas or transport |
|---|---|---|
| Conversation start/stop and capture truth | Pager | Gateway receives events; app may display status but cannot assert capture |
| Wi-Fi password and cellular credentials | Pager's encrypted credential store | Written over an authenticated BLE provisioning session; not copied to Mochi cloud or app storage |
| Device identity, ownership, and revocation | Gateway account/device registry | Pager has a unique factory identity and a revocable credential; app displays binding state |
| Non-secret settings such as volume, voice choice, and retention consent | Gateway document scoped to `(account_id, device_id, binding_generation)` | Pager and app apply ordered `config_revision` values |
| Realtime working context | Active gateway/provider session | Reconstructed only from committed context after renewal/reconnect |
| Conversation history | Opt-in gateway history store | App keeps an encrypted cache; pager keeps none |
| Structured user memory | Separate opt-in memory service | App exposes inspect/forget controls; it is not conversation history |

OpenAI describes a Realtime conversation as state within one connected Realtime Session, and currently limits a session to 60 minutes. Provider session items are therefore input to the live interaction, not Mochi's cross-session or cross-device database. See [OpenAI Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations).

## Topology

```text
mobile app <===== Security 2 BLE: Wi-Fi/APN/claim =====> pager
     |                                                    |
     | authenticated HTTPS config/history                 | device TLS media/control
     v                                                    v
     +========== account + config + history gateway <=====+
                              |
                              +==========> OpenAI Realtime
```

The phone can offer a normal Wi-Fi hotspot when the pager has no usable Wi-Fi or onboard cellular. BLE is not the live-audio relay: background execution differs across mobile platforms, and a phone-proximity dependency would defeat standalone cellular use.

Normal app↔pager state does not need a second P2P protocol. The app writes to the gateway; an online pager receives the committed revision over its authenticated device stream or fetches it after reconnect. The app may use BLE to repair network access while nearby, but never treats that local copy as authoritative cloud state.

## Identity and ordering contract

Synchronization uses explicit identities instead of device clocks:

```text
device_id              # immutable random manufacturing identity
device_key_id          # identifies the credential presented, so it can be revoked
setup_epoch            # advances when setup possession material rotates
recovery_epoch         # advances when binding-scoped recovery proof rotates
binding_generation     # advances on claim/release/recovery/revocation
claim_nonce            # server value that invalidates outstanding claim tokens
conversation_id        # gateway-issued UUIDv7
session_epoch          # advances across Realtime renewal/reconnect
source_item_id         # provider/device source identifier within the epoch
history_event_id       # globally unique committed event identifier
server_seq             # account-scoped monotonic change order
client_mutation_id     # idempotency key for app/pager mutations and deletes
```

Every authenticated request carries the account/device binding generation where applicable. Device and app clocks are display metadata only; they never resolve ownership, configuration, or history conflicts.

## Exactly two physical controls

The product has only the illuminated conversation button and the latching power switch.

- In normal operation the conversation button has one meaning: press once to start a visibly live session; press again to stop it. There is no shipping push-to-talk mode that changes this gesture.
- The power switch physically powers the product on or down. Its load-switch/power-path design must prevent USB charger, debug, or modem connections from back-powering the system or microphone rails in `OFF`. An ordinary claimed boot without the recovery chord returns to private idle and never resumes capture; factory-first-boot and deliberate recovery are capture-gated setup exceptions.
- On an unclaimed first boot, the pager automatically enters setup with capture gated and BLE advertising enabled.
- An owner can reopen setup from the touchscreen while the pager is private-idle, or from the signed-in app when the pager is online: an authenticated app→gateway request tells that pager to begin time-bounded local advertising. If normal entry is unavailable, the recovery chord is to hold the conversation button while sliding power on for eight seconds. The chord is recognized only during boot, never during a live session, and enters setup with the cyan capture indicator off.
- Ownership transfer is not an unprotected long-press. The current owner releases the device in the app, then the new owner uses the setup flow; if a physical SIM is installed, resale release requires confirmation that it was removed or carrier-deactivated. Account-loss transfer uses the server-authorized recovery contract below; a boot chord and local recovery proof alone can repair networking but cannot replace an owned cloud binding. A local reset clears network credentials and revocable device credentials but cannot transfer the server binding or expose/delete the prior account's history. The gateway increments `binding_generation` and rotates `claim_nonce` and `recovery_epoch` on claim, release, recovery, or revocation, invalidating older credentials, streams, pending claim tokens, and prior recovery proof atomically.

The touchscreen may present status, volume, and confirmation UI, but it does not add another physical switch or button.

The capture-enable command is hardware-biased inactive from reset, before GPIO configuration, and through boot, crash/watchdog, recovery, and OTA. Once the authenticated session is ready, firmware atomically asserts the gate/indicator command, presents cyan `LIVE`, waits the measured electrical/codec settling interval, and only then permits the first uplink frame. Verification covers both the command coupling and component/open/short/stuck faults; power-off is tested with battery, USB/charger, debug, and modem paths attached to prove none can back-power the microphone or system rail.

The MVP ownership-recovery contract is deliberately stricter than network repair:

1. The boot chord plus the **current binding's** recovery secret may authenticate a local Security 2 session and repair networks, but an owned device still cannot be claimed. Factory-package bootstrap proof is single-use for the first unclaimed setup and is permanently disabled after initial claim; it is not an owner-recovery credential.
2. Self-service transfer requires the current owner to release the pager. If that account is inaccessible, a server-side account/support recovery must authorize transfer after both account verification and physical proof: the app sends a fresh server challenge over Security 2, and the pager signs the challenge/recovery-request ID, device and requested-account IDs, `setup_epoch`, `recovery_epoch`, expected `binding_generation`, current `claim_nonce`, and expiry with its immutable factory key after the current binding recovery proof succeeds. The recovery secret itself never goes to the gateway.
3. Recovery requests are rate-limited and audited, notify the existing account, and observe a policy-defined challenge expiry/cooldown when that account remains contactable. The numeric limits and support authority must be frozen before Gate C.
4. The atomic transfer transaction compares the signed expected generation/nonce/recovery epoch, invalidates every outstanding claim/recovery token, advances `binding_generation`, `claim_nonce`, and `recovery_epoch`, revokes old credentials/streams and the prior recovery proof, and creates a fresh binding-scoped configuration with history and memory consent off.
5. On observing release or the new generation, the pager gates capture, closes any live session, clears playback/captions/working context/volatile transcript buffers, erases old binding credentials and cached configuration, and also erases the prior owner's locally stored Wi-Fi password and custom cellular/APN/authentication profile. Immutable factory identity remains, but factory bootstrap and prior binding-recovery verifiers do not remain usable. The pager then returns to capture-gated setup; the prior owner's retained cloud history remains in that prior account and is never copied to the new one.
6. Initial claim and every successful new binding generate a fresh random binding-recovery secret, atomically install only its verifier with the new `recovery_epoch`, and deliver the secret once to the newly authenticated owner inside the active Security 2 session for explicit save/export. The app never sends it to Mochi cloud. The pager holds plaintext only until bounded acknowledgement/timeout, then erases it; a lost delivery requires an authenticated current-owner rotation, not redisplay. Tests prove the factory bootstrap and every previous owner's recovery secret fail after rotation.

## BLE provisioning protocol

Use Espressif's current `espressif/network_provisioning` component over BLE with protocomm Security 2. Espressif documents Security 2 as SRP6a key exchange plus AES-GCM and recommends it for production. Compile out or reject Security 0 and Security 1 rather than relying on an SDK version's defaults. The framework supports custom endpoints in the same protected session. See the [network provisioning component](https://components.espressif.com/components/espressif/network_provisioning) and [protocomm documentation](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/provisioning/protocomm.html).

The foreground onboarding flow is:

1. The user signs into the app and scans setup material from the physically present pager. Factory packaging contains the expected device identity and a single-use Security 2 bootstrap secret for the first unclaimed setup; the pager stores its verifier rather than recoverable plaintext and permanently disables it after initial claim. The active screen supplies a fresh, expiring challenge bound to the current `setup_epoch`. A current on-screen QR uses a newly generated active-setup secret and atomically rotates the separate active-setup salt/verifier and epoch; a verifier cannot re-create an earlier secret, and an unrelated display code cannot substitute for the proof. Claimed-device ownership recovery instead uses the rotating binding-scoped proof above.
2. The app discovers a randomized setup identifier, verifies the active challenge, and completes Security 2 using the matching unit secret. Advertising exposes neither that secret, the account, nor a stable user-visible serial.
3. Only one commissioner is accepted. Inside the authenticated session, the app requests a pager-side 2.4 GHz Wi-Fi scan and writes a selected or hidden SSID/password, or selects a cellular preset and writes its local profile. Values are length-limited, schema-validated, never logged, and never readable back.
4. The pager tests association, DHCP, DNS, and authenticated TLS reachability and returns a bounded failure code without echoing secrets. The app discards entered credentials after acknowledgement. Open networks require a warning; captive portals and enterprise Wi-Fi are outside the MVP.
5. The signed-in app requests a short-lived, single-use claim token bound to the account, immutable device identity, current `setup_epoch`, expected `binding_generation`, and current `claim_nonce`, then sends it through the protected `/claim` endpoint.
6. The pager redeems the token using its factory identity over TLS. The gateway uses an atomic compare-and-swap on generation and nonce, invalidates every outstanding claim token, rotates the nonce, binds the device, increments `binding_generation`, and issues a revocable per-device credential or a bounded error. Claim, release, recovery, and revoke all rotate the nonce, so an unused token cannot survive an ownership race.
7. After a successful claim, the pager disables any factory bootstrap verifier, rotates `recovery_epoch`, generates the new binding-recovery secret, installs only its verifier, and returns the plaintext once inside Security 2 for owner save/confirmation. Provisioning remains alive through that bounded acknowledgement. The pager then atomically commits encrypted local state, clears all plaintext setup/recovery/network buffers, shuts BLE down, releases its memory, and returns to private idle. If delivery is interrupted, the authenticated current owner must enter setup and rotate a new recovery secret. Repeated proofs are rate-limited, the setup window expires, and claimed devices do not advertise continuously.

Custom protected endpoints are `/cell-config`, `/claim`, `/info`, and `/network-test`; Wi-Fi uses the component's standard provisioning messages. Provisioning is unreachable while a conversation is connecting, live, or reconnecting.

On ESP32-S3, “encrypted local state” requires an explicitly validated [NVS-encryption](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/storage/nvs_encryption.html), flash-encryption, secure-boot, and key-provisioning strategy; naming an encrypted BLE link does not protect plaintext flash afterward.

BLE is the sole MVP commissioning transport. Generic Wi-Fi Direct is not part of Espressif's provisioning design, and SoftAP complicates mobile Internet access and iOS setup. A later SoftAP recovery path may be tested only behind the same capture-gated setup state, short timeout, unique AP key, and Security 2 application protocol; it is not required for EVT.

## Cellular configuration

The app cannot make an arbitrary modem work with an arbitrary provider. The selected modem SKU, supported bands, carrier acceptance, SIM/eSIM, subscription, antennas, and country must already be compatible. For the physical-SIM EVT, most users choose a carrier preset and never see the advanced fields:

| Field | MVP handling |
|---|---|
| Carrier/profile name | Non-secret preset identifier; public signed preset metadata may ship in the app/pager or be downloaded from Mochi cloud |
| APN | Public preset value or validated manual entry; a user-entered/custom profile remains BLE-local |
| PDP type | `IPv4`, `IPv6`, or `IPv4v6`, limited to modem/carrier support |
| Authentication | None, PAP, or CHAP when the carrier requires it |
| Username/password | BLE-only secret; not retained by the app or Mochi cloud |
| Roaming | Explicit user setting with cost warning |
| SIM PIN | Disabled for the EVT; later support must define secure cold-boot access rather than claiming it can be used once and forgotten |

Signed public carrier-preset metadata is not treated as a credential; user-entered APNs, cellular usernames/passwords, and derived modem profiles are. Only those custom/secret values are memory-only in the app and BLE-local to the pager. SIM activation, billing, and subscription cancellation remain in the selected carrier's portal. A cloud device release cannot deactivate the subscriber credential on a removable card: resale requires physical-SIM removal or carrier deactivation, while loss and account deletion direct the owner to deactivate the line with the carrier. A later SGP.32 IoT eSIM design would use the modem/eUICC vendor and an eSIM IoT remote manager and must define explicit profile deactivation/transfer; it is not a generic QR-based consumer-eSIM screen that Mochi should invent. The current [GSMA SGP.32 specification](https://www.gsma.com/solutions-and-impact/technologies/esim/gsma_resources/sgp-32-v1-3/) targets remote provisioning for UI- and network-constrained IoT devices.

Standard Starlink service still requires a separate terminal and is not a pager radio. Starlink Direct to Cell is different: Starlink now advertises IoT plans through participating mobile operators and compatibility with off-the-shelf Release-10-or-newer Cat-1, Cat-1 bis, and Cat-4 modems that support the operator's bands. It is therefore a conditional carrier-coverage experiment, not a `Starlink` APN or the MVP provider. Mochi may test it only after a partner carrier confirms the exact modem/SIM/plan and voice-session data use in the target country. See [Starlink Direct to Cell](https://www.starlink.com/business/direct-to-cell).

## Cloud settings synchronization

Network credentials never use cloud synchronization. Other settings use one server-ordered, binding-scoped configuration document:

```text
account_id
device_id
binding_generation
config_revision        # monotonically assigned by the gateway
volume
model_profile
voice_profile
prompt_profile_version
history_retention      # off by default
memory_consent         # separate from history
updated_by             # account, device, or policy
```

App and pager writes use `client_mutation_id`, the current `binding_generation`, and `If-Match: config_revision`. The gateway either commits the next revision or returns a conflict with the current document; client timestamps never decide winners. Claim, transfer, or recovery creates a fresh binding document with history and memory consent off, and rejects every write from an older generation. The pager clears prior binding-scoped preferences, applies the new defaults, and acknowledges each later revision. A touchscreen volume change may take effect locally while offline, but remains visibly pending with its original base revision; on reconnect it follows the same mutation path, and a conflict resolves to the gateway document with an explicit UI notice. Consent changes require a committed server acknowledgement before taking effect. Safety and capture state are never settings: neither app nor touchscreen can remotely or indirectly start a listening session.

## Conversation-history synchronization

History retention is a separate, explicit, default-off consent. When off, Mochi-controlled storage does not create a durable transcript record. When on, input transcription may be enabled for history even when user captions are hidden, and the gateway commits only user-visible, finalized history events:

```text
account_id, device_id, binding_generation, conversation_id
history_event_id        # gateway-assigned immutable event ID
server_seq              # account-scoped ordering assigned at commit
session_epoch, source_item_id
version, kind, role, finalized_text
interrupted, heard_through_ms
created_at, deleted_at
```

Raw microphone or output audio is not retained by default. Tool history contains a user-visible action/status and a redacted result, not arbitrary provider payloads or secrets. Input transcription is labelled as a machine transcript. For an interrupted assistant response, history excludes the known-unheard suffix; if the caption/audio alignment cannot establish a trustworthy text boundary, the item is stored as `interrupted` instead of pretending the full generated transcript was heard. OpenAI notes that WebSocket clients must manage playback truncation and that truncation does not return a precisely truncated transcript.

The gateway is the only writer that assigns `history_event_id` and `server_seq`. It deduplicates source commits on `(device_id, conversation_id, session_epoch, source_item_id, kind)`, so provider/device retries cannot duplicate a turn. The canonical row and its change-stream/outbox row commit in one database transaction; stream delivery is merely an invalidation signal, not the source of truth. The app:

- fetches `changes?after=<opaque_cursor>` over authenticated HTTPS;
- receives a content-free stream/push invalidation while online and then performs the same cursor fetch;
- stores an encrypted, account-scoped local cache whose database key is device-bound/non-synchronizing in iOS Keychain or non-exportable Android Keystore-backed storage where supported, keeps authentication tokens in the corresponding secure store, and excludes the cache/database key from OS cloud/device backup;
- displays offline history only while a server-signed, installation-bound offline-cache authorization lease is valid; the lease includes server issue/expiry times and a duration of at most 24 hours, may be shortened by policy, and cannot be renewed without authenticated server contact. On the same boot, validation uses elapsed monotonic time as well as wall time; wall-clock rollback, monotonic/boot discontinuity, signature/scope failure, or unavailable rollback-resistant platform time locks the cache until server contact;
- shows cached history offline, but labels deletes/exports/config changes pending until the gateway acknowledges them; and
- discards another account's cache immediately on sign-out or account switch.

Delete-item, delete-conversation, and delete-all operations use `client_mutation_id` plus the expected version of the target record, conversation aggregate, or account-history collection. Content is removed server-side and replaced in the change stream by a content-free tombstone. The server exposes `oldest_available_seq`, retains tombstones through the maximum valid cursor age, and rejects any cursor older than that sequence; that client must authenticate and perform a full reconciliation before showing restored cache. This couples cursor validity to tombstone retention so an indefinitely offline, reinstalled, or backup-restored client cannot miss a deletion or resurrect content. Disabling future retention asks separately whether existing history should be kept or deleted; it never silently conflates those choices. A structured-memory fact derived from history carries source event IDs; deleting those sources defaults to cascading the derived facts, while keeping an individually confirmed fact requires an explicit choice. Disabling history retention alone does not silently change the separate memory consent. Releasing a pager does not delete the prior owner's history, but the new binding can never query it. Export is generated from the authoritative server view and is covered by the same authorization and audit policy.

Account deletion is a re-authenticated, explicitly confirmed operation. The gateway immediately revokes and unbinds all devices, advances their generations/nonces/recovery epochs, closes active streams, cancels pending exports, and schedules account, configuration, history, and structured-memory content for deletion under the published server-side SLA. Connected app installations receive a purge signal and erase caches. A disconnected installation cannot be remotely wiped: it may display its encrypted cache only until its current offline-cache authorization lease expires (at most 24 hours), then locks it until server contact; a definitive deletion/revocation response or revoked-credential response purges the cache instead of renewing the lease. Offline or powered-off pagers are unauthorized at the gateway immediately and, when they reconnect, purge binding/recovery state plus locally stored Wi-Fi and custom cellular credentials/profile before returning to capture-gated setup. Product copy distinguishes authoritative-store deletion, connected-replica purge, offline lease expiry, and eventual physical cache erasure, and states that provider abuse-monitoring retention follows the configured provider policy outside Mochi's deletion boundary.

This storage promise covers Mochi's systems, not every processor automatically. OpenAI currently documents that API data is not used to train models unless the customer opts in, while default abuse-monitoring logs may retain customer content for up to 30 days; eligible customers can request modified abuse monitoring or Zero Data Retention. Mochi does not use OpenAI's `/v1/conversations` endpoints as its product database because their application state persists until deleted and those endpoints are not Zero Data Retention eligible. Product copy and retention tests must name the configured provider policy instead of claiming universal “zero retention.” See [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

## App surface

The MVP app has four small areas:

1. **Add Mochi:** sign in, scan/setup-code, BLE provisioning, network test, and claim.
2. **Device:** connection health, firmware, volume/voice, and a nearby-only Wi-Fi/cellular editor.
3. **History:** explicit retention opt-in, conversation list/detail, export, item/session/all deletion, and pending-sync status. It remains accessible whenever retained records exist even if saving future conversations has been turned off.
4. **Privacy and ownership:** structured-memory controls, revoke a lost pager, release for resale, physical-SIM removal/deactivation guidance, and account deletion.

React Native is a reasonable cross-platform UI candidate, but the architecture depends on Espressif's maintained native iOS/Android provisioning libraries—not on an unproven third-party React Native wrapper. Track B must spike the native bridge, permissions, foreground onboarding, licensing, and memory use before freezing the app stack.

## EVT acceptance

- A factory-fresh pager is claimed and provisioned on both iOS and Android in under two minutes without plaintext credentials in a BLE trace.
- Wrong setup secrets, replayed claim tokens, attempts to claim an owned unit, and provisioning while `LIVE` all fail without leaking account or network data.
- An unused claim token fails after any competing claim, release, recovery, or revoke; stale config/consent writes fail across `binding_generation`.
- The boot chord enters capture-gated setup but cannot transfer ownership without account release or recovery authorization.
- Wi-Fi and a real modem/APN profile can each be configured and connection-tested; incorrect credentials produce bounded, non-secret errors.
- Resale release requires physical-SIM removal/deactivation confirmation; lost-device revocation and account deletion direct carrier deactivation, and no Mochi cloud action claims to cancel a carrier subscription.
- Two app installations converge from the same opaque cursor after duplicate, reordered, offline, reconnect, reinstall, and backup/restore scenarios; expired cursors force full reconciliation and no duplicate or deleted history item reappears.
- Retention-off leaves no durable transcript in Mochi-controlled storage; raw audio is absent from that storage in either mode; item/session/all deletion removes content from the authoritative store and connected app caches within the defined deletion SLA, while a deliberately disconnected cache becomes unreadable no later than its 24-hour authorization-lease expiry and is erased on its next server contact that returns an authoritative deletion/revocation or revoked-credential response.
- Device release/re-claim gives the new account no access to the prior account's history, while leaving the prior owner's retained history unchanged unless that owner deletes it.
- Release/re-claim closes live media and purges all prior-binding credentials, working context, captions, queues, transcript buffers, configuration, Wi-Fi credentials, custom cellular/APN/authentication profile, and prior recovery verifier from the pager before the new owner can use it, while preserving only immutable factory identity and installing a fresh new-binding recovery verifier.
- Derived-memory cascade/keep choices and re-authenticated account deletion produce the specified generation/nonce/recovery-epoch revocation, pager recovery/network-state purge, connected-cache purge, offline authorization-lease expiry, eventual offline-cache erasure, export cancellation, carrier action, and provider-boundary evidence.
- BLE traces contain no conversation audio or transcript, and the pager remains fully usable over Wi-Fi/cellular with the phone absent.

## Deferred decisions

- Exact identity provider plus the numeric recovery rate limits/cooldown and support vendor; the authorization invariants above must be frozen before Gate C.
- Final React Native/native-module implementation after the provisioning spike.
- Launch country, carrier, modem SKU, physical SIM versus managed SGP.32 eSIM, and any Direct-to-Cell trial.
- Retention duration and whether a later end-to-end-encrypted history tier is worth giving up server-side search and memory features.

Related decisions: [secure gateway](../decisions/0003_use_secure_realtime_gateway.md), [full-duplex sessions](../decisions/0006_use_button_started_full_duplex_sessions.md), [companion app](../decisions/0007_use_companion_app_and_cloud_history_sync.md), and [two controls](../decisions/0008_use_exactly_two_physical_controls.md).
