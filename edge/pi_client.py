#!/usr/bin/env python3
"""
Smart Attendance Edge Client (Raspberry Pi 3 Model B)
Captures camera frames, controls 1602A LCD & GPIO indicators,
and streams frames to the backend via WebSocket (ws:// or wss://).
"""

import os
import sys
import time
import json
import base64
import asyncio
import ssl
import threading
from typing import Optional
import cv2
import numpy as np

try:
    import websockets
except ImportError:
    print("Error: 'websockets' package is required. Install via pip install websockets")
    sys.exit(1)

# Configurable settings via ENV
SERVER_URL = os.getenv("EDGE_SERVER_URL", os.getenv("SERVER_URL", "ws://192.168.1.100:8000/ws/recognition"))
DEVICE_TOKEN = os.getenv("DEVICE_TOKEN", "default_edge_token")
EDGE_VERIFY_SSL = os.getenv("EDGE_VERIFY_SSL", "true").lower() in ("true", "1", "yes")
EDGE_CA_FILE = os.getenv("EDGE_CA_FILE", "").strip() or None

FRAME_WIDTH = int(os.getenv("FRAME_WIDTH", "320"))
FPS = int(os.getenv("FPS", "2"))

# Hardware GPIO Pins
LCD_MODE = os.getenv("LCD_MODE", "parallel").lower()
LCD_RS_PIN = int(os.getenv("LCD_RS_PIN", "25"))
LCD_E_PIN = int(os.getenv("LCD_E_PIN", "24"))
LCD_D4_PIN = int(os.getenv("LCD_D4_PIN", "5"))
LCD_D5_PIN = int(os.getenv("LCD_D5_PIN", "6"))
LCD_D6_PIN = int(os.getenv("LCD_D6_PIN", "13"))
LCD_D7_PIN = int(os.getenv("LCD_D7_PIN", "19"))
LCD_I2C_ADDR = int(os.getenv("LCD_I2C_ADDR", "39"))  # 0x27

PIN_LED_GREEN = int(os.getenv("PIN_LED_GREEN", "17"))
PIN_LED_RED = int(os.getenv("PIN_LED_RED", "27"))
PIN_BUZZER = int(os.getenv("PIN_BUZZER", "22"))
PIN_BUTTON = int(os.getenv("PIN_BUTTON", "23"))


def build_ssl_context(url: str, verify_ssl: bool = True, ca_file: Optional[str] = None) -> Optional[ssl.SSLContext]:
    """Build SSL context for wss:// connections with optional CA or bypass."""
    if not url.startswith("wss://"):
        return None

    if not verify_ssl:
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx

    if ca_file and os.path.exists(ca_file):
        ctx = ssl.create_default_context(cafile=ca_file)
        return ctx

    return ssl.create_default_context()


class EdgeFeedback:
    """Manages LCD (parallel 1602A or I2C), LEDs, Buzzer, and Button."""

    def __init__(self):
        self.lcd = None
        self.buzzer = None
        self.led_green = None
        self.led_red = None
        self.button = None
        self._idle_timer: Optional[threading.Timer] = None
        self._lock = threading.Lock()

        # Initialize GPIO peripherals
        try:
            from gpiozero import Buzzer, LED, Button
            self.buzzer = Buzzer(PIN_BUZZER)
            self.led_green = LED(PIN_LED_GREEN)
            self.led_red = LED(PIN_LED_RED)
            self.button = Button(PIN_BUTTON, pull_up=True)
        except Exception as e:
            print(f"[Feedback] GPIO LEDs/Buzzer unavailable: {e}. Falling back to console.")

        # Initialize LCD
        if LCD_MODE == "parallel":
            try:
                import RPi.GPIO as GPIO
                from RPLCD.gpio import CharLCD
                self.lcd = CharLCD(
                    numbering_mode=GPIO.BCM,
                    cols=16,
                    rows=2,
                    pin_rs=LCD_RS_PIN,
                    pin_e=LCD_E_PIN,
                    pins_data=[LCD_D4_PIN, LCD_D5_PIN, LCD_D6_PIN, LCD_D7_PIN],
                    pin_rw=None,
                    dotsize=8
                )
                self.lcd.clear()
                print("[Feedback] 1602A LCD initialized in 4-bit parallel mode.")
            except Exception as e:
                print(f"[Feedback] Parallel LCD init error: {e}. Falling back to console.")
                self.lcd = None
        elif LCD_MODE == "i2c":
            try:
                from RPLCD.i2c import CharLCD
                self.lcd = CharLCD(
                    i2c_expander='PCF8574',
                    address=LCD_I2C_ADDR,
                    port=1,
                    cols=16,
                    rows=2,
                    dotsize=8
                )
                self.lcd.clear()
                print("[Feedback] LCD initialized in I2C mode.")
            except Exception as e:
                print(f"[Feedback] I2C LCD init error: {e}. Falling back to console.")
                self.lcd = None

        self.display_idle()

    def display_idle(self):
        """Displays default idle message."""
        self._cancel_timer()
        self._write_lcd("Smart Attendance", "Ready")

    def _cancel_timer(self):
        if self._idle_timer is not None:
            self._idle_timer.cancel()
            self._idle_timer = None

    def _write_lcd(self, line1: str, line2: str = ""):
        l1 = (line1 or "")[:16]
        l2 = (line2 or "")[:16]
        print(f"[LCD] | {l1:<16} |")
        print(f"[LCD] | {l2:<16} |")
        if self.lcd:
            try:
                with self._lock:
                    self.lcd.clear()
                    self.lcd.cursor_pos = (0, 0)
                    self.lcd.write_string(l1)
                    if l2:
                        self.lcd.cursor_pos = (1, 0)
                        self.lcd.write_string(l2)
            except Exception as e:
                print(f"[Feedback] LCD write failed: {e}")

    def show(self, line1: str, line2: str = "", auto_reset: bool = True):
        """Display message, with 3s auto-reset to idle screen if auto_reset is True."""
        self._cancel_timer()
        self._write_lcd(line1, line2)
        if auto_reset:
            self._idle_timer = threading.Timer(3.0, self.display_idle)
            self._idle_timer.daemon = True
            self._idle_timer.start()

    def show_offline(self):
        """Display server offline alert on LCD without auto-clearing."""
        self._cancel_timer()
        self._write_lcd("Server offline", "Reconnecting...")

    def beep(self, duration: float, count: int = 1):
        if not self.buzzer:
            return
        def _run():
            try:
                for _ in range(count):
                    self.buzzer.on()
                    time.sleep(duration)
                    self.buzzer.off()
                    if count > 1:
                        time.sleep(duration)
            except Exception:
                pass
        threading.Thread(target=_run, daemon=True).start()

    def success(self):
        """Green LED + 1 beep."""
        if self.led_green:
            def _run():
                try:
                    self.led_green.on()
                    if self.led_red:
                        self.led_red.off()
                    self.beep(0.12, 1)
                    time.sleep(1.0)
                    self.led_green.off()
                except Exception:
                    pass
            threading.Thread(target=_run, daemon=True).start()
        else:
            self.beep(0.12, 1)

    def failure(self):
        """Red LED + 2 beeps."""
        if self.led_red:
            def _run():
                try:
                    if self.led_green:
                        self.led_green.off()
                    self.led_red.on()
                    self.beep(0.18, 2)
                    time.sleep(1.0)
                    self.led_red.off()
                except Exception:
                    pass
            threading.Thread(target=_run, daemon=True).start()
        else:
            self.beep(0.18, 2)


def get_camera():
    """Initializes picamera2 if available, otherwise falls back to OpenCV VideoCapture."""
    try:
        from picamera2 import Picamera2
        picam2 = Picamera2()
        h = int(FRAME_WIDTH * 0.75)
        config = picam2.create_preview_configuration(main={"size": (FRAME_WIDTH, h), "format": "RGB888"})
        picam2.configure(config)
        picam2.start()
        print("[Camera] Picamera2 initialized successfully.")
        return picam2, "picamera2"
    except Exception as e:
        print(f"[Camera] Picamera2 unavailable ({e}), using OpenCV VideoCapture(0).")
        cap = cv2.VideoCapture(0)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, int(FRAME_WIDTH * 0.75))
        return cap, "opencv"


def capture_frame(cam, cam_type: str):
    """Captures a single BGR frame from the active camera."""
    if cam_type == "picamera2":
        frame = cam.capture_array()
        return cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
    else:
        ret, frame = cam.read()
        return frame if ret else None


async def stream_session(fb: EdgeFeedback, cam, cam_type: str) -> None:
    """Connects to backend WebSocket and streams camera frames."""
    delimiter = "&" if "?" in SERVER_URL else "?"
    url = f"{SERVER_URL}{delimiter}token={DEVICE_TOKEN}"
    ssl_context = build_ssl_context(SERVER_URL, verify_ssl=EDGE_VERIFY_SSL, ca_file=EDGE_CA_FILE)

    print(f"[Edge Client] Connecting to {url} (SSL: {'Yes' if ssl_context else 'No'})...")
    fb.show("Connecting...", "Wait", auto_reset=False)

    connect_kwargs = {}
    if ssl_context is not None:
        connect_kwargs["ssl"] = ssl_context

    async with websockets.connect(url, **connect_kwargs) as ws:
        print("[Edge Client] Connected to backend server!")
        fb.display_idle()
        fb.success()

        while True:
            start_time = time.time()
            frame = capture_frame(cam, cam_type)

            if frame is not None:
                _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
                img_b64 = base64.b64encode(buffer).decode('utf-8')

                msg = {
                    "type": "frame",
                    "data": img_b64,
                    "timestamp": time.time()
                }
                await ws.send(json.dumps(msg))

                # Non-blocking check for responses
                try:
                    response_raw = await asyncio.wait_for(ws.recv(), timeout=0.15)
                    resp = json.loads(response_raw)
                    if resp.get("type") == "recognition_results":
                        for res in resp.get("results", []):
                            status = res.get("status")
                            name = (res.get("student_name") or "Unknown")[:16]

                            if status == "marked":
                                fb.show("Marked Present:", name, auto_reset=True)
                                fb.success()
                            elif status == "already_marked":
                                fb.show("Already Marked", name, auto_reset=True)
                                fb.beep(0.08, 1)
                            elif status == "recognized":
                                fb.show("Recognized:", name, auto_reset=True)
                                fb.success()
                            elif status == "unknown":
                                fb.show("Unknown Face", "Not Recognized", auto_reset=True)
                                fb.failure()
                except asyncio.TimeoutError:
                    pass

            elapsed = time.time() - start_time
            sleep_time = max(0.0, (1.0 / FPS) - elapsed)
            await asyncio.sleep(sleep_time)


async def main():
    fb = EdgeFeedback()
    cam, cam_type = get_camera()

    backoff = 1.0
    max_backoff = 30.0

    print("=======================================================")
    print(" Smart Attendance Pi Client Starting")
    print(f" Target Server : {SERVER_URL}")
    print(f" LCD Mode      : {LCD_MODE.upper()}")
    print(f" SSL Verify    : {EDGE_VERIFY_SSL}")
    print(f" CA File       : {EDGE_CA_FILE or 'System Default'}")
    print("=======================================================")

    try:
        while True:
            try:
                await stream_session(fb, cam, cam_type)
                backoff = 1.0  # Reset backoff upon clean disconnect
            except (websockets.exceptions.WebSocketException, OSError, asyncio.TimeoutError) as e:
                print(f"[Edge Client] Connection error: {e}")
                fb.show_offline()
                fb.failure()
            except Exception as e:
                print(f"[Edge Client] Unexpected exception: {e}")
                fb.show_offline()
                fb.failure()

            print(f"[Edge Client] Will attempt reconnect in {backoff:.1f}s...")
            await asyncio.sleep(backoff)
            backoff = min(max_backoff, backoff * 2.0)
    finally:
        if cam_type == "picamera2":
            try:
                cam.stop()
            except Exception:
                pass
        else:
            try:
                cam.release()
            except Exception:
                pass


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[Edge Client] Stopped by user.")
