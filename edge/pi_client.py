#!/usr/bin/env python3
"""
Smart Attendance Edge Client (Raspberry Pi 3 Model B)
Captures frames, handles GPIO, and streams to backend via WebSocket.
"""

import os
import sys
import time
import json
import base64
import asyncio
import websockets
import cv2
import numpy as np

# Configurable settings via ENV
SERVER_URL = os.getenv("SERVER_URL", "ws://192.168.1.100:8000/ws/recognition")
DEVICE_TOKEN = os.getenv("DEVICE_TOKEN", "default_edge_token")
FRAME_WIDTH = int(os.getenv("FRAME_WIDTH", "320"))
FPS = int(os.getenv("FPS", "2"))
PIN_BUZZER = int(os.getenv("PIN_BUZZER", "17"))
PIN_LED_GREEN = int(os.getenv("PIN_LED_GREEN", "27"))
PIN_LED_RED = int(os.getenv("PIN_LED_RED", "22"))
PIN_BUTTON = int(os.getenv("PIN_BUTTON", "23"))
LCD_I2C_ADDR = int(os.getenv("LCD_I2C_ADDR", "39")) # 0x27

try:
    from gpiozero import Buzzer, LED, Button
    from RPLCD.i2c import CharLCD
    HAS_GPIO = True
except ImportError:
    HAS_GPIO = False
    print("Warning: gpiozero or RPLCD not found. Running without hardware feedback.")

class Feedback:
    def __init__(self):
        self.lcd = None
        self.buzzer = None
        self.led_green = None
        self.led_red = None
        self.button = None
        if HAS_GPIO:
            try:
                self.buzzer = Buzzer(PIN_BUZZER)
                self.led_green = LED(PIN_LED_GREEN)
                self.led_red = LED(PIN_LED_RED)
                self.button = Button(PIN_BUTTON, pull_up=True)
                self.lcd = CharLCD(i2c_expander='PCF8574', address=LCD_I2C_ADDR, port=1, cols=16, rows=2, dotsize=8)
                self.lcd.clear()
            except Exception as e:
                print(f"Error initializing GPIO: {e}")

    def show(self, line1, line2=""):
        print(f"LCD: {line1} | {line2}")
        if self.lcd:
            try:
                self.lcd.clear()
                self.lcd.cursor_pos = (0, 0)
                self.lcd.write_string(line1[:16])
                self.lcd.cursor_pos = (1, 0)
                self.lcd.write_string(line2[:16])
            except Exception as e:
                print(f"LCD Error: {e}")

    def beep(self, duration, count):
        if not self.buzzer: return
        for _ in range(count):
            self.buzzer.on()
            time.sleep(duration)
            self.buzzer.off()
            time.sleep(duration)

    def success(self):
        if self.led_green:
            self.led_green.on()
            self.led_red.off()
            self.beep(0.1, 1)
            time.sleep(1)
            self.led_green.off()

    def failure(self):
        if self.led_red:
            self.led_green.off()
            self.led_red.on()
            self.beep(0.2, 2)
            time.sleep(1)
            self.led_red.off()

    def wait_for_button(self, timeout=None):
        if self.button:
            return self.button.wait_for_press(timeout)
        time.sleep(timeout or 0.1)
        return True


def get_camera():
    try:
        from picamera2 import Picamera2
        picam2 = Picamera2()
        h = int(FRAME_WIDTH * 0.75)
        config = picam2.create_preview_configuration(main={"size": (FRAME_WIDTH, h), "format": "RGB888"})
        picam2.configure(config)
        picam2.start()
        print("Using picamera2.")
        return picam2, "picamera2"
    except Exception as e:
        print(f"Falling back to OpenCV camera due to: {e}")
        cap = cv2.VideoCapture(0)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, int(FRAME_WIDTH * 0.75))
        return cap, "opencv"

def capture_frame(cam, cam_type):
    if cam_type == "picamera2":
        frame = cam.capture_array()
        return cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
    else:
        ret, frame = cam.read()
        return frame if ret else None


async def run_client():
    fb = Feedback()
    cam, cam_type = get_camera()
    
    url = f"{SERVER_URL}?token={DEVICE_TOKEN}"
    print(f"Connecting to {url}...")
    fb.show("Connecting...", "Wait")
    
    try:
        async with websockets.connect(url) as websocket:
            fb.show("Connected", "Ready")
            fb.success()
            print("Connected!")
            
            while True:
                # Optional: implement motion trigger or button trigger here to save CPU
                # We'll run continuously but respect FPS limit
                start_time = time.time()
                
                frame = capture_frame(cam, cam_type)
                if frame is not None:
                    # Optional motion detection before sending frame
                    _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
                    img_b64 = base64.b64encode(buffer).decode('utf-8')
                    
                    msg = {
                        "type": "frame",
                        "data": img_b64,
                        "timestamp": time.time()
                    }
                    await websocket.send(json.dumps(msg))
                    
                    try:
                        response = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                        resp_data = json.loads(response)
                        
                        if resp_data.get("type") == "recognition_results":
                            results = resp_data.get("results", [])
                            for res in results:
                                status = res.get("status")
                                name = res.get("student_name", "Unknown")
                                
                                if status == "marked":
                                    fb.show(f"Marked:", name)
                                    fb.success()
                                elif status == "already_marked":
                                    fb.show("Already Marked", name)
                                    fb.info() # Custom beep/LED if wanted
                                elif status == "recognized":
                                    fb.show("Recognized:", name)
                                    fb.success()
                                elif status == "unknown":
                                    fb.show("Unknown Face")
                                    fb.failure()
                    except asyncio.TimeoutError:
                        pass
                
                elapsed = time.time() - start_time
                sleep_time = max(0, (1.0 / FPS) - elapsed)
                await asyncio.sleep(sleep_time)

    except Exception as e:
        print(f"Connection error: {e}")
        fb.show("Conn. Error", "Retrying...")
        fb.failure()
    finally:
        if cam_type == "picamera2":
            cam.stop()
        else:
            cam.release()

if __name__ == "__main__":
    while True:
        asyncio.run(run_client())
        time.sleep(5)
