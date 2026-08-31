# Educational notes

These primers are written for a software engineer moving into connected hardware. Each stays focused enough to read in roughly three printed pages and links decisions back to the current product. The companion-app primers follow the selected [hybrid provisioning and synchronization architecture](../docs/design/0002_companion_app_and_sync_architecture.md): nearby secrets over secure BLE, durable account state and opt-in history through the gateway.

1. [System architecture: from a button press to a live conversation](0001_system_architecture.md)
2. [Modules, electrical buses, and embedded audio](0002_modules_buses_and_audio.md)
3. [PCB fundamentals and manufacturing](0003_pcb_fundamentals_and_manufacturing.md)
4. [Cellular, RF, power, and certification](0004_cellular_rf_power_and_certification.md)
5. [Realtime voice, memory, and privacy](0005_realtime_voice_memory_and_privacy.md)
6. [Companion app, Security 2 BLE provisioning, and server-ordered cloud sync](0006_companion_app_provisioning_and_sync.md)

Add future notes with the next monotonic prefix. Put teaching material here, product verdicts in `docs/decisions/`, and executable implementation only in `src/`.
