import abc
import logging
import time
from app.config import settings

logger = logging.getLogger(__name__)

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
    def failure(self, msg: str = None) -> None:
        pass

    @abc.abstractmethod
    def info(self, msg: str = None) -> None:
        pass

    @abc.abstractmethod
    def display_message(self, line1: str, line2: str = "") -> None:
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

    def failure(self, msg: str = None) -> None:
        pass

    def info(self, msg: str = None) -> None:
        pass

    def display_message(self, line1: str, line2: str = "") -> None:
        pass


class GPIOFeedback(HardwareFeedback):
    def __init__(self):
        self._initialized = False
        self.lcd = None
        self.buzzer = None
        self.led_green = None
        self.led_red = None

    def init(self) -> bool:
        try:
            from gpiozero import Buzzer, LED
            from RPLCD.i2c import CharLCD
            
            self.buzzer = Buzzer(settings.PIN_BUZZER)
            self.led_green = LED(settings.PIN_LED_GREEN)
            self.led_red = LED(settings.PIN_LED_RED)
            
            self.lcd = CharLCD(i2c_expander='PCF8574', address=settings.LCD_I2C_ADDR, port=1, cols=16, rows=2, dotsize=8)
            self.lcd.clear()
            self._initialized = True
            logger.info("GPIO hardware initialized successfully")
            return True
        except ImportError:
            logger.warning("gpiozero or RPLCD not found. Cannot init GPIOFeedback.")
            return False
        except Exception as e:
            logger.warning(f"Error initializing GPIO hardware: {e}")
            return False

    def cleanup(self) -> None:
        if self._initialized:
            try:
                self.led_green.off()
                self.led_red.off()
                self.buzzer.off()
                self.lcd.clear()
            except Exception:
                pass

    def _beep(self, duration: float, count: int = 1):
        if not self._initialized or not self.buzzer:
            return
        for _ in range(count):
            self.buzzer.on()
            time.sleep(duration)
            self.buzzer.off()
            time.sleep(duration)

    def success(self, msg: str = None) -> None:
        if not self._initialized: return
        self.led_green.on()
        self.led_red.off()
        self._beep(0.1, 1)
        if msg:
            self.display_message(msg[:16])
        time.sleep(1)
        self.led_green.off()

    def failure(self, msg: str = None) -> None:
        if not self._initialized: return
        self.led_green.off()
        self.led_red.on()
        self._beep(0.2, 2)
        if msg:
            self.display_message(msg[:16])
        time.sleep(1)
        self.led_red.off()

    def info(self, msg: str = None) -> None:
        if not self._initialized: return
        self.led_green.off()
        self.led_red.off()
        if msg:
            self.display_message(msg[:16])

    def display_message(self, line1: str, line2: str = "") -> None:
        if not self._initialized or not self.lcd: return
        try:
            self.lcd.clear()
            self.lcd.cursor_pos = (0, 0)
            self.lcd.write_string(line1[:16])
            if line2:
                self.lcd.cursor_pos = (1, 0)
                self.lcd.write_string(line2[:16])
        except Exception as e:
            logger.error(f"LCD error: {e}")


def get_feedback() -> HardwareFeedback:
    if settings.PROFILE == "pi3":
        fb = GPIOFeedback()
        if fb.init():
            return fb
    return NoopFeedback()