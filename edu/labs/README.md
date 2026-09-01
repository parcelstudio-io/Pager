# KiCad PCB labs

These labs convert the electrical lessons into fabrication evidence. Complete them in order:

1. [LED and button board](0001_led_button_board.md) — a low-voltage, through-hole, two-layer board whose behavior can be calculated and measured.
2. [Compute-module carrier](0002_module_carrier_board.md) — a modular embedded board with power, GPIO, connectors, debug access, decoupling, and test points.

Use the current stable KiCad release and the official [Getting Started in KiCad 10](https://docs.kicad.org/10.0/en/getting_started_in_kicad/getting_started_in_kicad.html) guide. The detailed [Schematic Editor](https://docs.kicad.org/10.0/en/eeschema/eeschema.html) and [PCB Editor](https://docs.kicad.org/10.0/en/pcbnew/pcbnew.html) manuals are the primary references for current controls. Menu names can move between versions, but the engineering sequence remains schematic → footprints → ERC → board rules → placement → routing/zones → DRC → fabrication outputs → inspection.

Do not skip a lab's gate. A rendered board image or clean DRC is not a working-board result.
