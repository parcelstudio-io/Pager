#!/usr/bin/env node
/*
 * Generate the Mochi R1 Walter-carrier electrical-reference KiCad project.
 *
 * This is intentionally a deterministic, module-level reference schematic and
 * placement study.  It is not a release-to-fabrication design: the QFN power
 * stages still require vendor-reference passives, exact production footprints,
 * routing, impedance work, and peer review.  Keeping the generator next to the
 * verification tool makes the abstraction explicit and reproducible.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "../..");
const OUT = path.join(ROOT, "hardware/mochi");
const DOC = path.join(OUT, "doc");

function uuid(key) {
  const h = crypto.createHash("sha1").update(`mochi-r1-walter:${key}`).digest("hex").slice(0, 32).split("");
  h[12] = "5";
  h[16] = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  const s = h.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

function q(value) {
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function safe(value) {
  return String(value).replace(/[^A-Za-z0-9_+-]/g, "_");
}

function footprintId(c) {
  return `${c.ref}_${c.footprint}`;
}

function pin(name, net) {
  return { name, net };
}

const S = "https://";
let components = [
  {
    ref: "J1", value: "USB4105-GF-A", maker: "GCT", role: "USB-C 2.0 power/data receptacle",
    footprint: "USB-C-16P", datasheet: `${S}gct.co/connector/usb4105`,
    pins: [pin("VBUS", "VBUS_5V"), pin("GND", "GND"), pin("D+", "USB_CONN_DP"), pin("D-", "USB_CONN_DM"), pin("CC1", "USB_CC1"), pin("CC2", "USB_CC2"), pin("SHIELD", "GND")],
    pcb: { x: 129, y: 127.8, w: 9, h: 7 }
  },
  {
    ref: "U1", value: "TPD4E05U06", maker: "Texas Instruments", role: "USB D+/D-/CC ESD array",
    footprint: "USON-10", datasheet: `${S}www.ti.com/product/TPD4E05U06`,
    pins: [pin("D1_IN", "USB_CONN_DP"), pin("D1_OUT", "USB_DP_ESD"), pin("D2_IN", "USB_CONN_DM"), pin("D2_OUT", "USB_DM_ESD"), pin("D3_IN", "USB_CC1"), pin("D3_OUT", "USB_CC1_ESD"), pin("D4_IN", "USB_CC2"), pin("D4_OUT", "USB_CC2_ESD"), pin("GND", "GND")],
    pcb: { x: 120, y: 124, w: 2.5, h: 1 }
  },
  {
    ref: "D4", value: "ESDA7P60-1U1M", maker: "STMicroelectronics", role: "USB VBUS TVS",
    footprint: "QFN-2", datasheet: `${S}www.st.com/en/protections-and-emi-filters/esda7p60-1u1m.html`,
    pins: [pin("K", "VBUS_5V"), pin("A", "GND")], pcb: { x: 116, y: 126, w: 1, h: 0.6 }
  },
  {
    ref: "R1", value: "5.1k 1%", maker: "Generic", role: "USB-C CC1 Rd; default 500 mA sink configuration",
    footprint: "R0402", datasheet: "", pins: [pin("1", "USB_CC1_ESD"), pin("2", "GND")], pcb: { x: 116, y: 123, w: 1, h: 0.6 }
  },
  {
    ref: "R2", value: "5.1k 1%", maker: "Generic", role: "USB-C CC2 Rd; default 500 mA sink configuration",
    footprint: "R0402", datasheet: "", pins: [pin("1", "USB_CC2_ESD"), pin("2", "GND")], pcb: { x: 116, y: 121.5, w: 1, h: 0.6 }
  },
  {
    ref: "U2", value: "TUSB320LAI (DNP OPTION)", maker: "Texas Instruments", role: "Optional Type-C current advertisement detector; mutually exclusive with R1/R2",
    footprint: "X2QFN-12", datasheet: `${S}www.ti.com/product/TUSB320LAI`, dnp: true,
    pins: [pin("VBUS_DET", "VBUS_5V"), pin("CC1", "USB_CC1_ESD"), pin("CC2", "USB_CC2_ESD"), pin("OUT1", "TYPEC_OUT1_TP"), pin("OUT2", "TYPEC_OUT2_TP"), pin("GND", "GND")],
    pcb: { x: 112, y: 122, w: 1.6, h: 1.6 }
  },
  {
    ref: "U3", value: "BQ25628E", maker: "Texas Instruments", role: "1-cell 2 A NVDC charger/power path",
    footprint: "WQFN-18-2.5x3", datasheet: `${S}www.ti.com/product/BQ25628E`,
    pins: [pin("VBUS", "VBUS_5V"), pin("BAT", "PACK_P"), pin("SYS", "SYS_ALWAYS"), pin("GND", "GND"), pin("SDA", "I2C_SDA"), pin("SCL", "I2C_SCL"), pin("INT_N", "BQ_INT_N"), pin("TS", "BAT_NTC"), pin("ILIM", "USB_ILIM_500MA")],
    pcb: { x: 123, y: 116, w: 3, h: 2.5 }
  },
  {
    ref: "J2", value: "Molex 5023520300", maker: "Molex", role: "Protected pack connector",
    footprint: "DuraClik-3P-RA", datasheet: `${S}www.molex.com/en-us/products/part-detail/5023520300`,
    pins: [pin("PACK+", "PACK_P"), pin("NTC", "BAT_NTC"), pin("PACK-", "PACK_N")], pcb: { x: 149, y: 128, w: 8, h: 6 }
  },
  {
    ref: "RS1", value: "10m 1% Kelvin", maker: "Vishay or equivalent", role: "Fuel-gauge low-side current shunt",
    footprint: "R1206-Kelvin", datasheet: "", pins: [pin("PACK", "PACK_N"), pin("SYSTEM", "GND")], pcb: { x: 145, y: 122, w: 3.2, h: 1.6 }
  },
  {
    ref: "U4", value: "MAX17055ETB+T", maker: "Analog Devices", role: "Fuel gauge with current/time estimation",
    footprint: "TDFN-10-2x2.5", datasheet: `${S}www.analog.com/en/products/MAX17055.html`,
    pins: [pin("BATT", "PACK_P"), pin("CSP", "PACK_N"), pin("CSN", "GND"), pin("SDA", "I2C_SDA"), pin("SCL", "I2C_SCL"), pin("ALRT_N", "GAUGE_ALRT_N_TP")],
    pcb: { x: 137, y: 119, w: 2.5, h: 2 }
  },
  {
    ref: "SW1", value: "LATCHING POWER SLIDE", maker: "C&K/ALPS TBD", role: "Only latching hardware power control",
    footprint: "Slide-SPST-RA-TBD", datasheet: "", pins: [pin("COMMON", "SYS_ALWAYS"), pin("ON", "PWR_SW_ON")], pcb: { x: 153, y: 118, w: 7, h: 3 }
  },
  {
    ref: "R3", value: "100k", maker: "Generic", role: "Power-enable fail-safe pull-down",
    footprint: "R0402", datasheet: "", pins: [pin("1", "PWR_SW_ON"), pin("2", "GND")], pcb: { x: 151, y: 115, w: 1, h: 0.6 }
  },
  {
    ref: "U5", value: "TPS22992S", maker: "Texas Instruments", role: "Main system load switch with overcurrent protection",
    footprint: "WSON-6-2x2", datasheet: `${S}www.ti.com/product/TPS22992`,
    pins: [pin("VIN", "SYS_ALWAYS"), pin("ON", "PWR_SW_ON"), pin("VOUT", "SYS_SW"), pin("GND", "GND")], pcb: { x: 130, y: 112, w: 2, h: 2 }
  },
  {
    ref: "U6", value: "TPS63802", maker: "Texas Instruments", role: "2 A 3.3 V buck-boost",
    footprint: "VSON-10-3x2", datasheet: `${S}www.ti.com/product/TPS63802`,
    pins: [pin("VIN", "SYS_SW"), pin("EN", "PWR_SW_ON"), pin("VOUT", "3V3"), pin("PG", "3V3_PG_TP"), pin("GND", "GND")], pcb: { x: 136, y: 112, w: 3, h: 2 }
  },
  {
    ref: "U7", value: "TPS61236P", maker: "Texas Instruments", role: "Private 5 V LTE boost with true disconnect",
    footprint: "VQFN-9-2.5x2.5", datasheet: `${S}www.ti.com/product/TPS61236P`,
    pins: [pin("VIN", "SYS_ALWAYS"), pin("EN", "PWR_SW_ON"), pin("VOUT", "LTE_5V_RAW"), pin("ILIM", "LTE_ILIM_CFG"), pin("PG", "LTE_5V_PG_TP"), pin("GND", "GND")], pcb: { x: 143, y: 112, w: 2.5, h: 2.5 }
  },
  {
    ref: "U8", value: "TPS2001E", maker: "Texas Instruments", role: "LTE inrush/current-limit/load gate",
    footprint: "SOT23-5", datasheet: `${S}www.ti.com/product/TPS2001E`,
    pins: [pin("IN", "LTE_5V_RAW"), pin("EN", "PWR_SW_ON"), pin("OUT", "CELL_5V"), pin("OC_N", "CELL_OC_N"), pin("GND", "GND")], pcb: { x: 149, y: 112, w: 3, h: 2.8 }
  },
  {
    ref: "U9", value: "TS3USB3000", maker: "Texas Instruments", role: "Powered-off-protected USB 2.0 data switch",
    footprint: "UQFN-10-1.8x1.4", datasheet: `${S}www.ti.com/product/TS3USB3000`,
    pins: [pin("D+", "USB_DP_ESD"), pin("D-", "USB_DM_ESD"), pin("USB+", "USB_DP_MCU"), pin("USB-", "USB_DM_MCU"), pin("VCC", "3V3"), pin("SEL", "GND"), pin("OE", "GND"), pin("GND", "GND")],
    pcb: { x: 128, y: 121.5, w: 1.8, h: 1.4 }
  },
  {
    ref: "U10", value: "ESP32-S3-WROOM-1-N16R8", maker: "Espressif", role: "MCU + Wi-Fi + Bluetooth LE",
    footprint: "ESP32-S3-WROOM-1", datasheet: `${S}www.espressif.com/sites/default/files/documentation/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf`,
    pins: [
      pin("3V3", "3V3"), pin("GND", "GND"), pin("EN", "ESP_EN"), pin("IO0", "BOOT_TEST"),
      pin("IO1", "LTE_RTS"), pin("IO2", "LTE_CTS"), pin("IO4", "PDM_CLK_MCU"), pin("IO5", "PDM_DATA_MCU"),
      pin("IO6", "I2S_BCLK"), pin("IO7", "I2S_LRCLK"), pin("IO8", "I2C_SDA"), pin("IO9", "I2C_SCL"),
      pin("IO10", "LCD_CS"), pin("IO11", "SPI_MOSI"), pin("IO12", "SPI_SCK"), pin("IO13", "SPI_MISO"),
      pin("IO14", "LCD_DC"), pin("IO15", "I2S_DOUT"), pin("IO16", "TOUCH_IRQ"), pin("IO17", "CAM_CS"),
      pin("IO18", "TCA_INT_N"), pin("IO19", "USB_DM_MCU"), pin("IO20", "USB_DP_MCU"), pin("IO21", "LCD_BL"),
      pin("IO38", "LTE_RI"), pin("IO39", "BTN_CONV"), pin("IO40", "CAPTURE_EN"), pin("IO41", "LTE_TX"),
      pin("IO42", "LTE_RX"), pin("IO43", "DBG_TX"), pin("IO44", "DBG_RX"), pin("IO47", "AMP_SD"), pin("IO48", "CAM_RST")
    ],
    pcb: { x: 129, y: 64, w: 18, h: 25.5 }
  },
  {
    ref: "R4", value: "10k", maker: "Generic", role: "ESP enable pull-up",
    footprint: "R0402", datasheet: "", pins: [pin("1", "ESP_EN"), pin("2", "3V3")], pcb: { x: 140, y: 72, w: 1, h: 0.6 }
  },
  {
    ref: "C1", value: "1u", maker: "Generic", role: "ESP enable RC",
    footprint: "C0402", datasheet: "", pins: [pin("1", "ESP_EN"), pin("2", "GND")], pcb: { x: 140, y: 74, w: 1, h: 0.6 }
  },
  {
    ref: "R5", value: "10k", maker: "Generic", role: "GPIO0 boot-strap pull-up; fixture pad only",
    footprint: "R0402", datasheet: "", pins: [pin("1", "BOOT_TEST"), pin("2", "3V3")], pcb: { x: 118, y: 73, w: 1, h: 0.6 }
  },
  {
    ref: "U11", value: "TCA9534A", maker: "Texas Instruments", role: "Slow/status GPIO expander at 0x20",
    footprint: "VSSOP-16", datasheet: `${S}www.ti.com/product/TCA9534A`,
    pins: [pin("VCC", "3V3"), pin("GND", "GND"), pin("SDA", "I2C_SDA"), pin("SCL", "I2C_SCL"), pin("INT_N", "TCA_INT_N"), pin("P0", "BQ_INT_N"), pin("P1", "CELL_OC_N"), pin("P2", "LTE_PWR_PULSE"), pin("P3", "LTE_RESET"), pin("P4", "LCD_RST"), pin("P5", "TOUCH_RST"), pin("P6", "AMBER_LED"), pin("P7", "CAM_EN")],
    pcb: { x: 111, y: 82, w: 5, h: 4.4 }
  },
  {
    ref: "J3", value: "MIKROE-6396 4G LTE 3 CLICK NA", maker: "MikroElektronika", role: "Removable Cat 1bis modem; remove onboard D3 for hard-off",
    footprint: "MIKROBUS-16-SMD-57x25", datasheet: `${S}www.mikroe.com/4g-lte-3-click-for-north-america`,
    pins: [pin("5V", "CELL_5V"), pin("3V3", "3V3"), pin("GND", "GND"), pin("RX", "LTE_TX"), pin("TX", "LTE_RX"), pin("CTS/INT", "LTE_CTS"), pin("RTS/CS", "LTE_RTS"), pin("RI/PWM", "LTE_RI"), pin("PWR/AN", "LTE_PWR_PULSE"), pin("RESET", "LTE_RESET")],
    pcb: { x: 129, y: 92, w: 25.4, h: 57.15, side: "B" }
  },
  {
    ref: "SW2", value: "CONVERSATION BUTTON", maker: "TBD", role: "Only momentary user control",
    footprint: "Top-Button-TBD", datasheet: "", pins: [pin("SIGNAL", "BTN_CONV"), pin("GND", "GND")], pcb: { x: 152, y: 64, w: 7, h: 7 }
  },
  {
    ref: "R9", value: "10k", maker: "Generic", role: "Conversation-button pull-up",
    footprint: "R0402", datasheet: "", pins: [pin("1", "BTN_CONV"), pin("2", "3V3")], pcb: { x: 147, y: 67, w: 1, h: 0.6 }
  },
  {
    ref: "U12", value: "TPS22918", maker: "Texas Instruments", role: "Hardware microphone rail gate",
    footprint: "SOT23-6", datasheet: `${S}www.ti.com/product/TPS22918`,
    pins: [pin("VIN", "3V3"), pin("EN", "CAPTURE_EN"), pin("VOUT", "MIC_3V3"), pin("GND", "GND")], pcb: { x: 145, y: 56, w: 3, h: 3 }
  },
  {
    ref: "U13", value: "SN74LVC2G125", maker: "Texas Instruments", role: "PDM clock/data isolation with Ioff",
    footprint: "VSSOP-8", datasheet: `${S}www.ti.com/product/SN74LVC2G125`,
    pins: [pin("VCC", "MIC_3V3"), pin("GND", "GND"), pin("OE1_N", "GND"), pin("A1", "PDM_CLK_MCU"), pin("Y1", "PDM_CLK_MIC"), pin("OE2_N", "GND"), pin("A2", "PDM_DATA_MIC"), pin("Y2", "PDM_DATA_MCU")], pcb: { x: 150, y: 56, w: 3, h: 2 }
  },
  {
    ref: "MK1", value: "IM69D129F", maker: "Infineon", role: "Bottom-port PDM microphone",
    footprint: "MEMS-5-3.5x2.65-BOTTOM-PORT", datasheet: `${S}www.infineon.com/part/IM69D129F`,
    pins: [pin("VDD", "MIC_3V3"), pin("GND", "GND"), pin("CLK", "PDM_CLK_MIC"), pin("DATA", "PDM_DATA_MIC"), pin("L/R", "GND")], pcb: { x: 153.5, y: 54, w: 3.5, h: 2.65 }
  },
  {
    ref: "D1", value: "CYAN CAPTURE LED", maker: "TBD", role: "Hard-coupled capture truth indicator",
    footprint: "LED0402", datasheet: "", pins: [pin("A", "MIC_3V3"), pin("K", "CYAN_LED_K")], pcb: { x: 150, y: 71, w: 1, h: 0.6 }
  },
  {
    ref: "R6", value: "1.5k", maker: "Generic", role: "Cyan LED current limit",
    footprint: "R0402", datasheet: "", pins: [pin("1", "CYAN_LED_K"), pin("2", "GND")], pcb: { x: 148, y: 71, w: 1, h: 0.6 }
  },
  {
    ref: "R7", value: "100k", maker: "Generic", role: "Capture-enable fail-safe pull-down",
    footprint: "R0402", datasheet: "", pins: [pin("1", "CAPTURE_EN"), pin("2", "GND")], pcb: { x: 146, y: 71, w: 1, h: 0.6 }
  },
  {
    ref: "D2", value: "AMBER SESSION LED", maker: "TBD", role: "Connecting/session-intent indicator",
    footprint: "LED0402", datasheet: "", pins: [pin("A", "AMBER_LED"), pin("K", "AMBER_LED_K")], pcb: { x: 150, y: 73, w: 1, h: 0.6 }
  },
  {
    ref: "R8", value: "1.5k", maker: "Generic", role: "Amber LED current limit",
    footprint: "R0402", datasheet: "", pins: [pin("1", "AMBER_LED_K"), pin("2", "GND")], pcb: { x: 148, y: 73, w: 1, h: 0.6 }
  },
  {
    ref: "U14", value: "MAX98357AETE+T", maker: "Analog Devices", role: "I2S mono class-D amplifier",
    footprint: "TQFN-16-3x3", datasheet: `${S}www.analog.com/en/products/max98357a.html`,
    pins: [pin("VDD", "3V3"), pin("GND", "GND"), pin("BCLK", "I2S_BCLK"), pin("LRCLK", "I2S_LRCLK"), pin("DIN", "I2S_DOUT"), pin("SD_MODE", "AMP_SD"), pin("OUTP", "SPK_P"), pin("OUTN", "SPK_N")], pcb: { x: 149, y: 79, w: 3, h: 3 }
  },
  {
    ref: "R10", value: "100k", maker: "Generic", role: "Amplifier shutdown pull-down",
    footprint: "R0402", datasheet: "", pins: [pin("1", "AMP_SD"), pin("2", "GND")], pcb: { x: 145, y: 79, w: 1, h: 0.6 }
  },
  {
    ref: "J4", value: "AS01808AO-SC18-WP-R", maker: "PUI Audio", role: "8 ohm 1 W spring-contact speaker",
    footprint: "Speaker-18x13-Spring", datasheet: `${S}puiaudio.com/file/specs-AS01808AO-SC18-WP-R.pdf`,
    pins: [pin("+", "SPK_P"), pin("-", "SPK_N")], pcb: { x: 149, y: 88, w: 13, h: 18 }
  },
  {
    ref: "J5", value: "WAVESHARE 1.69IN TOUCH LCD 27057", maker: "Waveshare", role: "240x280 ST7789V2 LCD + CST816S/T touch module",
    footprint: "HDR-1x12-P2.54", datasheet: `${S}www.waveshare.com/wiki/1.69inch_Touch_LCD_Module`,
    pins: [pin("VCC", "3V3"), pin("GND", "GND"), pin("MOSI", "SPI_MOSI"), pin("SCLK", "SPI_SCK"), pin("LCD_CS", "LCD_CS"), pin("LCD_DC", "LCD_DC"), pin("LCD_RST", "LCD_RST"), pin("LCD_BL", "LCD_BL"), pin("TP_SDA", "I2C_SDA"), pin("TP_SCL", "I2C_SCL"), pin("TP_RST", "TOUCH_RST"), pin("TP_IRQ", "TOUCH_IRQ")],
    pcb: { x: 104, y: 72, w: 3, h: 31 }
  },
  {
    ref: "U15", value: "TPS22918 (DNP CAMERA)", maker: "Texas Instruments", role: "Optional camera rail gate",
    footprint: "SOT23-6", datasheet: `${S}www.ti.com/product/TPS22918`, dnp: true,
    pins: [pin("VIN", "3V3"), pin("EN", "CAM_EN"), pin("VOUT", "CAM_3V3"), pin("GND", "GND")], pcb: { x: 108, y: 57, w: 3, h: 3 }
  },
  {
    ref: "J6", value: "CAMERA AUX 1x10 (DNP)", maker: "TBD adapter", role: "Experimental still-camera module connector; no MVP sensor",
    footprint: "HDR-1x10-P1.27", datasheet: "", dnp: true,
    pins: [pin("3V3", "CAM_3V3"), pin("GND", "GND"), pin("SCK", "SPI_SCK"), pin("MOSI", "SPI_MOSI"), pin("MISO", "SPI_MISO"), pin("CS", "CAM_CS"), pin("SDA", "I2C_SDA"), pin("SCL", "I2C_SCL"), pin("RESET", "CAM_RST"), pin("IRQ", "CAM_IRQ_TP")],
    pcb: { x: 113, y: 62, w: 3, h: 13 }
  },
  {
    ref: "D3", value: "WHITE CAMERA POWER LED (DNP)", maker: "TBD", role: "Hardware-coupled optional camera-power indicator",
    footprint: "LED0402", datasheet: "", dnp: true,
    pins: [pin("A", "CAM_3V3"), pin("K", "CAM_LED_K")], pcb: { x: 108, y: 65, w: 1, h: 0.6 }
  },
  {
    ref: "R11", value: "1.5k (DNP)", maker: "Generic", role: "Camera indicator current limit",
    footprint: "R0402", datasheet: "", dnp: true,
    pins: [pin("1", "CAM_LED_K"), pin("2", "GND")], pcb: { x: 108, y: 67, w: 1, h: 0.6 }
  },
  {
    ref: "R12", value: "TBD for 500mA", maker: "Generic", role: "BQ25628E ILIM resistor; calculate from released datasheet",
    footprint: "R0402", datasheet: `${S}www.ti.com/product/BQ25628E`,
    pins: [pin("1", "USB_ILIM_500MA"), pin("2", "GND")], pcb: { x: 121, y: 118, w: 1, h: 0.6 }
  },
  {
    ref: "R13", value: "TBD for 1.5A", maker: "Generic", role: "TPS61236P constant-current programming resistor",
    footprint: "R0402", datasheet: `${S}www.ti.com/product/TPS61236P`,
    pins: [pin("1", "LTE_ILIM_CFG"), pin("2", "GND")], pcb: { x: 141, y: 115, w: 1, h: 0.6 }
  },
  {
    ref: "TP1", value: "TYPEC_OUT1_OPTION", maker: "Generic", role: "DNP Type-C option test pad",
    footprint: "TestPoint-1mm", datasheet: "", dnp: true,
    pins: [pin("1", "TYPEC_OUT1_TP")], pcb: { x: 105, y: 122, w: 1.5, h: 1.5 }
  },
  {
    ref: "TP2", value: "TYPEC_OUT2_OPTION", maker: "Generic", role: "DNP Type-C option test pad",
    footprint: "TestPoint-1mm", datasheet: "", dnp: true,
    pins: [pin("1", "TYPEC_OUT2_TP")], pcb: { x: 108, y: 122, w: 1.5, h: 1.5 }
  },
  {
    ref: "TP3", value: "3V3_POWER_GOOD", maker: "Generic", role: "3V3 rail validation pad",
    footprint: "TestPoint-1mm", datasheet: "", pins: [pin("1", "3V3_PG_TP")], pcb: { x: 134, y: 115, w: 1.5, h: 1.5 }
  },
  {
    ref: "TP4", value: "LTE_5V_POWER_GOOD", maker: "Generic", role: "LTE boost validation pad",
    footprint: "TestPoint-1mm", datasheet: "", pins: [pin("1", "LTE_5V_PG_TP")], pcb: { x: 146, y: 115, w: 1.5, h: 1.5 }
  },
  {
    ref: "TP5", value: "GAUGE_ALERT", maker: "Generic", role: "Fuel-gauge alert validation pad",
    footprint: "TestPoint-1mm", datasheet: "", pins: [pin("1", "GAUGE_ALRT_N_TP")], pcb: { x: 139, y: 116, w: 1.5, h: 1.5 }
  },
  {
    ref: "TP6", value: "DEBUG_TX", maker: "Generic", role: "High-impedance fixture debug pad; never supply power",
    footprint: "TestPoint-1mm", datasheet: "", pins: [pin("1", "DBG_TX")], pcb: { x: 118, y: 78, w: 1.5, h: 1.5 }
  },
  {
    ref: "TP7", value: "DEBUG_RX", maker: "Generic", role: "Series-isolated fixture debug pad; verify no off-state injection",
    footprint: "TestPoint-1mm", datasheet: "", pins: [pin("1", "DBG_RX")], pcb: { x: 118, y: 80, w: 1.5, h: 1.5 }
  },
  {
    ref: "TP8", value: "CAMERA_IRQ_OPTION", maker: "Generic", role: "DNP camera option test pad",
    footprint: "TestPoint-1mm", datasheet: "", dnp: true,
    pins: [pin("1", "CAM_IRQ_TP")], pcb: { x: 108, y: 69, w: 1.5, h: 1.5 }
  }
];

let configs = {
  wifi_only: {
    fitted: "Everything except U2, U15, J6, D3, R11 and J3",
    notes: "Preferred first bring-up. LTE socket may remain empty."
  },
  lte_click: {
    fitted: "J3 MIKROE-6396, 3V3 logic jumper selected",
    mandatory_eco: "Remove MIKROE board diode D3 (VUSB-to-TPS_IN) and verify open circuit before assembly",
    notes: "Feed CELL_5V only; never expose/use the Click USB connector in the enclosure."
  },
  typec_current_option: {
    fitted: "U2; R1 and R2 not fitted",
    status: "DNP engineering option, not verified in R0",
    notes: "Requires reviewed current-advertisement logic and safe charger fallback before use."
  },
  camera_experiment: {
    fitted: "U15, J6, D3, R11 plus a separate adapter/module",
    status: "DNP; prohibited by MVP requirement PR-06",
    notes: "Still-image experiment only. Exact module pinout and privacy review required."
  }
};

let gpio = [
  [1, "LTE_RTS", "ESP output -> Click RTS/CS -> module RTS input"],
  [2, "LTE_CTS", "ESP input <- Click CTS/INT <- module CTS output"],
  [4, "PDM_CLK_MCU", "I2S0 PDM clock through U13"], [5, "PDM_DATA_MCU", "I2S0 PDM data through U13"],
  [6, "I2S_BCLK", "I2S1 speaker bit clock"], [7, "I2S_LRCLK", "I2S1 speaker word clock"],
  [8, "I2C_SDA", "Shared I2C"], [9, "I2C_SCL", "Shared I2C"], [10, "LCD_CS", "Display chip select"],
  [11, "SPI_MOSI", "Shared display/camera SPI"], [12, "SPI_SCK", "Shared display/camera SPI"], [13, "SPI_MISO", "Camera option only"],
  [14, "LCD_DC", "Display data/command"], [15, "I2S_DOUT", "Rendered speaker PCM"], [16, "TOUCH_IRQ", "Touch interrupt"],
  [17, "CAM_CS", "DNP camera option"], [18, "TCA_INT_N", "Slow GPIO interrupt"], [19, "USB_DM_MCU", "Native USB D-"],
  [20, "USB_DP_MCU", "Native USB D+"], [21, "LCD_BL", "Backlight PWM"], [38, "LTE_RI", "Modem ring/URC indication"],
  [39, "BTN_CONV", "Conversation button, active low"], [40, "CAPTURE_EN", "Mic rail + PDM isolation + cyan LED"],
  [41, "LTE_TX", "ESP TX -> Click RX"], [42, "LTE_RX", "ESP RX <- Click TX"], [43, "DBG_TX", "Fixture test pad only"],
  [44, "DBG_RX", "Fixture test pad only"], [47, "AMP_SD", "Speaker shutdown/enable"], [48, "CAM_RST", "DNP camera reset"]
];

// Keep the large R0 list above as the historical/proposal baseline, but drive
// every generated artifact from the reviewed R1 data file below.  Separating
// the electrical contract from the KiCad serializer makes part/pin review much
// easier and preserves the exact proposal that R1 supersedes.
const r1 = JSON.parse(fs.readFileSync(path.join(SCRIPT_DIR, "mochi_walter_r1.json"), "utf8"));
components = r1.components;
configs = r1.configurations;
gpio = r1.gpio;

function symbolDefinition(c, embedded = true) {
  const bareId = `${c.ref}_${safe(c.value)}`;
  const id = embedded ? `Mochi:${bareId}` : bareId;
  const nLeft = Math.ceil(c.pins.length / 2);
  const nRight = c.pins.length - nLeft;
  const maxSide = Math.max(nLeft, nRight, 2);
  const bodyHalfW = 10.16;
  const bodyHalfH = Math.max(5.08, (maxSide - 1) * 1.27 + 2.54);
  const defPins = c.pins.map((p, i) => {
    const left = i < nLeft;
    const sideIndex = left ? i : i - nLeft;
    const sideCount = left ? nLeft : nRight;
    const y = (sideIndex - (sideCount - 1) / 2) * 2.54;
    const x = left ? -(bodyHalfW + 2.54) : bodyHalfW + 2.54;
    const angle = left ? 0 : 180;
    return `
      (pin passive line (at ${x.toFixed(3)} ${y.toFixed(3)} ${angle}) (length 2.54)
        (name ${q(p.name)} (effects (font (size 0.8 0.8))))
        (number ${q(String(i + 1))} (effects (font (size 0.8 0.8)))))`;
  }).join("");
  return `
    (symbol ${q(id)}
      (pin_names (offset 0.635))
      (exclude_from_sim no) (in_bom yes) (on_board yes)
      (property "Reference" ${q(c.ref.replace(/[0-9]+$/, ""))} (at 0 ${(-bodyHalfH - 2).toFixed(3)} 0) (effects (font (size 1.27 1.27))))
      (property "Value" ${q(c.value)} (at 0 ${(bodyHalfH + 2).toFixed(3)} 0) (effects (font (size 1.0 1.0))))
      (property "Footprint" ${q(`Mochi_Reference:${footprintId(c)}`)} (at 0 0 0) (effects (font (size 1 1)) (hide yes)))
      (property "Datasheet" ${q(c.datasheet || "~")} (at 0 0 0) (effects (font (size 1 1)) (hide yes)))
      (property "Description" ${q(c.role)} (at 0 0 0) (effects (font (size 1 1)) (hide yes)))
      (symbol ${q(`${c.ref}_${safe(c.value)}_0_1`)}
        (rectangle (start ${(-bodyHalfW).toFixed(3)} ${(-bodyHalfH).toFixed(3)}) (end ${bodyHalfW.toFixed(3)} ${bodyHalfH.toFixed(3)})
          (stroke (width 0.254) (type default)) (fill (type background))))
      (symbol ${q(`${c.ref}_${safe(c.value)}_1_1`)}${defPins})
      (embedded_fonts no))`;
}

function labelAt(net, x, y, left, key) {
  const angle = left ? 180 : 0;
  const justify = left ? "right" : "left";
  return `
  (global_label ${q(net)} (shape bidirectional) (at ${x.toFixed(3)} ${y.toFixed(3)} ${angle})
    (fields_autoplaced yes) (effects (font (size 0.8 0.8)) (justify ${justify}))
    (uuid ${q(uuid(`label:${key}`))})
    (property "Intersheetrefs" "\${INTERSHEET_REFS}" (at ${x.toFixed(3)} ${y.toFixed(3)} 0) (effects (font (size 0.8 0.8)) (hide yes))))`;
}

function symbolInstance(c, index, rootUuid) {
  const col = index % 6;
  const row = Math.floor(index / 6);
  const x = 38.1 + col * 96.52;
  const y = 30.48 + row * 43.18;
  const nLeft = Math.ceil(c.pins.length / 2);
  const nRight = c.pins.length - nLeft;
  const bodyHalfW = 10.16;
  const symUuid = uuid(`symbol:${c.ref}`);
  let labels = "";
  const pinRecords = c.pins.map((p, i) => {
    const left = i < nLeft;
    const sideIndex = left ? i : i - nLeft;
    const sideCount = left ? nLeft : nRight;
    // KiCad symbol-library coordinates use +Y upward while the schematic sheet
    // uses +Y downward.  Mirror the local pin Y offset when placing labels.
    const py = y - (sideIndex - (sideCount - 1) / 2) * 2.54;
    const px = x + (left ? -(bodyHalfW + 2.54) : bodyHalfW + 2.54);
    labels += labelAt(p.net, px, py, left, `${c.ref}:${i}:${p.net}`);
    return `
    (pin ${q(String(i + 1))} (uuid ${q(uuid(`instance-pin:${c.ref}:${i + 1}`))}))`;
  }).join("");
  const libId = `Mochi:${c.ref}_${safe(c.value)}`;
  return {
    labels,
    symbol: `
  (symbol (lib_id ${q(libId)}) (at ${x.toFixed(3)} ${y.toFixed(3)} 0) (unit 1)
    (exclude_from_sim no) (in_bom yes) (on_board yes) (dnp ${c.dnp ? "yes" : "no"})
    (uuid ${q(symUuid)})
    (property "Reference" ${q(c.ref)} (at ${x.toFixed(3)} ${(y - 13).toFixed(3)} 0) (effects (font (size 1.27 1.27))))
    (property "Value" ${q(c.value)} (at ${x.toFixed(3)} ${(y + 13).toFixed(3)} 0) (effects (font (size 0.95 0.95))))
    (property "Footprint" ${q(`Mochi_Reference:${footprintId(c)}`)} (at ${x.toFixed(3)} ${y.toFixed(3)} 0) (effects (font (size 1 1)) (hide yes)))
    (property "Datasheet" ${q(c.datasheet || "~")} (at ${x.toFixed(3)} ${y.toFixed(3)} 0) (effects (font (size 1 1)) (hide yes)))
    (property "Description" ${q(c.role)} (at ${x.toFixed(3)} ${y.toFixed(3)} 0) (effects (font (size 1 1)) (hide yes)))${pinRecords}
    (instances (project "mochi" (path ${q(`/${rootUuid}`)} (reference ${q(c.ref)}) (unit 1)))))`
  };
}

function makeSchematic() {
  const rootUuid = uuid("schematic-root");
  const defs = components.map(c => symbolDefinition(c, true)).join("");
  const instances = components.map((c, i) => symbolInstance(c, i, rootUuid));
  return `(kicad_sch
  (version 20241209)
  (generator "mochi_reference_generator")
  (generator_version "1.0")
  (uuid ${q(rootUuid)})
  (paper "A2")
  (title_block
    (title "Mochi R1 Walter modular carrier electrical reference")
    (date "2026-09-01") (rev "R1-EVT-REFERENCE") (company "Mochi Pager")
    (comment 1 "NOT RELEASED FOR FABRICATION - production footprints/routing/physical tests remain")
    (comment 2 "Baseline: Walter LTE-M/Wi-Fi/BLE; announced Cat 1 bis is future and unverified"))
  (lib_symbols${defs}
  )${instances.map(i => i.labels).join("")}${instances.map(i => i.symbol).join("")}
  (sheet_instances (path "/" (page "1")))
  (embedded_fonts no)
)
`;
}

function makeSymbolLibrary() {
  return `(kicad_symbol_lib
  (version 20241209)
  (generator "mochi_reference_generator")
  (generator_version "1.0")${components.map(c => symbolDefinition(c, false)).join("")}
)
`;
}

function makeLibraryFootprint(c) {
  const p = c.pcb;
  const nLeft = Math.ceil(c.pins.length / 2);
  const nRight = c.pins.length - nLeft;
  const maxSide = Math.max(nLeft, nRight, 1);
  const pitch = p.pitch ?? Math.min(2.0, Math.max(0.65, (p.h - 1) / Math.max(maxSide - 1, 1)));
  const padW = Math.min(1.0, Math.max(0.25, p.w * 0.35));
  const padH = Math.min(0.5, Math.max(0.2, pitch * 0.45));
  const pads = c.pins.map((pinDef, i) => {
    const left = i < nLeft;
    const si = left ? i : (p.reverseRight ? nRight - 1 - (i - nLeft) : i - nLeft);
    const sc = left ? nLeft : nRight;
    const py = (si - (sc - 1) / 2) * pitch;
    const padX = p.padX ?? p.w / 2;
    const px = c.pins.length === 1 ? 0 : (left ? -padX : padX);
    if (p.throughHole) return `
  (pad ${q(String(i + 1))} thru_hole circle (at ${px.toFixed(3)} ${py.toFixed(3)})
    (size 2 2) (drill 1.02) (layers "*.Cu" "*.Mask")
    (pinfunction ${q(pinDef.name)}) (pintype "passive"))`;
    return `
  (pad ${q(String(i + 1))} smd roundrect (at ${px.toFixed(3)} ${py.toFixed(3)})
    (size ${padW.toFixed(3)} ${padH.toFixed(3)}) (layers "F.Cu" "F.Paste" "F.Mask") (roundrect_rratio 0.2)
    (pinfunction ${q(pinDef.name)}) (pintype "passive"))`;
  }).join("");
  const x1 = (-p.w / 2).toFixed(3), x2 = (p.w / 2).toFixed(3), y1 = (-p.h / 2).toFixed(3), y2 = (p.h / 2).toFixed(3);
  return `(footprint ${q(footprintId(c))}
  (version 20241229)
  (generator "mochi_reference_generator")
  (generator_version "1.0")
  (layer "F.Cu")
  (property "Reference" "REF**" (at 0 ${(Number(y1) - 1.4).toFixed(3)} 0) (layer "F.Fab")
    (effects (font (size 0.8 0.8) (thickness 0.12))))
  (property "Value" ${q(c.value)} (at 0 ${(Number(y2) + 1.4).toFixed(3)} 0) (layer "F.Fab")
    (effects (font (size 0.7 0.7) (thickness 0.1))))
  (property "Datasheet" ${q(c.datasheet || "")} (at 0 0 0) (layer "F.Fab") (hide yes)
    (effects (font (size 1 1))))
  (property "Description" ${q(c.role)} (at 0 0 0) (layer "F.Fab") (hide yes)
    (effects (font (size 1 1))))
  (attr ${p.throughHole ? "through_hole" : "smd"}${c.dnp ? " dnp" : ""})
  (fp_line (start ${x1} ${y1}) (end ${x2} ${y1}) (stroke (width 0.15) (type solid)) (layer "F.Fab"))
  (fp_line (start ${x2} ${y1}) (end ${x2} ${y2}) (stroke (width 0.15) (type solid)) (layer "F.Fab"))
  (fp_line (start ${x2} ${y2}) (end ${x1} ${y2}) (stroke (width 0.15) (type solid)) (layer "F.Fab"))
  (fp_line (start ${x1} ${y2}) (end ${x1} ${y1}) (stroke (width 0.15) (type solid)) (layer "F.Fab"))
  (fp_text user "REF ONLY" (at 0 0 0) (layer "F.Fab") (effects (font (size 0.65 0.65) (thickness 0.1))))${pads}
  (embedded_fonts no)
)
`;
}

function boardHeader(nets) {
  return `(kicad_pcb
  (version 20241229)
  (generator "mochi_reference_generator")
  (generator_version "1.0")
  (general (thickness ${r1.board_mm.thickness}) (legacy_teardrops no))
  (paper "A4")
  (layers
    (0 "F.Cu" signal) (4 "In1.Cu" power "GND") (6 "In2.Cu" power "PWR") (2 "B.Cu" signal)
    (9 "F.Adhes" user "F.Adhesive") (11 "B.Adhes" user "B.Adhesive")
    (13 "F.Paste" user) (15 "B.Paste" user) (5 "F.SilkS" user "F.Silkscreen")
    (7 "B.SilkS" user "B.Silkscreen") (1 "F.Mask" user) (3 "B.Mask" user)
    (17 "Dwgs.User" user "User.Drawings") (19 "Cmts.User" user "User.Comments")
    (21 "Eco1.User" user "User.Eco1") (23 "Eco2.User" user "User.Eco2")
    (25 "Edge.Cuts" user) (27 "Margin" user) (31 "F.CrtYd" user "F.Courtyard")
    (29 "B.CrtYd" user "B.Courtyard") (35 "F.Fab" user) (33 "B.Fab" user))
  (setup
    (stackup
      (layer "F.SilkS" (type "Top Silk Screen")) (layer "F.Paste" (type "Top Solder Paste"))
      (layer "F.Mask" (type "Top Solder Mask") (thickness 0.01))
      (layer "F.Cu" (type "copper") (thickness 0.035))
      (layer "dielectric 1" (type "prepreg") (thickness 0.12) (material "FR4") (epsilon_r 4.2) (loss_tangent 0.02))
      (layer "In1.Cu" (type "copper") (thickness 0.035))
      (layer "dielectric 2" (type "core") (thickness 0.80) (material "FR4") (epsilon_r 4.2) (loss_tangent 0.02))
      (layer "In2.Cu" (type "copper") (thickness 0.035))
      (layer "dielectric 3" (type "prepreg") (thickness 0.12) (material "FR4") (epsilon_r 4.2) (loss_tangent 0.02))
      (layer "B.Cu" (type "copper") (thickness 0.035))
      (layer "B.Mask" (type "Bottom Solder Mask") (thickness 0.01))
      (layer "B.Paste" (type "Bottom Solder Paste")) (layer "B.SilkS" (type "Bottom Silk Screen"))
      (copper_finish "ENIG") (dielectric_constraints no))
    (pad_to_mask_clearance 0) (allow_soldermask_bridges_in_footprints no))
  (net 0 "")${nets.map((n, i) => `\n  (net ${i + 1} ${q(n)})`).join("")}`;
}

function boardFootprint(c, rootUuid, netIds) {
  const p = c.pcb;
  const side = p.side === "B" ? "B" : "F";
  const silk = `${side}.SilkS`;
  const fab = `${side}.Fab`;
  const copper = `${side}.Cu`;
  const paste = `${side}.Paste`;
  const mask = `${side}.Mask`;
  const symUuid = uuid(`symbol:${c.ref}`);
  const fpUuid = uuid(`footprint:${c.ref}`);
  const nLeft = Math.ceil(c.pins.length / 2);
  const nRight = c.pins.length - nLeft;
  const maxSide = Math.max(nLeft, nRight, 1);
  const pitch = p.pitch ?? Math.min(2.0, Math.max(0.65, (p.h - 1) / Math.max(maxSide - 1, 1)));
  const padW = Math.min(1.0, Math.max(0.25, p.w * 0.35));
  const padH = Math.min(0.5, Math.max(0.2, pitch * 0.45));
  const pads = c.pins.map((pinDef, i) => {
    const left = i < nLeft;
    const si = left ? i : (p.reverseRight ? nRight - 1 - (i - nLeft) : i - nLeft);
    const sc = left ? nLeft : nRight;
    const py = (si - (sc - 1) / 2) * pitch;
    const padX = p.padX ?? p.w / 2;
    const px = c.pins.length === 1 ? 0 : (left ? -padX : padX);
    const id = netIds.get(pinDef.net);
    if (p.throughHole) return `
    (pad ${q(String(i + 1))} thru_hole circle (at ${px.toFixed(3)} ${py.toFixed(3)})
      (size 2 2) (drill 1.02) (layers "*.Cu" "*.Mask")
      (net ${id} ${q(pinDef.net)}) (pinfunction ${q(pinDef.name)}) (pintype "passive")
      (uuid ${q(uuid(`pad:${c.ref}:${i + 1}`))}))`;
    return `
    (pad ${q(String(i + 1))} smd roundrect (at ${px.toFixed(3)} ${py.toFixed(3)})
      (size ${padW.toFixed(3)} ${padH.toFixed(3)}) (layers ${q(copper)} ${q(paste)} ${q(mask)}) (roundrect_rratio 0.2)
      (net ${id} ${q(pinDef.net)}) (pinfunction ${q(pinDef.name)}) (pintype "passive")
      (uuid ${q(uuid(`pad:${c.ref}:${i + 1}`))}))`;
  }).join("");
  const x1 = (-p.w / 2).toFixed(3), x2 = (p.w / 2).toFixed(3), y1 = (-p.h / 2).toFixed(3), y2 = (p.h / 2).toFixed(3);
  return `
  (footprint ${q(`Mochi_Reference:${footprintId(c)}`)}
    (layer ${q(copper)}) (uuid ${q(fpUuid)}) (at ${p.x} ${p.y})
    (property "Reference" ${q(c.ref)} (at 0 ${(Number(y1) - 1.4).toFixed(3)} 0) (layer ${q(fab)})
      (uuid ${q(uuid(`fp-ref:${c.ref}`))}) (effects (font (size 0.8 0.8) (thickness 0.12))${side === "B" ? " (justify mirror)" : ""}))
    (property "Value" ${q(c.value)} (at 0 ${(Number(y2) + 1.4).toFixed(3)} 0) (layer ${q(fab)})
      (uuid ${q(uuid(`fp-value:${c.ref}`))}) (effects (font (size 0.7 0.7) (thickness 0.1))${side === "B" ? " (justify mirror)" : ""}))
    (property "Datasheet" ${q(c.datasheet || "")} (at 0 0 0) (layer ${q(fab)}) (hide yes)
      (uuid ${q(uuid(`fp-ds:${c.ref}`))}) (effects (font (size 1 1))${side === "B" ? " (justify mirror)" : ""}))
    (property "Description" ${q(c.role)} (at 0 0 0) (layer ${q(fab)}) (hide yes)
      (uuid ${q(uuid(`fp-desc:${c.ref}`))}) (effects (font (size 1 1))${side === "B" ? " (justify mirror)" : ""}))
    (path ${q(`/${rootUuid}/${symUuid}`)})
    (attr ${p.throughHole ? "through_hole" : "smd"}${c.dnp ? " dnp" : ""})
    (fp_line (start ${x1} ${y1}) (end ${x2} ${y1}) (stroke (width 0.15) (type solid)) (layer ${q(fab)}) (uuid ${q(uuid(`line:${c.ref}:1`))}))
    (fp_line (start ${x2} ${y1}) (end ${x2} ${y2}) (stroke (width 0.15) (type solid)) (layer ${q(fab)}) (uuid ${q(uuid(`line:${c.ref}:2`))}))
    (fp_line (start ${x2} ${y2}) (end ${x1} ${y2}) (stroke (width 0.15) (type solid)) (layer ${q(fab)}) (uuid ${q(uuid(`line:${c.ref}:3`))}))
    (fp_line (start ${x1} ${y2}) (end ${x1} ${y1}) (stroke (width 0.15) (type solid)) (layer ${q(fab)}) (uuid ${q(uuid(`line:${c.ref}:4`))}))
    (fp_text user "REF ONLY" (at 0 0 0) (layer ${q(fab)}) (uuid ${q(uuid(`fp-user:${c.ref}`))})
      (effects (font (size 0.65 0.65) (thickness 0.1))${side === "B" ? " (justify mirror)" : ""}))${pads}
    (embedded_fonts no))`;
}

function keepout(layer, idx) {
  return `
  (zone (net 0) (net_name "") (layer ${q(layer)}) (uuid ${q(uuid(`antenna-keepout:${layer}`))})
    (hatch edge 0.5) (connect_pads (clearance 0)) (min_thickness 0.25) (filled_areas_thickness no)
    (keepout (tracks not_allowed) (vias not_allowed) (pads not_allowed) (copperpour not_allowed) (footprints not_allowed))
    (placement (enabled no) (sheetname "")) (fill (thermal_gap 0.5) (thermal_bridge_width 0.5))
    (polygon (pts (xy 134.1 124.27) (xy 158.9 124.27) (xy 158.9 130.27) (xy 134.1 130.27))))`;
}

function makeBoard() {
  const rootUuid = uuid("schematic-root");
  const nets = [...new Set(components.flatMap(c => c.pins.map(p => p.net)))].sort();
  const netIds = new Map(nets.map((n, i) => [n, i + 1]));
  const fps = components.map(c => boardFootprint(c, rootUuid, netIds)).join("");
  return `${boardHeader(nets)}${fps}
  (gr_rect (start 100 50) (end 160 132) (stroke (width 0.15) (type default)) (fill none) (layer "Edge.Cuts") (uuid ${q(uuid("board-outline"))}))
  (gr_text "MOCHI R1 WALTER REFERENCE - DO NOT FAB" (at 130 81) (layer "Cmts.User") (uuid ${q(uuid("board-warning-front"))})
    (effects (font (size 1 1) (thickness 0.18))))
  (gr_text "WALTER USB: HIDDEN; NEVER POWER USB + VIN TOGETHER" (at 130 120) (layer "Cmts.User") (uuid ${q(uuid("board-warning-back"))})
    (effects (font (size 0.85 0.85) (thickness 0.15))))
  (gr_text "WALTER PCB ANTENNA - VENDOR KEEPOUT ALL LAYERS" (at 146.5 127) (layer "Dwgs.User") (uuid ${q(uuid("antenna-note"))})
    (effects (font (size 0.8 0.8) (thickness 0.12))))${["F.Cu", "In1.Cu", "In2.Cu", "B.Cu"].map(keepout).join("")}
  (embedded_fonts no)
)
`;
}

function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

function makeBom() {
  const rows = [["reference", "value_or_mpn", "manufacturer", "role", "population", "datasheet", "footprint_status"]];
  for (const c of components) rows.push([c.ref, c.value, c.maker, c.role, c.dnp ? "DNP" : "FIT", c.datasheet, "REFERENCE_ONLY_VERIFY_BEFORE_FAB"]);
  return rows.map(r => r.map(csvCell).join(",")).join("\n") + "\n";
}

function makeConnectivity() {
  const byNet = new Map();
  for (const c of components) for (const p of c.pins) {
    if (!byNet.has(p.net)) byNet.set(p.net, []);
    byNet.get(p.net).push(`${c.ref}.${p.name}`);
  }
  const rows = [["net", "endpoints", "endpoint_count"]];
  for (const net of [...byNet.keys()].sort()) rows.push([net, byNet.get(net).join(";"), byNet.get(net).length]);
  return rows.map(r => r.map(csvCell).join(",")).join("\n") + "\n";
}

function makePinMap() {
  const rows = [["gpio", "net", "purpose"]];
  for (const r of gpio) rows.push(r);
  return rows.map(r => r.map(csvCell).join(",")).join("\n") + "\n";
}

function write(rel, content) {
  const f = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
  process.stdout.write(`generated ${path.relative(ROOT, f)}\n`);
}

const manifest = {
  ...r1,
  status: "REFERENCE_ONLY_NOT_RELEASED_FOR_FABRICATION",
  gpio: Object.fromEntries(gpio.map(([n, net, purpose]) => [String(n), { net, purpose }])),
  configurations: configs,
  components: components.map(c => ({ ref: c.ref, value: c.value, maker: c.maker, role: c.role, population: c.dnp ? "DNP" : "FIT", pins: c.pins }))
};

write("hardware/mochi/mochi.kicad_sch", makeSchematic());
write("hardware/mochi/mochi.kicad_pcb", makeBoard());
write("hardware/mochi/mochi.kicad_sym", makeSymbolLibrary());
write("hardware/mochi/sym-lib-table", `(sym_lib_table\n  (version 7)\n  (lib (name "Mochi")(type "KiCad")(uri "\${KIPRJMOD}/mochi.kicad_sym")(options "")(descr "Mochi generated reference symbols"))\n)\n`);
write("hardware/mochi/fp-lib-table", `(fp_lib_table\n  (version 7)\n  (lib (name "Mochi_Reference")(type "KiCad")(uri "\${KIPRJMOD}/Mochi_Reference.pretty")(options "")(descr "Reference-only generated footprints; replace before fabrication"))\n)\n`);
for (const c of components) {
  write(`hardware/mochi/Mochi_Reference.pretty/${footprintId(c)}.kicad_mod`, makeLibraryFootprint(c));
}
write("hardware/mochi/doc/bom.csv", makeBom());
write("hardware/mochi/doc/connectivity.csv", makeConnectivity());
write("hardware/mochi/doc/pin_map.csv", makePinMap());
write("hardware/mochi/doc/design_manifest.json", JSON.stringify(manifest, null, 2) + "\n");
