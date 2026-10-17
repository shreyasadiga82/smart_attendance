#!/usr/bin/env python3
"""
Test All Smart Attendance Hardware Peripherals Sequentially:
1. 16x2 HD44780 LCD (Parallel 4-bit default or I2C)
2. Green LED (GPIO 17)
3. Red LED (GPIO 27)
4. Buzzer (GPIO 22)
5. Button (GPIO 23)

Reads pin definitions from .env or defaults.
"""

import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv

# Load .env
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
LCD_I2C_ADDR = int(os.getenv("LCD_I2C_ADDR", "39"))

PIN_LED_GREEN = int(os.getenv("PIN_LED_GREEN", "17"))
PIN_LED_RED = int(os.getenv("PIN_LED_RED", "27"))
PIN_BUZZER = int(os.getenv("PIN_BUZZER", "22"))
PIN_BUTTON = int(os.getenv("PIN_BUTTON", "23"))

print("==================================================")
print("  Smart Attendance System - Complete Hardware Test")
print("==================================================")
print(f"  LCD Mode    : {LCD_MODE.upper()}")
if LCD_MODE == "parallel":
    print(f"  LCD Pins    : RS={LCD_RS_PIN}, E={LCD_E_PIN}, D4={LCD_D4_PIN}, D5={LCD_D5_PIN}, D6={LCD_D6_PIN}, D7={LCD_D7_PIN}")
else:
    print(f"  LCD I2C Addr: 0x{LCD_I2C_ADDR:02X}")
print(f"  Green LED   : GPIO {PIN_LED_GREEN}")
print(f"  Red LED     : GPIO {PIN_LED_RED}")
print(f"  Buzzer      : GPIO {PIN_BUZZER}")
print(f"  Button      : GPIO {PIN_BUTTON}")
print("==================================================")

try:
    from gpiozero import LED, Buzzer, Button
except ImportError:
    print("[-] Error: 'gpiozero' package is required. Install via pip install gpiozero")
    sys.exit(1)

# Step 1: LCD Test
print("\n[Step 1/5] Testing 16x2 LCD Display...")
lcd = None
try:
    if LCD_MODE == "parallel":
        import RPi.GPIO as GPIO
        from RPLCD.gpio import CharLCD
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
    else:
        from RPLCD.i2c import CharLCD
        lcd = CharLCD(
            i2c_expander='PCF8574',
            address=LCD_I2C_ADDR,
            port=1,
            cols=16,
            rows=2,
            dotsize=8
        )
    lcd.clear()
    lcd.cursor_pos = (0, 0)
    lcd.write_string("Hardware Test")
    lcd.cursor_pos = (1, 0)
    lcd.write_string("LCD: PASS [OK]")
    print("      [+] LCD initialization and write succeeded.")
    time.sleep(2.0)
except Exception as e:
    print(f"      [-] LCD failed: {e}")

# Step 2: Green LED Test
print(f"\n[Step 2/5] Testing Green LED (GPIO {PIN_LED_GREEN})...")
try:
    if lcd:
        lcd.clear()
        lcd.cursor_pos = (0, 0)
        lcd.write_string("Testing Green")
        lcd.cursor_pos = (1, 0)
        lcd.write_string("LED ON...")
    led_green = LED(PIN_LED_GREEN)
    led_green.on()
    print("      [+] Green LED is ON for 2 seconds...")
    time.sleep(2.0)
    led_green.off()
    print("      [+] Green LED is OFF.")
    led_green.close()
except Exception as e:
    print(f"      [-] Green LED failed: {e}")

# Step 3: Red LED Test
print(f"\n[Step 3/5] Testing Red LED (GPIO {PIN_LED_RED})...")
try:
    if lcd:
        lcd.clear()
        lcd.cursor_pos = (0, 0)
        lcd.write_string("Testing Red")
        lcd.cursor_pos = (1, 0)
        lcd.write_string("LED ON...")
    led_red = LED(PIN_LED_RED)
    led_red.on()
    print("      [+] Red LED is ON for 2 seconds...")
    time.sleep(2.0)
    led_red.off()
    print("      [+] Red LED is OFF.")
    led_red.close()
except Exception as e:
    print(f"      [-] Red LED failed: {e}")

# Step 4: Buzzer Test
print(f"\n[Step 4/5] Testing Buzzer (GPIO {PIN_BUZZER})...")
try:
    if lcd:
        lcd.clear()
        lcd.cursor_pos = (0, 0)
        lcd.write_string("Testing Buzzer")
        lcd.cursor_pos = (1, 0)
        lcd.write_string("Beeping...")
    buzzer = Buzzer(PIN_BUZZER)
    print("      [+] Beeping 1...")
    buzzer.on()
    time.sleep(0.15)
    buzzer.off()
    time.sleep(0.15)
    print("      [+] Beeping 2...")
    buzzer.on()
    time.sleep(0.15)
    buzzer.off()
    print("      [+] Buzzer test complete.")
    buzzer.close()
except Exception as e:
    print(f"      [-] Buzzer failed: {e}")

# Step 5: Push Button Test
print(f"\n[Step 5/5] Testing Push Button (GPIO {PIN_BUTTON})...")
try:
    if lcd:
        lcd.clear()
        lcd.cursor_pos = (0, 0)
        lcd.write_string("Press Button...")
        lcd.cursor_pos = (1, 0)
        lcd.write_string("10s Timeout")
    btn = Button(PIN_BUTTON, pull_up=True)
    print("      --> Please press the button now (waiting up to 10s)...")
    pressed = btn.wait_for_press(timeout=10.0)
    if pressed:
        print("      [+] Button press DETECTED!")
        if lcd:
            lcd.clear()
            lcd.cursor_pos = (0, 0)
            lcd.write_string("Button Pressed!")
            lcd.cursor_pos = (1, 0)
            lcd.write_string("PASS [OK]")
        time.sleep(2.0)
    else:
        print("      [-] Timed out waiting for button press.")
        if lcd:
            lcd.clear()
            lcd.cursor_pos = (0, 0)
            lcd.write_string("Button Timeout")
        time.sleep(1.5)
    btn.close()
except Exception as e:
    print(f"      [-] Button failed: {e}")

# Finalize LCD
if lcd:
    try:
        lcd.clear()
        lcd.cursor_pos = (0, 0)
        lcd.write_string("Smart Attendance")
        lcd.cursor_pos = (1, 0)
        lcd.write_string("Ready")
    except Exception:
        pass

print("\n==================================================")
print("  All Hardware Diagnostic Steps Finished!")
print("==================================================")
