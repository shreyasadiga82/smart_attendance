"""Trigger service for controlling attendance scanning modes (continuous, motion, button)."""
import time
import numpy as np
import cv2
from typing import Literal, Optional, Tuple

TriggerMode = Literal["continuous", "motion", "button"]


class TriggerService:
    def __init__(self, mode: TriggerMode = "continuous", motion_threshold: float = 25.0, cooldown_seconds: float = 2.0):
        self.mode = mode
        self.motion_threshold = motion_threshold
        self.cooldown_seconds = cooldown_seconds
        self._last_frame_gray: Optional[np.ndarray] = None
        self._button_pressed: bool = False
        self._last_trigger_time: float = 0.0

    def set_mode(self, mode: TriggerMode):
        self.mode = mode
        self._last_frame_gray = None
        self._button_pressed = False

    def press_button(self):
        """Simulate or receive a hardware GPIO button trigger event."""
        self._button_pressed = True

    def reset_button(self):
        self._button_pressed = False

    def should_process_frame(self, frame_bgr: Optional[np.ndarray] = None) -> Tuple[bool, str]:
        """
        Determines whether the current frame should trigger facial recognition based on the active mode.
        Returns: (should_process, reason)
        """
        now = time.time()

        if self.mode == "continuous":
            return True, "continuous_mode"

        if self.mode == "button":
            if self._button_pressed:
                self._button_pressed = False
                self._last_trigger_time = now
                return True, "button_trigger"
            return False, "waiting_for_button"

        if self.mode == "motion":
            if frame_bgr is None:
                return False, "no_frame"

            # Enforce cooldown between triggers
            if now - self._last_trigger_time < self.cooldown_seconds:
                return False, "motion_cooldown"

            # Downsample and convert to grayscale for motion estimation
            small = cv2.resize(frame_bgr, (160, 120))
            gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
            gray = cv2.GaussianBlur(gray, (21, 21), 0)

            if self._last_frame_gray is None:
                self._last_frame_gray = gray
                return False, "initial_frame"

            frame_diff = cv2.absdiff(self._last_frame_gray, gray)
            self._last_frame_gray = gray

            mean_diff = float(np.mean(frame_diff))
            if mean_diff >= self.motion_threshold:
                self._last_trigger_time = now
                return True, f"motion_detected (diff={mean_diff:.1f})"

            return False, f"no_motion (diff={mean_diff:.1f})"

        return True, "default"
