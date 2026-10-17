import pytest
from app.config import Settings


def test_laptop_profile_defaults():
    s = Settings(PROFILE="laptop")
    assert s.PROFILE == "laptop"
    assert s.FACE_ENGINE == "insightface"
    assert s.STREAM_FPS == 5
    assert s.FRAME_WIDTH == 640
    assert s.DETECT_EVERY_N_FRAMES == 1
    assert s.MAX_FACES == 5
    assert s.RECOGNITION_THRESHOLD == 0.45


def test_pi3_profile_defaults():
    s = Settings(PROFILE="pi3")
    assert s.PROFILE == "pi3"
    assert s.FACE_ENGINE == "opencv_sface"
    assert s.STREAM_FPS == 2
    assert s.FRAME_WIDTH == 320
    assert s.DETECT_EVERY_N_FRAMES == 3
    assert s.MAX_FACES == 1
    assert s.RECOGNITION_THRESHOLD == 0.363


def test_custom_override_profile_defaults():
    s = Settings(PROFILE="pi3", STREAM_FPS=4, RECOGNITION_THRESHOLD=0.40)
    assert s.PROFILE == "pi3"
    assert s.STREAM_FPS == 4
    assert s.RECOGNITION_THRESHOLD == 0.40
    assert s.FRAME_WIDTH == 320  # Kept default for pi3
