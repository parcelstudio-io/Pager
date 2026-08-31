# 0001 — EVT/MVP requirements

Status: Baseline for task 0001  
Date: 2026-08-30

These are testable targets, not claims about an unfinished device. “EVT” means the engineering-validation prototype; “product candidate” means the later integrated build.

## Product and interaction

| ID | Requirement | Verification |
|---|---|---|
| PR-01 | The product candidate fits within 95 × 60 × 30 mm. The stretch target is 80 × 56 × 26 mm. | Calipers and mass/volume record |
| PR-02 | The front face visibly distinguishes idle, listening, thinking, speaking, muted, offline, and low-battery states. | State-transition test and video |
| PR-03 | A physical action changes the face within 100 ms; animation sustains 30 fps without audio dropouts. | Instrumented UI test |
| PR-04 | A physical microphone-kill control has an indicator electrically coupled to its physical state, so application software cannot falsely clear it. | Continuity test and fault injection |
| PR-05 | EVT supports push-to-talk, release-to-send, and press-to-interrupt. | Ten-turn scripted conversation |
| PR-06 | No camera capture is enabled in MVP. The CoreS3 EVT camera has an opaque cover and no initialized driver/clock; production omits the sensor. | Physical inspection, firmware configuration, and traffic inspection |

## Voice quality and service

| ID | Requirement | Verification |
|---|---|---|
| VO-01 | Speech is intelligible at arm's length in a quiet room without holding the device against the mouth. | Recorded word-error and listener sample |
| VO-02 | On a stable Wi-Fi path, median release-to-first-audible-response is at most 800 ms and p95 is at most 1,500 ms. | At least 50 timestamped turns |
| VO-03 | A button press interrupts output within 250 ms. | Automated tone and event timestamps |
| VO-04 | A complete ten-turn conversation finishes without reset, stuck state, or credential exposure. | Acceptance script and logs |
| VO-05 | The model, voice, prompt, and retention settings are server configuration, not device constants. | Configuration-change test |

Latency targets are ambitious gates. Missing them does not justify hiding measurements; it triggers a breakdown of capture, uplink, model, downlink, buffering, and playback time.

## Connectivity

| ID | Requirement | Verification |
|---|---|---|
| NW-01 | Wi-Fi is the preferred path; the EVT works through a normal AP and a phone hotspot. | Two-network field test |
| NW-02a | With an already registered/warm cellular path, the system detects preferred-route loss, cancels the incomplete turn without replay, and restores an authenticated idle session within 15 seconds. | Controlled AP shutdown and session trace |
| NW-02b | Cold modem attach from its powered-down state has a separately measured target; it is not hidden inside the 15-second warm-failover requirement. | Cold-start trials at multiple signal levels |
| NW-03 | Device-to-gateway traffic uses authenticated TLS and a revocable per-device identity. | Packet inspection and credential revocation |
| NW-04 | No standard OpenAI API key is present in device flash, firmware images, logs, or network traces. | Binary/log scan and gateway audit |
| NW-05 | BLE is sufficient for provisioning and supported accessories. Bluetooth Classic/A2DP is not an MVP requirement. | Provisioning test |
| NW-06 | Cellular data volume, signal quality, reconnect count, and latency are measured during a 30–60 minute voice session. | Metered SIM and gateway logs |

## Power, thermal, and mechanics

| ID | Requirement | Verification |
|---|---|---|
| PW-01 | The cellular supply tolerates the selected modem's documented peak current without brownout or audible corruption. | Oscilloscope/current trace and soak test |
| PW-02 | Final battery capacity is selected only after measured average and peak loads exist. | Signed power budget |
| PW-03 | Product-candidate targets are at least 3 hours on a defined active-conversation profile and 24 hours on a defined mixed-standby profile. Each profile records brightness, turns/hour, audio duty, network, and cellular power/registration state. | Repeatable battery rundown |
| PW-04 | Before EVT power/thermal testing, datasheet limits define conservative abort temperatures. User-touch surfaces remain below the later DVT limit; EVT records cell, regulator/modem, PCB, and exterior temperature. | Instrumented worst-case cellular/charge soak |
| PW-05 | The cell retains its insulating wrapper and uses appropriate protection, charging, strain relief, and clearance. | Build inspection and safety review |
| PW-06 | The exterior frame is not used as an electrical conductor or ground bus. | Schematic/mechanical inspection |

## Memory, privacy, and operation

| ID | Requirement | Verification |
|---|---|---|
| MP-01 | Local persistent data is limited to firmware/assets, configuration, credentials, and a bounded diagnostic buffer. | Storage inventory |
| MP-02 | Raw audio is not retained by our service by default. | Storage/configuration audit |
| MP-03 | Long-term facts and summaries require explicit opt-in and support inspect, forget, and disable actions. | User-flow and deletion test |
| MP-04 | Location is absent or disabled by default; any GNSS-backed feature requires explicit user action and visible use. | Permission and traffic test |
| OP-01 | Signed OTA can recover from a failed update through rollback or a known recovery path. | Deliberately interrupted update |
| OP-02 | Logs correlate device, gateway, and provider timing without recording secrets or raw audio. | Log review |

## Gates

- Gate A — interaction mule: face simulator, gateway, and browser voice slice work; CoreS3 Lite is on hand.
- Gate B — standalone cellular purchase: Wi-Fi end-to-end voice passes, target deployment region is confirmed, and modem/SIM compatibility is checked.
- Gate C — first custom PCB: exact compute, display/touch, microphone/codec, amplifier/speaker, charger/power-path/gauge, connector set, USB host/device/debug roles, and one embedded modem transport are frozen from bench evidence; current peaks, battery budget, antenna keep-outs, and mechanical stack are measured.
- Gate D — integrated cellular: the external modem mule and intended embedded host pass attach, route/session transition, data, flow-control, reset/reconnect, power sequencing, peak/thermal, and antenna tests; a compliance lab has reviewed the plan.
- 5G gate — only opens if a measured product requirement cannot be met by LTE. “Newer” is not a requirement.
