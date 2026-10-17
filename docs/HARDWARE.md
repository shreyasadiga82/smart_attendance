# Hardware Setup for Raspberry Pi 3 Model B

## Overview
The Smart Attendance system supports hardware feedback using GPIO pins on a Raspberry Pi 3 Model B.
It supports both:
1. **Parallel 1602A HD44780 LCD** (4-bit mode, default `LCD_MODE=parallel` — no I2C backpack required).
2. **I2C 16x2 LCD** with PCF8574 backpack (`LCD_MODE=i2c`).

---

## Components
- Raspberry Pi 3 Model B (40-pin GPIO header)
- Bare 16x2 Character LCD (HD44780 / 1602A standard) OR I2C LCD with PCF8574
- 10kΩ Potentiometer (or ~1kΩ-2.2kΩ fixed resistor) for LCD contrast (V0)
- 220Ω Resistor for LCD backlight (Pin 15 Anode)
- Two 330Ω Resistors for Status LEDs
- 5V Active Buzzer
- Green LED (Attendance verified / marked)
- Red LED (Unknown face / warning / offline)
- Momentary Push Button (manual trigger / reset)
- Solderless breadboard and jumper wires

---

## Wiring Guide: 1602A HD44780 Parallel LCD (Default)

The 1602A display connects directly to the Raspberry Pi using 4 data lines and 2 control lines:

| 1602A Pin # | 1602A Pin Name | Connection / Pi 3 Header Pin | Description / Notes |
|:---:|:---|:---|:---|
| **1** | **VSS** | Pi Pin 6 (GND) | Ground rail |
| **2** | **VDD** | Pi Pin 2 (+5V) | Logic power supply |
| **3** | **V0** | Potentiometer Wiper (or 1kΩ-2.2kΩ to GND) | Contrast adjustment voltage |
| **4** | **RS** | Pi Pin 22 (**GPIO 25**) | Register Select (Command/Data) |
| **5** | **RW** | Breadboard GND Rail (**GND**) | Read/Write tied to GND for Write-only mode |
| **6** | **E** | Pi Pin 18 (**GPIO 24**) | Enable Strobe signal |
| **7-10**| **D0 - D3** | *Leave Disconnected* | Unused in 4-bit parallel mode |
| **11**| **D4** | Pi Pin 29 (**GPIO 5**) | Data Bit 4 |
| **12**| **D5** | Pi Pin 31 (**GPIO 6**) | Data Bit 5 |
| **13**| **D6** | Pi Pin 33 (**GPIO 13**) | Data Bit 6 |
| **14**| **D7** | Pi Pin 35 (**GPIO 19**) | Data Bit 7 (MSB) |
| **15**| **A / BLA** | Pi Pin 4 (+5V) via **220Ω resistor** | Backlight LED Anode (+) |
| **16**| **K / BLK** | Pi Pin 34 (**GND**) | Backlight LED Cathode (-) |

> [!TIP]
> **Contrast Tuning (V0 - Pin 3)**: If the display is powered on and shows only black rectangles or appears blank, slowly rotate the 10k potentiometer connected to V0 until characters appear sharp and crisp. Alternatively, a fixed 1kΩ - 2.2kΩ resistor from V0 to GND gives standard contrast.
>
> **Backlight Resistor (Pin 15)**: Always use a 220Ω resistor between +5V and Pin 15 (A) to prevent burning out the backlight LED.

---

## Wiring Guide: Status LEDs, Buzzer & Button

| Peripheral | Component | Physical Pin | BCM GPIO | Circuit Connection |
|:---|:---|:---:|:---:|:---|
| **Green LED** | Anode (+) | Pin 11 | **GPIO 17** | 330Ω resistor in series to LED (+) -> Cathode to GND |
| **Red LED** | Anode (+) | Pin 13 | **GPIO 27** | 330Ω resistor in series to LED (+) -> Cathode to GND |
| **Active Buzzer** | Signal (+) | Pin 15 | **GPIO 22** | Buzzer (+) to GPIO 22 -> Buzzer (-) to GND |
| **Push Button** | Terminal 1 | Pin 16 | **GPIO 23** | Button side A to GPIO 23 |
| **Push Button** | Terminal 2 | Pin 14 | **GND** | Button side B to GND (internal pull-up enabled) |

---

## Wiring Guide: Optional I2C LCD (`LCD_MODE=i2c`)

If using an LCD with a soldered PCF8574 backpack:

| PCF8574 Pin | Pi 3 Header Pin | Pi Function | Description |
|:---|:---:|:---|:---|
| **GND** | Pin 6 | GND | Ground |
| **VCC** | Pin 2 | +5V | 5V Power |
| **SDA** | Pin 3 | GPIO 2 (SDA) | I2C Data line |
| **SCL** | Pin 5 | GPIO 3 (SCL) | I2C Clock line |

To use I2C mode:
1. Set `LCD_MODE=i2c` in `.env`.
2. Enable I2C in `/boot/config.txt` (`dtparam=i2c_arm=on`) or via `sudo raspi-config`.
3. Detect address with `i2cdetect -y 1` (default is `0x27` / `39`).

---

## ASCII Wiring Diagram

```
                 Raspberry Pi 3 Model B (40-Pin Header)
                           +3V3  [01] [02]  +5V ────────────> 1602A VDD (Pin 2)
                   (SDA)  GPIO2  [03] [04]  +5V ──[220Ω]────> 1602A A (Pin 15)
                   (SCL)  GPIO3  [05] [06]  GND ────────────> 1602A VSS (Pin 1) & RW (Pin 5)
                          GPIO4  [07] [08]  GPIO14 (TXD)
                            GND  [09] [10]  GPIO15 (RXD)
       Green LED <───[330Ω] GPIO17 [11] [12]  GPIO18
         Red LED <───[330Ω] GPIO27 [13] [14]  GND ────────────> Push Button (Terminal 2)
          Buzzer <───────── GPIO22 [15] [16]  GPIO23 <───────── Push Button (Terminal 1)
                           +3V3  [17] [18]  GPIO24 ─────────> 1602A E (Pin 6)
                 (MOSI)  GPIO10  [19] [20]  GND
                 (MISO)   GPIO9  [21] [22]  GPIO25 ─────────> 1602A RS (Pin 4)
                 (SCLK)  GPIO11  [23] [24]  GPIO8
                            GND  [25] [26]  GPIO7
                          ID_SD  [27] [28]  ID_SC
       1602A D4 <───────── GPIO5  [29] [30]  GND
       1602A D5 <───────── GPIO6  [31] [32]  GPIO12
       1602A D6 <───────── GPIO13 [33] [34]  GND ────────────> 1602A K (Pin 16)
       1602A D7 <───────── GPIO19 [35] [36]  GPIO16
                         GPIO26  [37] [38]  GPIO20
                            GND  [39] [40]  GPIO21

       Contrast Circuit:
       +5V (Pin 2) ───[10k Pot Left]
       GND (Pin 6) ───[10k Pot Right]
       1602A V0 (Pin 3) <───[10k Pot Wiper / Center]
```

---

## Hardware Testing

Run the included verification scripts directly on the Raspberry Pi:

```bash
# Test LCD only (write, clear, truncation test)
python scripts/test_lcd.py

# Test all peripherals sequentially (LCD -> Green LED -> Red LED -> Buzzer -> Button)
python scripts/test_hardware.py
```
