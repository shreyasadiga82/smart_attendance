#!/usr/bin/env python3
"""
Test 16x2 HD44780 LCD (Parallel 4-bit or I2C backpack)
Reads configuration from .env or defaults to:
  LCD_MODE=parallel
  RS=GPIO25, E=GPIO24, D4=GPIO5, D5=GPIO6, D6=GPIO13, D7=GPIO19
"""

import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root or backend
env_paths = [
    Path(__file__).resolve().parent.parent / ".env",
    Path(__file__).resolve().parent.parent / "backend" / ".env"
]
for p in env_paths:
    if p.exists():
        load_dotenv(p)
        print(f"Loaded environment from: {p}")
        break

LCD_MODE = os.getenv("LCD_MODE", "parallel").lower()
LCD_RS_PIN = int(os.getenv("LCD_RS_PIN", "25"))
LCD_E_PIN = int(os.getenv("LCD_E_PIN", "24"))
LCD_D4_PIN = int(os.getenv("LCD_D4_PIN", "5"))
LCD_D5_PIN = int(os.getenv("LCD_D5_PIN", "6"))
LCD_D6_PIN = int(os.getenv("LCD_D6_PIN", "13"))
LCD_D7_PIN = int(os.getenv("LCD_D7_PIN", "19"))
LCD_I2C_ADDR = int(os.getenv("LCD_I2C_ADDR", "39"))  # 0x27

print("==================================================")
print("  Smart Attendance - 16x2 LCD Diagnostic Tool")
print("==================================================")
print(f"  Mode     : {LCD_MODE.upper()}")
if LCD_MODE == "parallel":
    print(f"  RS Pin   : GPIO {LCD_RS_PIN}")
    print(f"  E Pin    : GPIO {LCD_E_PIN}")
    print(f"  Data Pins: D4={LCD_D4_PIN}, D5={LCD_D5_PIN}, D6={LCD_D6_PIN}, D7={LCD_D7_PIN}")
    print("  RW Pin   : Tied to GND (pin_rw=None)")
else:
    print(f"  I2C Addr : 0x{LCD_I2C_ADDR:02X} ({LCD_I2C_ADDR})")
print("==================================================")

lcd = None
try:
    if LCD_MODE == "parallel":
        try:
            import RPi.GPIO as GPIO
            from RPLCD.gpio import CharLCD
        except ImportError:
            print("[-] Error: 'RPi.GPIO' and 'RPLCD' packages are required.")
            print("    Run: pip install RPi.GPIO RPLCD")
            sys.exit(1)

        lcd = CharLCD(
            numbering_mode=GPIO.BCM,
            cols=16,
            rows=2,
            pin_rs=LCD_RS_PIN,
            pin_e=LCD_E_PIN,
            pins_data=[LCD_D4_PIN, LCD_D5_PIN, LCD_D6_PIN, LCD_D7_PIN],
            pin_rw=None,
            dotsize=8
        )
    elif LCD_MODE == "i2c":
        try:
            from RPLCD.i2c import CharLCD
        except ImportError:
            print("[-] Error: 'RPLCD' and 'smbus2' packages are required for I2C.")
            print("    Run: pip install RPLCD smbus2")
            sys.exit(1)

        lcd = CharLCD(
            i2c_expander='PCF8574',
            address=LCD_I2C_ADDR,
            port=1,
            cols=16,
            rows=2,
            dotsize=8
        )
    else:
        print(f"[-] Invalid LCD_MODE: {LCD_MODE}. Must be 'parallel' or 'i2c'.")
        sys.exit(1)

    print("[+] LCD hardware initialized successfully!")

    print("[1/4] Clearing display...")
    lcd.clear()
    time.sleep(0.5)

    print("[2/4] Testing line 1 and line 2 writing...")
    lcd.cursor_pos = (0, 0)
    lcd.write_string("LCD Test OK!")
    lcd.cursor_pos = (1, 0)
    lcd.write_string("1602A HD44780")
    print("      Displayed: 'LCD Test OK!' / '1602A HD44780'")
    time.sleep(2.5)

    print("[3/4] Testing text truncation to 16 characters...")
    lcd.clear()
    long_name = "Super Long Student Name That Exceeds 16 Chars"
    lcd.cursor_pos = (0, 0)
    lcd.write_string(long_name[:16])
    lcd.cursor_pos = (1, 0)
    lcd.write_string("Truncation Test")
    print(f"      Truncated '{long_name}' -> '{long_name[:16]}'")
    time.sleep(2.5)

    print("[4/4] Setting standard idle screen...")
    lcd.clear()
    lcd.cursor_pos = (0, 0)
    lcd.write_string("Smart Attendance")
    lcd.cursor_pos = (1, 0)
    lcd.write_string("Ready")
    time.sleep(1.0)

    print("==================================================")
    print("  LCD Test Completed Successfully!")
    print("  If the screen is blank or shows black boxes:")
    print("  1. Adjust contrast potentiometer connected to V0 (Pin 3).")
    print("  2. Ensure RW (Pin 5) is connected directly to GND.")
    print("  3. Check Backlight A (Pin 15) to +5V (via 220 ohm) & K (Pin 16) to GND.")
    print("==================================================")

except Exception as e:
    print(f"[-] LCD Test failed with error: {e}")
    sys.exit(1)
finally:
    if lcd and LCD_MODE == "parallel":
        try:
            # Leave the message readable on exit; do not destroy GPIO immediately
            pass
        except Exception:
            pass
