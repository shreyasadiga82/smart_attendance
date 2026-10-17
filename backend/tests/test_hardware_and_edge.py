import os
import sys
import ssl
import pytest
from unittest.mock import MagicMock, patch

from app.config import Settings
from app.services.hardware.feedback import (
    HardwareFeedbackFactory,
    NoopFeedback,
    HardwareFeedback,
    GPIOFeedback,
    truncate_lcd_text,
)

# Import edge client helpers
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "edge")))
from pi_client import build_ssl_context, EdgeFeedback


def test_pin_config_loading_defaults():
    """Verify default GPIO pin and LCD configuration."""
    s = Settings()
    assert s.LCD_MODE == "parallel"
    assert s.LCD_RS_PIN == 25
    assert s.LCD_E_PIN == 24
    assert s.LCD_D4_PIN == 5
    assert s.LCD_D5_PIN == 6
    assert s.LCD_D6_PIN == 13
    assert s.LCD_D7_PIN == 19
    assert s.LCD_I2C_ADDR == 39  # 0x27
    assert s.PIN_LED_GREEN == 17
    assert s.PIN_LED_RED == 27
    assert s.PIN_BUZZER == 22
    assert s.PIN_BUTTON == 23


def test_custom_pin_config_overrides():
    """Verify custom pin overrides."""
    s = Settings(
        LCD_MODE="i2c",
        LCD_I2C_ADDR=0x3F,
        PIN_LED_GREEN=18,
        PIN_LED_RED=23,
        PIN_BUZZER=24,
        PIN_BUTTON=25,
        LCD_RS_PIN=26
    )
    assert s.LCD_MODE == "i2c"
    assert s.LCD_I2C_ADDR == 0x3F
    assert s.PIN_LED_GREEN == 18
    assert s.PIN_LED_RED == 23
    assert s.PIN_BUZZER == 24
    assert s.PIN_BUTTON == 25
    assert s.LCD_RS_PIN == 26


def test_text_truncation():
    """Verify text is strictly truncated to 16 characters for 1602 LCD."""
    assert truncate_lcd_text("Short") == "Short"
    assert truncate_lcd_text("Exactly16Chars!!") == "Exactly16Chars!!"
    assert len(truncate_lcd_text("Exactly16Chars!!")) == 16
    assert truncate_lcd_text("Alexander Bartholomew Montgomery") == "Alexander Bartho"
    assert len(truncate_lcd_text("Alexander Bartholomew Montgomery")) == 16
    assert truncate_lcd_text(None) == ""


def test_noop_fallback_without_gpio():
    """Verify that when GPIO is not available, NoopFeedback is returned and safe."""
    noop = NoopFeedback()
    noop.display_idle()
    noop.display_message("Hello", "World")
    noop.success("Alice")
    noop.already_marked("Bob")
    noop.unknown()
    noop.cleanup()


def test_lcd_mode_parallel_selection():
    """Verify that LCD_MODE=parallel creates RPLCD.gpio.CharLCD with BCM pins and pin_rw=None."""
    mock_rplcd_gpio = MagicMock()
    mock_gpio = MagicMock()
    mock_gpiozero = MagicMock()

    custom_settings = Settings(
        LCD_MODE="parallel",
        LCD_RS_PIN=25,
        LCD_E_PIN=24,
        LCD_D4_PIN=5,
        LCD_D5_PIN=6,
        LCD_D6_PIN=13,
        LCD_D7_PIN=19
    )

    with patch.dict("sys.modules", {
        "RPi": MagicMock(GPIO=mock_gpio),
        "RPi.GPIO": mock_gpio,
        "RPLCD": MagicMock(),
        "RPLCD.gpio": mock_rplcd_gpio,
        "gpiozero": mock_gpiozero
    }):
        feedback = GPIOFeedback(cfg=custom_settings)
        initialized = feedback.init()
        assert initialized is True
        # Verify CharLCD was called with parallel config
        mock_rplcd_gpio.CharLCD.assert_called_once()
        call_kwargs = mock_rplcd_gpio.CharLCD.call_args[1]
        assert call_kwargs["cols"] == 16
        assert call_kwargs["rows"] == 2
        assert call_kwargs["pin_rs"] == 25
        assert call_kwargs["pin_e"] == 24
        assert call_kwargs["pins_data"] == [5, 6, 13, 19]
        assert call_kwargs["pin_rw"] is None
        feedback.cleanup()


def test_lcd_mode_i2c_selection():
    """Verify that LCD_MODE=i2c creates RPLCD.i2c.CharLCD."""
    mock_rplcd_i2c = MagicMock()
    mock_gpiozero = MagicMock()

    custom_settings = Settings(
        LCD_MODE="i2c",
        LCD_I2C_ADDR=0x27
    )

    with patch.dict("sys.modules", {
        "RPLCD": MagicMock(),
        "RPLCD.i2c": mock_rplcd_i2c,
        "gpiozero": mock_gpiozero
    }):
        feedback = GPIOFeedback(cfg=custom_settings)
        initialized = feedback.init()
        assert initialized is True
        mock_rplcd_i2c.CharLCD.assert_called_once_with(
            i2c_expander='PCF8574',
            address=0x27,
            port=1,
            cols=16,
            rows=2,
            dotsize=8
        )
        feedback.cleanup()
        feedback.cleanup()


def test_edge_client_ssl_options(tmp_path):
    """Verify edge client SSL context creation for ws:// and wss://."""
    # 1. ws:// returns None (plain unencrypted connection)
    ctx_ws = build_ssl_context("ws://192.168.1.100:8000/ws/recognition")
    assert ctx_ws is None

    # 2. wss:// with EDGE_VERIFY_SSL=False returns unverified context
    ctx_no_verify = build_ssl_context("wss://192.168.1.100:8000/ws/recognition", verify_ssl=False)
    assert isinstance(ctx_no_verify, ssl.SSLContext)
    assert ctx_no_verify.check_hostname is False
    assert ctx_no_verify.verify_mode == ssl.CERT_NONE

    # 3. wss:// with default verify_ssl=True returns verified context
    ctx_verify = build_ssl_context("wss://192.168.1.100:8000/ws/recognition", verify_ssl=True)
    assert isinstance(ctx_verify, ssl.SSLContext)
    assert ctx_verify.verify_mode == ssl.CERT_REQUIRED

    # 4. wss:// with custom CA file
    dummy_ca = tmp_path / "test_ca.pem"
    dummy_ca.write_text("-----BEGIN CERTIFICATE-----\nFAKE\n-----END CERTIFICATE-----\n")
    with patch.object(ssl.SSLContext, "load_verify_locations") as mock_load:
        ctx_ca = build_ssl_context(
            "wss://192.168.1.100:8000/ws/recognition",
            verify_ssl=True,
            ca_file=str(dummy_ca)
        )
        assert isinstance(ctx_ca, ssl.SSLContext)
        assert mock_load.call_count == 1
        assert mock_load.call_args[0][0] == str(dummy_ca)


def test_edge_feedback_fallback():
    """Verify EdgeFeedback in edge client safely falls back when no hardware present."""
    efb = EdgeFeedback()
    efb.display_idle()
    efb.show("Test Line 1", "Test Line 2", auto_reset=False)
    efb.show_offline()
    efb.success()
    efb.failure()
    efb.beep(0.01, 1)
