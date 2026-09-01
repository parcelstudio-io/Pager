# 0002 — V1 beginner prototype build guide

Status: Ready for the first software and hardware bring-up
Date: 2026-08-31

This guide turns the existing Mochi Pager design into the smallest useful first build. It deliberately proves the conversation experience on a laptop before moving it to the purchased M5Stack CoreS3 K128. No soldering, custom PCB, external battery, cellular modem, BLE provisioning, or mobile app is needed for this build.

The repository originally selected the CoreS3 Lite as the interaction mule. The unit actually purchased is the full CoreS3 K128. Its screen, ESP32-S3, memory, Wi-Fi/BLE, and audio path cover the same first experiments, so **use the K128 already purchased and do not buy a second CoreS3 Lite**. See [ADR 0001](../decisions/0001_use_esp32s3_interaction_mule.md) and the [staged BOM](../research/0001_component_sources_and_bom.md).

## What this first build proves

The build has two deliberately separate checkpoints:

1. **Day-2 interaction/device simulator on the laptop:** run a local gateway and browser UI, start one live full-duplex session, talk without pressing for each turn, interrupt the assistant by speaking, and see an assistant caption slide below the face.
2. **CoreS3 incoming inspection and stock bring-up:** confirm the purchased board, cable, display, touch, microphones, speaker, and Wi-Fi are healthy before replacing vendor firmware. The face, caption, and live-audio path move to this board only after the browser checkpoint works.

Passing the browser checkpoint is not proof of CoreS3 audio, acoustic echo cancellation (AEC), battery life, embedded performance, or product privacy hardware. Passing the stock CoreS3 checks is not yet the complete pager. These two inexpensive checkpoints remove different kinds of uncertainty.

## Control boundary: exactly two in the product

The product still has exactly two physical controls:

1. An illuminated conversation button: press once to start listening; press again to stop.
2. A latching power slide switch: physically on or off.

The first development build uses temporary substitutes:

| Build stage | Conversation control | Power control | What this means |
|---|---|---|---|
| Laptop simulator | One on-screen `Start listening` / `Stop listening` button | Laptop power is outside the simulated pager | The on-screen button tests the interaction contract; it is not a third product control. |
| Stock CoreS3 bring-up | Touchscreen action may temporarily stand in for the conversation button | CoreS3's stock PMIC power button | Both are development-mule substitutes. The stock PMIC button is not the final latching hard-off switch. |
| Later product-like mule | One illuminated physical conversation button | One latching physical power slide switch | This is the required two-control product arrangement. |

Do not add volume, push-to-talk, reset, or mode buttons. Development settings can live on the laptop or touchscreen. The normal conversation control never becomes hold-to-talk; if full duplex fails, record the failure instead of quietly changing the interaction.

## Exact shopping list for this build

### Required electronics

| Qty | Item | Status / observed cost | Notes |
|---:|---|---|---|
| 1 | M5Stack CoreS3 K128 | Already purchased for $77.90 on 2026-08-31 | Use this board; do not also order the Lite. The price is a historical receipt value, not a current quote. |
| 1 | Known-good USB-C **data** cable | Existing cable or $5–10 observed | A charge-only cable can power the board while making it look unflashable. Mark a proven data cable. |
| 1 small piece | Removable opaque sticker or nonconductive tape | Use an existing supply; verify price before buying | Cover the camera aperture during EVT. This physical cover does not replace disabling camera initialization in later firmware. |

If the cable is already available, no further electronics order is needed for this first build. Prices, stock, tax, and shipping can change; verify them before any purchase. OpenAI API usage is separate and is not estimated here—check current pricing, create a dedicated project, and set a conservative usage alert/limit before the first live session.

### Equipment and access to prepare

These are required but are not pager BOM parts:

- A laptop running Node.js 20 or newer, with Git and a current browser.
- A working laptop microphone and speaker.
- A normal Wi-Fi network with internet access and credentials you are allowed to use.
- An OpenAI API project and API key stored only in the local gateway environment.
- A clean, dry, nonconductive work surface with good lighting.
- A notebook or text file for the board label, test date, pass/fail results, and observations.

### Optional now

- A phone and hotspot plan for one mobile-backhaul comparison after normal Wi-Fi works.
- Wired headphones for diagnosing laptop echo. Headphones can isolate a software problem, but they do not prove the eventual pager's speaker/microphone AEC.
- A second known-good USB-C data cable for comparison if enumeration fails.
- A phone camera for recording the face, caption, and interruption test.

### Explicitly deferred—do not buy for this build

- External digital microphone, I²S amplifier, speaker, breadboard, illuminated button, and latching switch. These are ordered only after the CoreS3 concurrent-audio baseline passes and its accessible pins are confirmed.
- SIM7600G-H or any other 4G/5G modem, SIM/data plan, LTE antenna, or Starlink hardware. A phone hotspot comes first; standalone cellular is a later Gate B experiment.
- Final battery, charger, power-path board, or loose LiPo cell.
- Custom display, custom PCB, production enclosure, GPS/GNSS module, or 3D print.
- Soldering station, oscilloscope, logic analyzer, or bench supply. None is needed for the no-wiring first build. Borrow/rent appropriate instruments when a later measured gate actually calls for them.
- Mobile-app or BLE-provisioning hardware. Those are later software tracks and add nothing to this shopping list.

## Preflight safety and privacy check

Before plugging in the CoreS3:

- Inspect the enclosure and USB connector. Do not power a crushed, cracked, wet, swollen, punctured, leaking, unusually warm, or chemically smelling unit.
- Do not open the CoreS3, remove battery insulation, solder to its cell, or replace its internal battery during this build.
- Work on a nonconductive surface, away from loose metal, liquid, and flammable clutter.
- Cover the camera aperture with removable opaque material. Later device firmware must also omit camera driver/clock initialization.
- Start speaker volume low to protect hearing and reduce acoustic feedback.
- Charge and test while present. If the board or battery becomes abnormally hot, swells, smells unusual, or behaves erratically, disconnect USB if it is safe to do so and stop using it.
- Keep the standard OpenAI API key only in the laptop's `.env`. Never paste it into browser code, CoreS3 firmware, screenshots, logs, chat, or a Git commit.
- Treat cyan/live as “microphone audio may leave the machine.” Use the stop action before discussing anything private, and close the page/server after testing.

No cellular antenna, bare battery, mains wiring, or exposed speaker-amplifier output is involved in this build.

## Part 1 — Run the laptop interaction/device simulator

The simulator is the fastest way to check the live-conversation design. It uses the laptop microphone/speaker and a local session broker. The standard API key remains on the server side; with the selected unified WebRTC flow, the browser sends its SDP offer to that broker and receives only the SDP answer—not the standard API key or a client credential.

### Step 1: verify Node.js

Open a terminal and run:

```bash
node --version
npm --version
```

The Node.js major version must be 20 or newer. Install or update Node before continuing if it is older or the commands are missing.

### Step 2: enter the repository

```bash
cd /home/jaewoo-jang/Desktop/Projects/Pager
```

Run the remaining commands from this directory.

### Step 3: create the local environment file

```bash
cp .env.example .env
```

Open `.env` in a text editor and find this line among the documented defaults:

```dotenv
OPENAI_API_KEY=replace_me
```

Replace only `replace_me` with the real key from the dedicated API project; the server intentionally refuses to run a live session while the placeholder remains. Do not add quotes unless the example file asks for them. Save the file, close the editor, and never commit `.env`. The prototype has zero runtime package dependencies, so no `npm install` step is required.

### Step 4: run the automated checks

```bash
npm test
```

Do not move on if a test fails. Copy the complete error into the test notebook, check the Node version, and try the basic fixes in the troubleshooting section.

### Step 5: start the local gateway and UI

```bash
npm start
```

Leave that terminal open. Open this exact address in a current browser:

```text
http://localhost:3000
```

Use `localhost`; do not open the HTML file directly with a `file://` URL. The first page should show the Mochi face, one conversation start/stop control, and a private/idle state. The caption position below the eyes is intentionally invisible while empty: there is no “Captions appear here” prompt, border, or tinted panel.

Before starting, confirm that both dark pupils are centered inside calm ivory eyes with subtle outer-eye motion. The first large idle gesture should begin after 3–5 seconds. After it returns to center, later gestures wait 6–12 seconds. Both pupils and apertures move together: they may look up, down, side to side, toward any of four screen corners, or make a 1.6–2.4 second clockwise/counterclockwise scan, and every path ends at center. The injected-randomness tests cover every gesture family and both timing bands, so a short manual watch need not sample them all. There is no mouth.

Face animation is optional: the conversation button is wired first, and a failed animation import or initialization leaves a static centered face rather than breaking Start/Stop. A later cosmetic fault likewise cannot remove that already-wired control. Enable the operating system/browser reduced-motion preference and reload once: idle gestures should stop and poses should become static. Turn that preference back off for the remaining motion test if desired. If the browser exposes the optional Battery Status API, a low host battery intentionally produces a dim, downward, less-active face; otherwise automated tests are the V1-A battery evidence. The CoreS3 port will use its PMIC/fuel gauge instead.

### Step 6: start one live session

1. Press `Start listening` once.
2. Allow microphone access when the browser asks.
3. Check that the UI shows a connecting state before a live state. Microphone capture must not be presented as live while connection setup is incomplete.
4. Say a short sentence, then stop speaking naturally.
5. Listen for the assistant response and watch its first words slide in from beyond the right edge at one steady, deliberately slow speed. Short and long captions use the same entrance. The visual caption may trail audio/token arrival and queue new text ahead, but arriving words must not restart, ease, or change the track's speed.
6. Continue for at least ten short exchanges without pressing once per utterance.

The microphone remains available while assistant audio plays. That simultaneous input/output behavior—not alternating turns—is the experiment.

Watch the face as well: listening draws the pupils attentively inward, thinking uses one side-to-side saccade sequence, and assistant speech changes the subtle alive rhythm. A model-selected allowlisted emotion should change aperture height, width, tilt, spacing, asymmetry, pupil size, and motion without speaking or captioning its control metadata. Starting speech must immediately cancel any large idle gesture, while the cyan/amber/off indicator remains the only listening truth.

### Step 7: test voice interruption

While the assistant is speaking, say a clear new sentence such as “Wait—let me correct that.” The audible assistant output should stop promptly, should not resume from the cancelled response, and the caption should not continue presenting unheard words. Continue speaking without pressing the button again.

This first pass is an observation, not the final 250 ms p95 barge-in measurement. The cancelled caption should disappear immediately rather than continuing its slow crawl. Record whether interruption felt immediate, whether the laptop heard its own speaker, and whether any old audio or caption text returned.

### Step 8: stop locally

Press `Stop listening` once while the assistant is idle, then repeat during assistant playback:

- Microphone capture and assistant playback should stop locally.
- The UI should return to private/idle.
- Talking afterward should not create a response.
- A page refresh or server restart must not automatically resume listening.

Stop the development server with `Ctrl+C` in the terminal when finished.

### Step 9: make the optional hotspot comparison

Only after the normal Wi-Fi session works:

1. Stop the conversation.
2. Connect the laptop to a phone hotspot.
3. Start the server/session again and repeat a short conversation plus one interruption.
4. Record the phone, carrier, location, and whether the phone reported LTE or 5G, if visible.

This tests the experience through that phone's mobile backhaul. It does **not** validate a pager modem, SIM/APN, LTE power bursts, antenna, cellular failover, BLE provisioning, or Starlink Direct to Cell.

## Part 2 — Inspect and baseline the CoreS3 K128

Do this when the purchased unit arrives. Preserve the vendor firmware until the baseline is recorded; otherwise a firmware bug and a delivery fault are hard to distinguish.

### Step 1: inspect before power

1. Photograph the sealed package and the board from all sides.
2. Record the exact product marking, board revision/serial information that is safe to retain, package contents, and arrival date.
3. Confirm the received unit is the expected full CoreS3 K128. Record whether its base module is present and the battery capacity marked by the vendor; do not infer package contents from an online listing.
4. Check the enclosure, screen, USB-C connector, and seams for shipping damage.
5. Apply the removable opaque camera cover without blocking the display, microphones, speaker, ventilation, or controls.

Stop and contact the seller if the hardware is materially damaged or is the wrong model.

### Step 2: connect without modifying hardware

1. Put the CoreS3 on the nonconductive surface.
2. Connect the proven USB-C data cable to the laptop, then to the CoreS3.
3. Follow the vendor-supported stock power-on behavior. Do not pry the case, attach GPIO wires, or flash new firmware yet.
4. Watch for abnormal heat, odor, repeated resets, display corruption, or USB disconnect/reconnect loops.

For this mule only, its stock side PMIC button is the temporary power control. It does not demonstrate the final latching switch or hardware-certain hard-off requirement.

### Step 3: run the stock-function checklist

Using the vendor image or supported examples, record pass/fail for:

- Display powers on with no missing regions or persistent corruption.
- Touch input responds across the useful screen area.
- Both microphones produce a detectable input in the available stock diagnostic/example.
- Speaker produces clean, low-volume output.
- Wi-Fi can see and join the intended test network.
- USB data connection appears reliably on the laptop.
- Charging/power indication behaves normally with no abnormal heat.
- Camera remains physically covered; do not use a camera feature as part of MVP validation.

If an available stock image does not expose one test, write “not yet tested”; do not convert absence of a test into a pass.

### Step 4: preserve the baseline

Record:

- CoreS3 model and observed revision.
- Laptop operating system, Node version, browser version, and later embedded toolchain version.
- USB cable used.
- Wi-Fi network type, without writing its password into the notebook or repository.
- Results and photographs for each stock-function check.
- Any resets, heat, audio distortion, touch dead zones, or cable sensitivity.

Only after this baseline should the project replace vendor firmware and port the face/caption state machine. That embedded port is the next implementation step, not a hidden requirement for completing the laptop checkpoint.

## Recommended bring-up order after these two checkpoints

Keep this order; each item removes one uncertainty before the next is added:

1. Port only the face, parallel session states, one touchscreen start/stop substitute, and sliding caption to the CoreS3.
2. Verify 30 fps UI and prompt response while offline. Power-on must remain private/idle.
3. Prove local simultaneous microphone capture and speaker playback using the CoreS3's synchronized audio/reference path.
4. Add and measure AEC before connecting live model audio.
5. Run Espressif's direct WebRTC/OpenAI reference path using a short-lived client credential minted by a server that retains the standard key. Treat this as the canonical V1-B media reference, not the final product gateway.
6. Connect the real Realtime session and repeat start, ten exchanges, voice interruption, caption clear, and stop. On the K128, also record the active response/output IDs, rendered-caption cursor, first-caption latency, one-segment lead limit, completion exit, immediate interruption clear, reliable heard-boundary accounting, and 2-inch legibility required by PR-07.
7. After the direct reference works, stream known audio through the ADR 0003 product-gateway adapter in both directions and compare its added latency. Do not make the beginner's first device conversation depend on finishing account/history/tool infrastructure.
8. Only after those pass, consider the product-like illuminated button, latching power switch, relocatable acoustic parts, and temporary enclosure.
9. Only after the enclosed Wi-Fi gate passes, decide whether to buy the separate cellular mule.

BLE onboarding, the mobile app, cloud history sync, physical SIM/APN configuration, and cellular failover remain later tracks. For this build, Wi-Fi credentials can be development configuration; do not present that as the final onboarding design.

## Acceptance checklist

### Laptop interaction/device simulator

- [ ] `npm test` passes on Node.js 20 or newer.
- [ ] `npm start` serves `http://localhost:3000` without exposing the standard API key to browser source or logs.
- [ ] The first screen is private/idle and does not capture automatically.
- [ ] With normal battery/motion settings, the dark pupils begin centered in ivory eyes with subtle continuous outer-eye motion, start a first synchronized large gesture after 3–5 seconds, return to center, and use 6–12 second pauses thereafter. Automated tests cover look-up, look-down, all four corners, side-to-side look-around, clockwise/counterclockwise scan selection, and conversation cancellation.
- [ ] Start/Stop remains independent of the optional face controller; automated receiver/load-order checks verify that import or initialization failure leaves a static centered fallback and that later cosmetic faults cannot remove the already-wired conversation control.
- [ ] Reduced-motion preference suppresses curious idle gestures. If the optional browser battery API exposes a low state, verify its subdued face; otherwise rely on the deterministic low/critical/charging tests. Battery treatment never changes or impersonates the capture indicator.
- [ ] The face contains exactly two large round eyes and no mouth or lips; attentive, thinking, and speaking cues remain visually distinguishable, and battery cues do too when the host exposes a battery signal.
- [ ] The empty caption position is transparent, with no placeholder text, border, or colored panel.
- [ ] There is one visible conversation start/stop control, not per-turn push-to-talk.
- [ ] Start visibly moves through connecting to live.
- [ ] At least ten exchanges work without another button press.
- [ ] The user can speak while assistant audio is playing.
- [ ] Clear near-end speech interrupts assistant playback and cancelled audio does not resume.
- [ ] A sliding assistant caption is directly below the face; its first text enters from beyond the right edge and moves left at a fixed 60 CSS px/s without easing or per-word speed changes, and transcript additions queue ahead without retargeting that motion.
- [ ] Completed playback keeps the caption moving left at 60 CSS px/s until it is fully beyond the left edge; it never reverses toward the right. Interruption clears it immediately; caption reset snaps to its zero position; with the browser/OS reduced-motion preference enabled, position changes snap rather than animate; and late cancelled text does not return.
- [ ] Stop during idle and stop during playback both return locally to private/idle.
- [ ] Talking after stop creates no response.
- [ ] Refresh/restart does not auto-start capture.
- [ ] A ten-minute basic session completes without a stuck state or stale playback.
- [ ] `.env`, keys, raw audio, and secrets are not committed or copied into test artifacts.
- [ ] Prompt tests pass: the `.ftl` begins `You are a companion`, server-rendered fixture context reaches the Realtime session configuration, and browser SDP cannot override it. The localhost defaults do not claim real account history or personalization.

### CoreS3 incoming baseline

- [ ] Received model/package contents are recorded rather than assumed.
- [ ] No visible damage, battery warning sign, abnormal heat, or unstable USB power is present.
- [ ] Camera aperture is opaquely covered.
- [ ] Known-good USB-C data cable enumerates reliably.
- [ ] Display, touch, microphone, speaker, and Wi-Fi checks are recorded as pass/fail/not-yet-tested.
- [ ] Vendor baseline is preserved before custom flashing.
- [ ] The stock PMIC control and touchscreen are labelled as temporary mule substitutes, not final two-control acceptance.

Completing both lists authorizes the embedded face/audio port. It does not pass the full Gate A acoustic/privacy requirements in [the MVP requirements](../requirements/0001_mvp_requirements.md).

## Common basic issues

| Symptom | First checks |
|---|---|
| `node` or `npm` is not found | Install Node.js 20 or newer, close/reopen the terminal, and repeat the version checks. |
| `npm test` fails immediately | Confirm the command is running from the repository root and capture the first full error, not only its last line. |
| Server reports a missing API key | Confirm `.env` exists beside `package.json`, the name is exactly `OPENAI_API_KEY`, and restart `npm start` after saving. Never print the key to diagnose it. |
| Authentication, quota, or billing error | Check the dedicated API project's key status, budget/usage limit, and current account billing. Do not create a key in browser code. |
| Browser never asks for microphone access | Open the exact `http://localhost:3000` address, check site microphone permissions, close duplicate tabs, and reload. |
| Microphone permission was denied | Re-enable microphone access in the browser's site settings, then restart the conversation. |
| Live session turns red after a microphone is unplugged or revoked | Restore the intended microphone, verify its browser permission/input selection, then press `Start listening` again. The prototype fails closed instead of leaving a false cyan state. |
| Connecting remains amber, then times out | Check internet access and the API project, stop duplicate tabs, and retry once. The prototype closes local media after the bounded readiness deadline. |
| No assistant audio | Check the laptop's selected output, mute/volume, Bluetooth audio routing, and whether another application has exclusive audio control. Start at low volume. |
| Assistant repeatedly interrupts itself | Reduce speaker volume, move the microphone/speaker apart, or use wired headphones as a diagnostic. Record this as an echo/AEC issue; headphones are not a product pass. |
| Caption is blank but audio works | Stop and restart once, then check the gateway/browser console for transcript or data-channel errors. Record the event before changing code. |
| Old speech resumes after interruption | Stop the session. Record the words, timing, and console events; this is a cancellation-generation bug, not normal behavior. |
| Stop button does not silence playback/capture | Close the browser tab and stop the server, then record the failure. Local stop is a required invariant and should be fixed before more testing. |
| Browser works on Wi-Fi but not hotspot | Confirm the laptop truly switched networks, the hotspot permits normal internet traffic, and the API project is reachable. Do not call this pager-cellular validation. |
| CoreS3 powers but is absent from the laptop | Try the proven data cable, another laptop USB data port, and the vendor-supported USB/boot procedure. A glowing screen alone does not prove data connectivity. |
| CoreS3 repeatedly resets | Disconnect nonessential USB devices, use the known-good cable/port, preserve the stock image, and record the visible error. Do not open the case or attach an external battery. |
| CoreS3 becomes unusually hot, swells, or smells odd | Disconnect it if safe, move away from combustible material, stop testing, and contact the seller/manufacturer. Do not recharge or puncture it. |

When a basic fix does not resolve an issue, save the smallest reproducible sequence and stop the dependent step. A clear “not yet tested” or failed checkpoint is more useful than adding unplanned hardware.
