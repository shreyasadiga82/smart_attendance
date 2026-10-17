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
