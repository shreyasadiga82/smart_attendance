import pytest
import numpy as np
from app.services.trigger_service import TriggerService
from app.services.hardware.feedback import HardwareFeedbackFactory, NoopFeedback, HardwareFeedback


def test_trigger_service_continuous_mode():
    trigger = TriggerService(mode="continuous")
    should_proc, reason = trigger.should_process_frame()
    assert should_proc is True
    assert reason == "continuous_mode"


def test_trigger_service_button_mode():
    trigger = TriggerService(mode="button")

    # Before pressing button
    should_proc, reason = trigger.should_process_frame()
    assert should_proc is False
    assert reason == "waiting_for_button"

    # Press button
    trigger.press_button()
    should_proc, reason = trigger.should_process_frame()
    assert should_proc is True
    assert reason == "button_trigger"

    # Resets after processing
    should_proc_next, _ = trigger.should_process_frame()
    assert should_proc_next is False


def test_trigger_service_motion_mode():
    trigger = TriggerService(mode="motion", motion_threshold=10.0, cooldown_seconds=0.1)

    frame1 = np.zeros((120, 160, 3), dtype=np.uint8)
    frame2 = np.ones((120, 160, 3), dtype=np.uint8) * 255  # Dramatic motion change

    # First frame stores background
    proc1, reason1 = trigger.should_process_frame(frame1)
    assert proc1 is False
    assert reason1 == "initial_frame"

    # Second frame has large difference
    proc2, reason2 = trigger.should_process_frame(frame2)
    assert proc2 is True
    assert "motion_detected" in reason2


def test_noop_hardware_feedback_fallback():
    # Factory on non-Pi or by default returns NoopFeedback safely
    feedback = HardwareFeedbackFactory.create_feedback()
    assert isinstance(feedback, (NoopFeedback, HardwareFeedback))

    # All feedback methods execute cleanly without throwing hardware/GPIO errors
    feedback.success("John Doe")
    feedback.already_marked("John Doe")
    feedback.unknown()
    feedback.cleanup()
