#!/usr/bin/env python3
"""Verify the desk-checkable Mochi R1 Walter-carrier reference claims.

This is deliberately stricter than a document linter and deliberately weaker
than a claim that hardware works.  It checks the generated contract, schematic,
placement PCB, and KiCad ERC/DRC output.  RF, thermal, acoustic, battery, and
certification claims remain physical validation gates.
"""

from __future__ import annotations

import csv
import json
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
HW = ROOT / "hardware" / "mochi"
DOC = HW / "doc"
MANIFEST_PATH = DOC / "design_manifest.json"
CONNECTIVITY_PATH = DOC / "connectivity.csv"
PIN_MAP_PATH = DOC / "pin_map.csv"
BOM_PATH = DOC / "bom.csv"
SCHEMATIC_PATH = HW / "mochi.kicad_sch"
PCB_PATH = HW / "mochi.kicad_pcb"

passes: list[tuple[str, str]] = []
warnings: list[tuple[str, str]] = []
failures: list[tuple[str, str]] = []


def check(condition: bool, name: str, detail: str = "") -> None:
    (passes if condition else failures).append((name, detail))


def warn(name: str, detail: str = "") -> None:
    warnings.append((name, detail))


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


for artifact in (
    MANIFEST_PATH,
    CONNECTIVITY_PATH,
    PIN_MAP_PATH,
    BOM_PATH,
    SCHEMATIC_PATH,
    PCB_PATH,
):
    check(artifact.is_file() and artifact.stat().st_size > 0,
          f"Artifact exists: {artifact.relative_to(ROOT)}")

if failures:
    for name, detail in failures:
        print(f"FAIL  {name}: {detail}")
    sys.exit(1)

manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
connectivity = read_csv(CONNECTIVITY_PATH)
pin_map = read_csv(PIN_MAP_PATH)
bom = read_csv(BOM_PATH)
schematic = SCHEMATIC_PATH.read_text(encoding="utf-8")
pcb = PCB_PATH.read_text(encoding="utf-8")

components = {item["ref"]: item for item in manifest["components"]}
bom_refs = {row["reference"] for row in bom}
nets = {
    row["net"]: set(filter(None, row["endpoints"].split(";")))
    for row in connectivity
}


def exact_net(net: str, expected: set[str]) -> None:
    actual = nets.get(net, set())
    check(actual == expected, f"Exact endpoints for {net}",
          f"expected={sorted(expected)} actual={sorted(actual)}")


# Release boundary and generated-artifact consistency.
check(manifest["status"] == "REFERENCE_ONLY_NOT_RELEASED_FOR_FABRICATION",
      "Release boundary is machine-readable", manifest["status"])
check(components.keys() == bom_refs, "Manifest/BOM reference parity",
      f"manifest-only={sorted(components.keys() - bom_refs)}; "
      f"BOM-only={sorted(bom_refs - components.keys())}")
endpoint_refs = {endpoint.split(".", 1)[0] for eps in nets.values() for endpoint in eps}
check(endpoint_refs <= components.keys(), "Connectivity uses known references",
      str(sorted(endpoint_refs - components.keys())))
check("MOCHI R1 WALTER REFERENCE - DO NOT FAB" in pcb,
      "PCB visibly says DO NOT FAB")

# Mechanical/stack-up facts and the intentionally unrouted state.
board = manifest["board_mm"]
check(board == {"width": 60, "height": 82, "thickness": 1.2, "layers": 4},
      "Board envelope and stack-up contract", str(board))
for layer in ("F.Cu", "In1.Cu", "In2.Cu", "B.Cu"):
    check(f'"{layer}"' in pcb,
          f"Copper layer present: {layer}")
check(pcb.count("(keepout ") >= 4,
      "Walter PCB-antenna keepout exists on every copper layer",
      f"keepouts={pcb.count('(keepout ')}")
segments = pcb.count("(segment ")
vias = pcb.count("(via ")
check(segments == 0 and vias == 0,
      "PCB remains an unrouted placement study",
      f"segments={segments}, vias={vias}")
warn("PCB is intentionally not fabrication-ready",
     "All ratsnest opens must be routed after released footprints and layout review.")

# Walter's modem UART, SIM, RF front end, and ESP USB are internal to U10.  The
# carrier therefore has no raw modem voltage translation or second 5 V rail.
check(components["U10"]["value"] == "WALTER P000000100 N16R2",
      "Purchasable Walter LTE-M baseline is frozen",
      components["U10"]["value"])
exact_net("DBG_TX", {"U10.IO43/TX0", "TP1.1"})
exact_net("DBG_RX", {"U10.IO44/RX0", "TP2.1"})
exact_net("WALTER_DFU_N", {"U10.IO0/DFU/3V3_EN", "TP3.1"})
exact_net("WALTER_RESET_N", {"U10.RESET/EN", "TP4.1"})
check({"U5.VOUT", "U6.VIN", "U6.EN", "U10.VIN"} <= nets["SYS_SW"],
      "Master switched rail powers Walter and the peripheral converter",
      str(sorted(nets["SYS_SW"])))
check("J1.VBUS" in nets["VBUS_CONN"] and "U3.VBUS" in nets["VBUS_5V"],
      "User USB-C is charging-only and reaches the BQ power path through F1")
check(not any(net.startswith("USB_DP") or net.startswith("USB_DM") for net in nets),
      "No user-accessible USB data path can back-power Walter")

# Hard-off topology: the small slide only commands a protected, reverse-
# blocking switch.  Charger and gauge remain intentionally battery-attached.
check({"SW1.ON", "U5.ON", "R6.1"} == nets["PWR_SW_ON"],
      "One slide command gates the master load switch",
      str(sorted(nets["PWR_SW_ON"])))
check({"U3.SYS", "L1.2", "C6.1", "C7.1", "SW1.COMMON", "U5.VIN", "C10.1"}
      == nets["SYS_ALWAYS"],
      "Always-alive rail is limited to charger storage and switch entry",
      str(sorted(nets["SYS_ALWAYS"])))
check({"J2.PACK-", "RS1.PACK", "U4.CSP"} == nets["PACK_N"] and
      {"RS1.SYSTEM", "U4.CSN"} <= nets["GND"],
      "MAX17055 low-side Kelvin sense polarity follows vendor application",
      f"PACK_N={sorted(nets['PACK_N'])}")
hard_off = manifest["hard_off"]
check({"SYS_SW", "3V3_PERIPH", "MIC_3V3", "CAM_3V3"} <= set(hard_off["rails_off"]),
      "Hard-off contract names every sensitive rail")
check(components["U5"]["value"] == "TPS22950" and
      any("reverse-current blocking" in item for item in hard_off["backpower_controls"]),
      "Disabled-state reverse blocking is explicit at the master switch")
check("hidden" in " ".join(hard_off["backpower_controls"]).lower(),
      "Walter's directly tied USB/VIN path is an explicit enclosure constraint")

# Privacy truth path: CAPTURE_EN has a fail-safe pull-down, while the cyan LED
# is powered by the downstream microphone rail rather than an independent GPIO.
exact_net("CAPTURE_EN", {"U10.IO41", "U12.EN", "R14.1"})
check(components["R14"]["value"].startswith("100k"),
      "CAPTURE_EN pull-down is populated", components["R14"]["value"])
check({"U12.VOUT", "U13.VCC", "MK1.VDD", "D1.A", "C18.1"} == nets["MIC_3V3"],
      "Cyan LED is inseparable from powered mic/isolation domain",
      str(sorted(nets["MIC_3V3"])))
check(components["D1"]["population"] == "FIT",
      "Cyan capture indicator is fitted")

# Configuration/DNP boundaries.
for ref in ("U15", "R17", "J6", "D3", "R18"):
    check(components[ref]["population"] == "DNP",
          f"MVP camera path is DNP: {ref}")
switches = {ref for ref in components if ref.startswith("SW")}
check(switches == {"SW1", "SW2"}, "Exactly two exterior control classes",
      str(sorted(switches)))

# Walter-exposed ESP32 GPIO contract and generated CSV parity.  GPIO0 is kept
# exclusively on the vendor DFU/3V3-enable pin and factory pad.
gpio = {int(row["gpio"]): row["net"] for row in pin_map}
manifest_gpio = {int(number): item["net"] for number, item in manifest["gpio"].items()}
check(gpio == manifest_gpio, "GPIO CSV/manifest parity")
check(not (set(gpio) & {3, 45, 46}), "No functional strapping GPIO assigned",
      str(sorted(set(gpio) & {3, 45, 46})))
check(set(gpio) <= {1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18,
                    38, 39, 40, 41, 42, 43, 44},
      "Only documented Walter external GPIO are allocated", str(sorted(gpio)))
check(0 not in gpio and "WALTER_DFU_N" in nets,
      "GPIO0 remains DFU/3V3-enable only, not a product function")
check(len(gpio.values()) == len(set(gpio.values())),
      "No GPIO is assigned to two named functions")

# I2C and throughput/power arithmetic.  These establish a plausible contract,
# not measured cellular/audio performance.
addresses = manifest["i2c_addresses"]
numeric_addresses = [int(re.match(r"0x[0-9A-Fa-f]+", value).group(), 16)
                     for value in addresses.values()]
check(len(numeric_addresses) == len(set(numeric_addresses)),
      "No declared I2C address collision", str(addresses))
check(addresses["BQ25628E"] == "0x6A",
      "Selected charger address is frozen at 0x6A", addresses["BQ25628E"])
limits = manifest["electrical_limits"]
check(limits["firmware_low_battery_shutdown_v"] > limits["walter_vin_v"]["minimum"],
      "Firmware cutoff has headroom above Walter's 3.0V VIN minimum",
      f"cutoff={limits['firmware_low_battery_shutdown_v']}V")
check(limits["walter_3v3_output_a_max"] == 0.25 and
      nets["WALTER_3V3_TP"] == {"U10.3V3_OUT", "TP9.1"},
      "Walter 3V3_OUT is measurement-only, not tied to peripheral power")
check(limits["internal_modem_uart_8n1_payload_bit_s"] ==
      limits["internal_modem_uart_baud_default"] * 8 / 10,
      "Default 115200 8N1 modem UART payload arithmetic is 92.16kbit/s",
      "Enough on paper for low-rate Opus; latency/jitter/socket buffering remain bench gates.")

# Vendor-reference power values and two critical programmed limits.
check(components["L1"]["value"].startswith("1uH") and
      components["C4"]["value"].startswith("47nF") and
      components["C5"]["value"].startswith("4.7uF"),
      "BQ25628E inductor/bootstrap/REGN reference parts are explicit")
check(components["R3"]["value"].startswith("4.99k") and
      limits["usb_default_input_a"] == 0.5,
      "BQ hardware input limit is the conservative 500mA configuration")
check(components["R4"]["value"].startswith("5.23k") and
      components["R5"]["value"].startswith("30.1k"),
      "BQ 103AT-class NTC divider matches TI's reference values")
check(components["L2"]["value"].startswith("0.47uH") and
      components["R8"]["value"].startswith("511k") and
      components["R9"]["value"].startswith("91k"),
      "TPS63802 3.3V reference inductor and feedback values are explicit")
ilim = 1.18 * (0.523 ** -1.072)
check(2.3 <= ilim <= 2.5 and components["R7"]["value"].startswith("523R"),
      "TPS22950 current-limit equation agrees with the 2.4A target",
      f"calculated typical={ilim:.3f}A")
walter_bulk_uf = sum(float(re.match(r"[0-9.]+", components[ref]["value"]).group())
                      for ref in ("C14", "C15"))
check(walter_bulk_uf >= 200,
      "Walter VIN has 200uF nominal EVT reservoir before derating",
      "Final value must follow measured low-cell/weak-signal droop.")

# Every generated net is represented in both KiCad artifacts.
missing_sch = sorted(net for net in nets if f'global_label "{net}"' not in schematic)
missing_pcb = sorted(net for net in nets if f'"{net}"' not in pcb)
check(not missing_sch, "All contract nets appear in schematic", str(missing_sch))
check(not missing_pcb, "All contract nets appear in PCB", str(missing_pcb))

# Native KiCad parser checks.  ERC must be clean.  DRC must contain only the
# expected unrouted-reference warnings (and an allowed generated-library parity
# warning), never a geometric/electrical hard error.
kicad_cli = shutil.which("kicad-cli")
check(kicad_cli is not None, "kicad-cli is available")
if kicad_cli:
    with tempfile.TemporaryDirectory(prefix="mochi-kicad-") as tmp:
        tmp_path = Path(tmp)
        erc_report = tmp_path / "erc.rpt"
        drc_report = tmp_path / "drc.rpt"
        netlist_xml = tmp_path / "actual-netlist.xml"

        exported = subprocess.run(
            [kicad_cli, "sch", "export", "netlist", "--format", "kicadxml",
             "--output", str(netlist_xml), str(SCHEMATIC_PATH)],
            cwd=ROOT, text=True, capture_output=True, check=False,
        )
        check(exported.returncode == 0 and netlist_xml.exists(),
              "KiCad exports the actual schematic netlist",
              (exported.stdout + exported.stderr).strip())
        if exported.returncode == 0 and netlist_xml.exists():
            actual_nets: dict[str, set[str]] = {}
            root = ET.parse(netlist_xml).getroot()
            for net_element in root.findall("./nets/net"):
                net_name = net_element.get("name", "")
                endpoints: set[str] = set()
                for node in net_element.findall("node"):
                    pin_function = re.sub(r"_\d+$", "", node.get("pinfunction", ""))
                    endpoints.add(f"{node.get('ref')}.{pin_function}")
                actual_nets[net_name] = endpoints
            net_differences = {
                name: {
                    "contract": sorted(nets.get(name, set())),
                    "kicad": sorted(actual_nets.get(name, set())),
                }
                for name in sorted(set(nets) | set(actual_nets))
                if nets.get(name, set()) != actual_nets.get(name, set())
            }
            check(not net_differences,
                  "Generated contract exactly matches KiCad's real connectivity",
                  json.dumps(net_differences, sort_keys=True))

        erc = subprocess.run(
            [kicad_cli, "sch", "erc", "--output", str(erc_report), str(SCHEMATIC_PATH)],
            cwd=ROOT, text=True, capture_output=True, check=False,
        )
        erc_text = erc_report.read_text(encoding="utf-8") if erc_report.exists() else ""
        check(erc.returncode == 0 and "** ERC messages: 0" in erc_text,
              "KiCad ERC has zero violations",
              (erc.stdout + erc.stderr).strip())

        drc = subprocess.run(
            [kicad_cli, "pcb", "drc", "--schematic-parity", "--severity-all",
             "--output", str(drc_report), str(PCB_PATH)],
            cwd=ROOT, text=True, capture_output=True, check=False,
        )
        report = drc_report.read_text(encoding="utf-8") if drc_report.exists() else ""
        categories = set(re.findall(r"^\[([^]]+)\]", report, flags=re.MULTILINE))
        allowed = {"unconnected_items", "lib_footprint_mismatch"}
        unexpected = sorted(categories - allowed)
        check("unconnected_items" in categories,
              "DRC confirms intentional ratsnest opens", str(sorted(categories)))
        check("net_conflict" not in categories,
              "PCB/schematic parity has no net conflict", str(sorted(categories)))
        check(not unexpected, "DRC has no unexpected violation categories",
              str(unexpected))
        warn("KiCad DRC is intentionally non-zero",
             f"categories={sorted(categories)}; routing is outside this reference release")


width = 78
print("=" * width)
print("Mochi R1 Walter carrier — desk verification".center(width))
print("=" * width)
for label, detail in passes:
    print(f"PASS  {label}")
    if detail:
        print(f"      {detail}")
for label, detail in warnings:
    print(f"WARN  {label}")
    if detail:
        print(f"      {detail}")
for label, detail in failures:
    print(f"FAIL  {label}")
    if detail:
        print(f"      {detail}")
print("-" * width)
print(f"{len(passes)} passed, {len(warnings)} warnings, {len(failures)} failed")
print("Physical gates still required: power/inrush, off-state back-power, RF/VNA +")
print("TRP/TIS/SAR, thermal, battery-abuse, audio/AEC, EMC, PTCRB, and carriers.")
sys.exit(1 if failures else 0)
