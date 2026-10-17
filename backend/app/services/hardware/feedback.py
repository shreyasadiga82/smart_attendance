import abc
import logging
import time
import threading
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)


def truncate_lcd_text(text: Optional[str], max_len: int = 16) -> str:
    """Truncate or format text to fit a 1602 LCD 16-character row."""
    if text is None:
        return ""
    return str(text)[:max_len]


class HardwareFeedback(abc.ABC):
    @abc.abstractmethod
    def init(self) -> bool:
        pass

    @abc.abstractmethod
    def cleanup(self) -> None:
        pass

    @abc.abstractmethod
    def success(self, msg: str = None) -> None:
        pass

    @abc.abstractmethod
    def already_marked(self, msg: str = None) -> None:
        pass

    @abc.abstractmethod
    def unknown(self, msg: str = None) -> None:
        pass

    @abc.abstractmethod
    def failure(self, msg: str = None) -> None:
        pass

    @abc.abstractmethod
    def info(self, msg: str = None) -> None:
        pass

    @abc.abstractmethod
    def display_message(self, line1: str, line2: str = "", reset_after_seconds: Optional[float] = 3.0) -> None:
        pass

    @abc.abstractmethod
    def display_idle(self) -> None:
        pass


class NoopFeedback(HardwareFeedback):
    def __init__(self):
        pass

    def init(self) -> bool:
        return True

    def cleanup(self) -> None:
        pass

    def success(self, msg: str = None) -> None:
        pass

    def already_marked(self, msg: str = None) -> None:
        pass

    def unknown(self, msg: str = None) -> None:
        pass

    def failure(self, msg: str = None) -> None:
        pass

    def info(self, msg: str = None) -> None:
        pass

    def display_message(self, line1: str, line2: str = "", reset_after_seconds: Optional[float] = 3.0) -> None:
        pass

    def display_idle(self) -> None:
        pass


class GPIOFeedback(HardwareFeedback):
    def __init__(self, cfg=None):
        self.cfg = cfg or settings
        self._initialized = False
        self.lcd = None
        self.buzzer = None
        self.led_green = None
        self.led_red = None
        self._idle_timer: Optional[threading.Timer] = None

    def init(self) -> bool:
        try:
            from gpiozero import Buzzer, LED
            
            # Setup indicators with user hardware pins
            self.buzzer = Buzzer(self.cfg.PIN_BUZZER)
            self.led_green = LED(self.cfg.PIN_LED_GREEN)
            self.led_red = LED(self.cfg.PIN_LED_RED)

            # Setup LCD based on LCD_MODE
            if self.cfg.LCD_MODE == "i2c":
                from RPLCD.i2c import CharLCD
                self.lcd = CharLCD(
                    i2c_expander='PCF8574',
                    address=self.cfg.LCD_I2C_ADDR,
                    port=1,
                    cols=16,
                    rows=2,
                    dotsize=8
                )
            else:
                # 4-bit parallel HD44780 "1602A" without backpack (Default)
                from RPLCD.gpio import CharLCD
                import RPi.GPIO as GPIO

                self.lcd = CharLCD(
                    pin_rs=self.cfg.LCD_RS_PIN,
                    pin_e=self.cfg.LCD_E_PIN,
                    pins_data=[
                        self.cfg.LCD_D4_PIN,
                        self.cfg.LCD_D5_PIN,
                        self.cfg.LCD_D6_PIN,
                        self.cfg.LCD_D7_PIN
                    ],
                    pin_rw=None,  # RW tied to GND
                    numbering_mode=GPIO.BCM,
                    cols=16,
                    rows=2,
                    dotsize=8
                )

            self.lcd.clear()
            self._initialized = True
            logger.info(f"GPIO hardware initialized successfully (LCD mode: {settings.LCD_MODE})")
            self.display_idle()
            return True
        except ImportError as e:
            logger.warning(f"Hardware library missing ({e}). Cannot init GPIOFeedback.")
            return False
        except Exception as e:
            logger.warning(f"Error initializing GPIO hardware: {e}")
            return False

    def cleanup(self) -> None:
        if self._idle_timer:
            self._idle_timer.cancel()
            self._idle_timer = None

        if self._initialized:
            try:
                if self.led_green: self.led_green.off()
                if self.led_red: self.led_red.off()
                if self.buzzer: self.buzzer.off()
                if self.lcd: self.lcd.clear()
            except Exception:
                pass
            self._initialized = False

    def _beep(self, duration: float, count: int = 1):
        if not self._initialized or not self.buzzer:
            return
        for _ in range(count):
            self.buzzer.on()
            time.sleep(duration)
            self.buzzer.off()
            time.sleep(duration)

    def display_message(self, line1: str, line2: str = "", reset_after_seconds: Optional[float] = 3.0) -> None:
        if not self._initialized or not self.lcd:
            return

        if self._idle_timer:
            self._idle_timer.cancel()
            self._idle_timer = None

        try:
            self.lcd.clear()
            self.lcd.cursor_pos = (0, 0)
            self.lcd.write_string(line1[:16])
            if line2:
                self.lcd.cursor_pos = (1, 0)
                self.lcd.write_string(line2[:16])
        except Exception as e:
            logger.error(f"LCD error: {e}")

        # Automatically return to idle message after 3 seconds
        if reset_after_seconds and reset_after_seconds > 0:
            self._idle_timer = threading.Timer(reset_after_seconds, self.display_idle)
            self._idle_timer.daemon = True
            self._idle_timer.start()

    def display_idle(self) -> None:
        if not self._initialized or not self.lcd:
            return
        try:
            self.lcd.clear()
            self.lcd.cursor_pos = (0, 0)
            self.lcd.write_string("Smart Attendance"[:16])
            self.lcd.cursor_pos = (1, 0)
            self.lcd.write_string("Ready"[:16])
        except Exception as e:
            logger.error(f"LCD error: {e}")

    def success(self, msg: str = None) -> None:
        if not self._initialized:
            return
        if self.led_green: self.led_green.on()
        if self.led_red: self.led_red.off()
        self._beep(0.12, 1)
        name = msg[:16] if msg else "Welcome"
        self.display_message("Welcome:", name, reset_after_seconds=3.0)
        time.sleep(0.5)
        if self.led_green: self.led_green.off()

    def already_marked(self, msg: str = None) -> None:
        if not self._initialized:
            return
        if self.led_green: self.led_green.on()
        self._beep(0.08, 1)
        name = msg[:16] if msg else ""
        self.display_message("Already Marked:", name, reset_after_seconds=3.0)
        time.sleep(0.4)
        if self.led_green: self.led_green.off()

    def unknown(self, msg: str = None) -> None:
        if not self._initialized:
            return
        if self.led_green: self.led_green.off()
        if self.led_red: self.led_red.on()
        self._beep(0.35, 1)
        self.display_message("Not Recognised", msg[:16] if msg else "Try again", reset_after_seconds=3.0)
        time.sleep(0.8)
        if self.led_red: self.led_red.off()

    def failure(self, msg: str = None) -> None:
        if not self._initialized:
            return
        if self.led_green: self.led_green.off()
        if self.led_red: self.led_red.on()
        self._beep(0.15, 2)
        self.display_message("Scan Error", msg[:16] if msg else "", reset_after_seconds=3.0)
        time.sleep(0.8)
        if self.led_red: self.led_red.off()

    def info(self, msg: str = None) -> None:
        if not self._initialized:
            return
        if msg:
            self.display_message("Notice:", msg[:16], reset_after_seconds=3.0)


class HardwareFeedbackFactory:
    @staticmethod
    def create_feedback() -> HardwareFeedback:
        if settings.PROFILE == "pi3":
            try:
                fb = GPIOFeedback()
                if fb.init():
                    return fb
            except Exception as e:
                logger.warning(f"Failed to initialize GPIO feedback, falling back to Noop: {e}")
        return NoopFeedback()


def get_feedback() -> HardwareFeedback:
    return HardwareFeedbackFactory.create_feedback()