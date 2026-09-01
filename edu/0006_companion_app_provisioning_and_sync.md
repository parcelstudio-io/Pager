# 0006 — Companion apps, Bluetooth setup, and synchronization from first principles

## Before you start

Read [0000: IoT and electrical fundamentals](0000_start_here_iot_and_electrical_fundamentals.md) first. [0004](0004_cellular_rf_power_and_certification.md) explains modems and cellular profiles, while [0005](0005_realtime_voice_memory_and_privacy.md) separates working context, user memory, and conversation history.

This lesson assumes you understand mobile apps, HTTP APIs, authentication, and databases. It does not assume Bluetooth or embedded-device experience.

By the end, you should be able to explain:

- why a new IoT device cannot simply download its Wi-Fi password;
- what Bluetooth Low Energy advertising, connections, services, and characteristics are;
- the difference between provisioning, claiming, authentication, and authorization;
- why nearby secrets and cloud-synchronized settings use different paths;
- how revision numbers, idempotency keys, cursors, and tombstones make offline sync predictable.

## 1. Why a companion app exists

A new pager has no keyboard and does not yet know the home Wi-Fi password. It cannot call the cloud to ask for that password because it needs the password to reach the cloud.

This is a bootstrap problem, similar to deploying a server that cannot fetch its configuration until it has network credentials.

The phone already has three useful capabilities:

1. a screen and keyboard for entering setup data;
2. a nearby radio that can reach the unconfigured pager;
3. an internet connection and a signed-in user account.

The companion app bridges those capabilities. It is not required to relay every conversation. Once configured, the pager should work without the phone nearby.

## 2. Four words that should not be mixed together

- **Provisioning** gives a device what it needs to operate, such as Wi-Fi credentials and a cellular access point name.
- **Claiming** records that a particular account owns or controls a particular device.
- **Authentication** proves an identity, such as "this is device 42" or "this is Jae's signed-in app."
- **Authorization** decides what that authenticated identity may do.

Software analogy:

```text
provisioning    ~= installing runtime configuration
claiming        ~= inserting an account_device ownership row
authentication ~= validating a session or client certificate
authorization  ~= evaluating an access-control policy
```

One successful Bluetooth connection does not automatically prove all four.

## 3. Bluetooth Low Energy in plain language

**Bluetooth Low Energy (BLE)** is a short-range radio protocol designed for small, intermittent exchanges. It is distinct from Bluetooth Classic audio profiles used by many headphones.

During Mochi setup, the pager is the **peripheral** and the phone is the **central**:

1. The pager **advertises** a small public packet saying that a setup-capable device is nearby.
2. The phone **scans** and sees that advertisement.
3. The phone opens a BLE **connection** to that specific pager.
4. The two sides establish an authenticated encrypted session.
5. The app writes bounded setup messages and reads acknowledgements.
6. The pager stops advertising when setup finishes.

BLE application data is commonly organized using the **Generic Attribute Profile (GATT)**:

- A **service** groups one capability, such as network provisioning.
- A **characteristic** is a typed value or message endpoint within that service.
- The phone may read, write, or subscribe to a characteristic, depending on its permissions.

An imperfect but useful analogy is a tiny local API:

```text
service        ~= API namespace
characteristic ~= endpoint or field
read/write     ~= request method
notification   ~= server-pushed event
```

The analogy has limits. GATT messages are small, discovery and connection state matter, and mobile operating systems impose Bluetooth permission and background-execution rules.

## 4. Encryption is not the same as trust

An encrypted channel prevents a passive observer from reading bytes. It does not by itself answer:

- Did the phone connect to the intended physical pager?
- Is the peer an authorized owner or merely someone nearby?
- Is this message fresh, or was an old setup message replayed?
- Is the user seeing the same device identity that the server will claim?

A protected provisioning protocol therefore needs:

- a way for both sides to derive or exchange session keys;
- authentication tied to a device-specific proof or fresh setup challenge;
- integrity protection so messages cannot be modified silently;
- replay resistance using a **nonce**—a fresh value intended for one setup attempt—plus counters or short-lived tokens, so an old valid message cannot simply be sent again;
- explicit length and schema validation;
- a clean end state that erases temporary secrets from memory.

Mochi uses Espressif's protocomm **Security 2** mode rather than inventing a new cryptographic handshake. "Security 2" is the product/library mode name; it does not mean "version 2 of all Bluetooth security." Exact protocol choices belong in the architecture documents, not in this mental model.

## 5. Nearby path versus cloud path

Not all configuration belongs in the same database.

### Nearby secret path

The phone sends custom network secrets directly to the nearby pager over the protected BLE session:

```text
phone --protected BLE--> pager's encrypted credential storage
```

Examples include:

- Wi-Fi network name and password;
- a custom cellular access point name (APN);
- cellular username/password if the carrier requires them.

The app should discard these after the pager acknowledges storage. They do not need to pass through Mochi's cloud.

### Cloud synchronization path

Non-secret account state uses authenticated internet APIs:

**Hypertext Transfer Protocol Secure (HTTPS)** is ordinary web HTTP protected by **Transport Layer Security (TLS)**. TLS encrypts the connection and lets the client verify the server's identity.

```text
phone app ----HTTPS----> gateway <----TLS---- pager
```

Examples include:

- device ownership;
- volume or voice preference;
- consent settings;
- prompt/profile version;
- opt-in conversation history.

The cloud path works when the phone is far away and gives all clients one ordering authority. The BLE path solves local bootstrap and keeps network secrets nearby. Calling both paths "sync" hides this important trust boundary.

## 6. What cellular configuration actually means

A **subscriber identity module (SIM)**, whether physical or embedded, contains carrier identity credentials. It is not normally programmed by the Mochi app.

The app may need to collect a carrier data profile:

- **APN (access point name):** selects the carrier's packet-data network;
- internet protocol choice, usually IPv4, IPv6, or both;
- optional username and password;
- roaming policy;
- modem-specific profile selection.

Many consumer SIMs configure these automatically. If a user chooses a known carrier, the app can select signed public preset metadata. A custom profile is treated as a secret and travels only through protected BLE.

"Starlink" is not a generic APN. Satellite direct-to-cell availability depends on country, partner carrier, plan, device/modem support, and permitted data use. It must be tested as a specific carrier path, not represented as a universal toggle.

## 7. Claiming a physical device

Provisioning gets a device online. Claiming binds it to an account.

A simplified first-claim flow is:

1. The app signs the user in through the gateway.
2. The pager shows or advertises a fresh setup identity/challenge.
3. The app asks the gateway for a short-lived, single-use claim token for that device and account.
4. The app sends the token to the nearby pager over the protected BLE session.
5. The pager connects to the gateway using its own device identity and redeems the token.
6. The gateway atomically creates the account-device binding.
7. The pager and app receive confirmation, then temporary claim material is erased.

Why make the pager redeem the token? It proves that the cloud-visible device and the nearby physical device participate in the same flow. If the phone simply announced "I own serial 42," a copied serial number could be enough to attack ownership.

A token should be bound to the intended account, device, setup attempt, expiry, and current ownership generation. It should have one effect even if a retry sends it twice.

## 8. Setup access is not ownership transfer

Physical proximity can justify opening a setup screen, but it is weaker than account ownership.

Mochi has two physical controls: a conversation button and a latching power switch. A new device can enter capture-gated setup automatically. An owned device can reopen network repair from its touchscreen, through an authenticated online app request while private-idle, or through a deliberate boot-only chord when offline.

None of those actions alone transfers ownership. Transfer requires the existing owner's release or a server-authorized recovery flow. On an ownership change, old account credentials, recovery proofs, cached context, and local Wi-Fi/custom cellular secrets must be purged before the next owner can use the pager.

The detailed nonce and generation rules are intentionally left to the [companion-app architecture](../docs/design/0002_companion_app_and_sync_architecture.md). Learn the boundary first: **nearby setup repairs operation; cloud authority decides ownership**.

## 9. Synchronization starts with an authority decision

Suppose the phone changes volume while the pager is offline, and the pager changes it locally before reconnecting. Which value wins?

Using timestamps sounds easy, but phone and device clocks can be wrong. Instead, Mochi's gateway owns an ordered configuration document.

The document has a **revision number**, similar to an optimistic-lock version:

```json
{
  "config_revision": 18,
  "volume": 0.65,
  "voice": "marin"
}
```

A client sends the revision it edited:

```text
update volume to 0.75 if config_revision is still 18
```

The gateway either:

- commits revision 19; or
- rejects the write with the newer document so the UI can show a conflict.

Each mutation also has a **client mutation ID**, which is an idempotency key. Retrying the same request after a timeout produces one logical change, not two.

The **binding generation** identifies the current ownership era. After transfer, writes from an old owner's generation are rejected even if their revision number once existed.

## 10. History synchronization is an event log

Conversation history is different from a settings document. It grows as a sequence of events:

```text
server_seq 101  user message
server_seq 102  assistant heard response
server_seq 103  tool result summary
server_seq 104  delete event 101
```

The gateway assigns `server_seq`; client clocks do not define order.

The app asks for records after an opaque **cursor**:

```text
GET /history?after=<opaque-cursor>
```

The server returns the next page and another cursor. "Opaque" means the client stores and returns it without decoding internal fields.

A deletion is propagated as a **tombstone**: an event saying a record was deleted without repeating its content. This prevents an offline cache from re-uploading or redisplaying an old copy. If a client has been offline longer than the server can safely honor its cursor, it must perform a full authenticated reconciliation.

The phone's history database is an encrypted cache. The gateway remains the authority. BLE carries neither transcript history nor live conversation audio.

## 11. One complete onboarding trace

```text
User enters Wi-Fi password in app
        |
        v
App finds advertising pager over BLE
        |
        v
App and pager establish protected setup session
        |
        +--> app writes Wi-Fi/custom APN directly to pager
        |
        +--> app writes short-lived claim token
        v
Pager tests network and connects to gateway
        |
        v
Pager redeems token with its own device identity
        |
        v
Gateway commits ownership generation 1
        |
        v
Pager acknowledges; app discards local network secrets
        |
        v
BLE advertising and setup session stop
```

At no point does the app remotely start microphone capture. Setup remains capture-gated, and normal listening still requires the local conversation button.

## 12. Debug each boundary separately

When onboarding fails, do not debug "Bluetooth" as one blob.

1. **Discovery:** Did the phone see the intended advertisement and device identifier?
2. **Connection:** Did BLE connect and remain in the foreground?
3. **Secure session:** Did both peers authenticate the same setup attempt?
4. **Schema:** Were message version, type, and length accepted?
5. **Credential storage:** Did the pager persist the network profile without logging it?
6. **Link:** Did it associate with Wi-Fi or attach to cellular?
7. **Reachability:** Did Domain Name System (DNS), time, and Transport Layer Security (TLS) work?
8. **Claim:** Did the gateway accept the one-time token and device identity?
9. **Cleanup:** Did the app erase temporary secrets and did the pager stop advertising?

This is the hardware equivalent of separating DNS, **Transmission Control Protocol (TCP)**, TLS, authentication, and application errors instead of reporting every backend failure as "network error."

## Check your understanding

1. Why can the pager not fetch its initial Wi-Fi password from the cloud?
2. What is the difference between BLE advertising and a BLE connection?
3. Why does an encrypted channel not automatically prove ownership?
4. Which path should carry a custom APN: protected nearby BLE or cloud configuration sync?
5. Why is a revision number safer than client timestamps for settings conflicts?
6. What problem does a deletion tombstone solve?

Answers: (1) reaching the cloud already requires network credentials; (2) advertising announces presence with tiny public packets, while a connection supports an ongoing exchange; (3) encryption protects a peer-to-peer channel but does not define who the peer is authorized to act for; (4) protected nearby BLE; (5) the authoritative server orders writes without trusting clocks; (6) it prevents stale replicas from resurrecting deleted content.

## Where Mochi's exact decisions live

This primer teaches the mental model. Exact claim tokens, recovery proofs, consent fields, cache leases, deletion service levels, and platform choices live in [ADR 0007](../docs/decisions/0007_use_companion_app_and_cloud_history_sync.md), [ADR 0008](../docs/decisions/0008_use_exactly_two_physical_controls.md), the [companion-app and synchronization architecture](../docs/design/0002_companion_app_and_sync_architecture.md), and the [MVP requirements](../docs/requirements/0001_mvp_requirements.md). Espressif's [network provisioning component](https://components.espressif.com/components/espressif/network_provisioning) and [protocomm documentation](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/provisioning/protocomm.html) are implementation references, not substitutes for the concepts above.
