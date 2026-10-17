# Hardware Setup for Raspberry Pi 3 Model B

## Overview
The Smart Attendance system supports hardware feedback using GPIO pins on a Raspberry Pi 3 Model B.

## Components
- Raspberry Pi 3 Model B
- 16x2 I2C LCD Display (with PCF8574 backpack)
- 5V Active Buzzer
- Green LED (Success)
- Red LED (Failure)
- Push Button (for manual trigger, optional)
- Resistors (330Ω for LEDs, 10kΩ pull-up for button if needed)
- Breadboard and jumper wires

## Wiring Table (Pi 3 Model B - 40-pin header)

### 16x2 I2C LCD
| LCD Pin | Pi 3 Pin | Pi 3 Pin Name |
|---------|----------|---------------|
| GND     | 6        | GND           |
| VCC     | 2        | 5V Power      |
| SDA     | 3        | GPIO 2 (SDA)  |
| SCL     | 5        | GPIO 3 (SCL)  |

### Status LEDs & Buzzer
| Component     | Pi 3 Pin | Pi 3 Pin Name | Note                          |
|---------------|----------|---------------|-------------------------------|
| Green LED (+) | 13       | GPIO 27       | Use 330Ω resistor in series   |
| Red LED (+)   | 15       | GPIO 22       | Use 330Ω resistor in series   |
| Buzzer (+)    | 11       | GPIO 17       | Active buzzer                 |
| Common GND    | 9        | GND           | Connect to all components (-) |

### Push Button (Optional)
| Component     | Pi 3 Pin | Pi 3 Pin Name | Note                          |
|---------------|----------|---------------|-------------------------------|
| Button Side A | 16       | GPIO 23       | Use internal pull-up          |
| Button Side B | 14       | GND           |                               |

## I2C Configuration
1. Enable I2C in `sudo raspi-config` (Interfacing Options -> I2C).
2. Ensure you have `i2c-tools` installed.
3. Check the address of your LCD using `i2cdetect -y 1`. The default is usually `0x27` or `0x3F`.
4. Update `LCD_I2C_ADDR` in your `.env` file if it differs from the default `39` (0x27).

## Power Considerations
The Pi 3 Model B requires a solid 5V 2.5A power supply. If you experience unexpected reboots or lightning bolt icons, ensure your power supply and micro-USB cable are high quality.

## Cooling
The Broadcom BCM2837 can run hot during continuous face detection. Active cooling (fan) or at least a good heatsink is highly recommended.

## ASCII Wiring Diagram

```
       Raspberry Pi 3 Model B (40-Pin Header)
                  +3V3  [01] [02]  +5V ────────────> LCD VCC
          (SDA)  GPIO2  [03] [04]  +5V
          (SCL)  GPIO3  [05] [06]  GND ────────────> LCD GND
                 GPIO4  [07] [08]  GPIO14 (TXD)
                   GND  [09] [10]  GPIO15 (RXD)
       Buzzer <── GPIO17 [11] [12]  GPIO18
    Green LED <── GPIO27 [13] [14]  GND ────────────> Button Side B
      Red LED <── GPIO22 [15] [16]  GPIO23 <───────── Button Side A
                  +3V3  [17] [18]  GPIO24
       (MOSI)   GPIO10  [19] [20]  GND
       (MISO)    GPIO9  [21] [22]  GPIO25
       (SCLK)   GPIO11  [23] [24]  GPIO8
                   GND  [25] [26]  GPIO7
                 ID_SD  [27] [28]  ID_SC
                 GPIO5  [29] [30]  GND
                 GPIO6  [31] [32]  GPIO12
                GPIO13  [33] [34]  GND
                GPIO19  [35] [36]  GPIO16
                GPIO26  [37] [38]  GPIO20
                   GND  [39] [40]  GPIO21

   Connections:
   [Pin 02] +5V    ─────────> LCD VCC
   [Pin 03] GPIO 2 ─────────> LCD SDA
   [Pin 05] GPIO 3 ─────────> LCD SCL
   [Pin 06] GND    ─────────> LCD GND & Shared Common Ground
   [Pin 11] GPIO 17 ──[ + ]──> 5V Active Buzzer ──[ - ]──> GND
   [Pin 13] GPIO 27 ──[330Ω]──> Green LED [Anode] -> [Cathode] ──> GND
   [Pin 15] GPIO 22 ──[330Ω]──> Red LED [Anode]   -> [Cathode] ──> GND
   [Pin 16] GPIO 23 ─────────> Push Button (Side A)
   [Pin 14] GND     ─────────> Push Button (Side B)
```

