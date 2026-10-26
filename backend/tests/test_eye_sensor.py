import pytest
import numpy as np
import cv2
from app.services.eye_sensor import EyeSensor, EyeMetrics


def test_eye_aspect_ratio_computation():
    """Verify Soukupová & Čech EAR calculation for open vs closed eyes."""
    sensor = EyeSensor()

    # Synthetic open eye points (p1..p6)
    # p1: (0, 0), p2: (5, 5), p3: (15, 5), p4: (20, 0), p5: (15, -5), p6: (5, -5)
    open_eye_pts = np.array([
        [0.0, 0.0],
        [5.0, 5.0],
        [15.0, 5.0],
        [20.0, 0.0],
        [15.0, -5.0],
        [5.0, -5.0]
    ], dtype=np.float32)

    ear_open = sensor._compute_ear_6pts(open_eye_pts)
    # v1 = ||(5, 5) - (5, -5)|| = 10, v2 = ||(15, 5) - (15, -5)|| = 10
    # h = ||(0,0) - (20,0)|| = 20 -> EAR = (10 + 10) / (2 * 20) = 0.50
    assert ear_open > 0.30

    # Synthetic closed eye points (vertical distances near 0)
    closed_eye_pts = np.array([
        [0.0, 0.0],
        [5.0, 0.8],
        [15.0, 0.8],
        [20.0, 0.0],
        [15.0, -0.8],
        [5.0, -0.8]
    ], dtype=np.float32)

    ear_closed = sensor._compute_ear_6pts(closed_eye_pts)
    assert ear_closed < 0.12


def test_eye_sensor_with_68_landmarks():
    """Verify analyze_eyes parses 68-point landmarks correctly."""
    sensor = EyeSensor()

    frame = np.ones((480, 640, 3), dtype=np.uint8) * 128
    bbox = [100, 100, 300, 350]

    # Generate 68 mock landmarks
    mock_68 = np.zeros((68, 2), dtype=np.float32)
    # Left eye points 36..41 (around center (160, 180))
    mock_68[36] = [145.0, 180.0]
    mock_68[37] = [152.0, 175.0]
    mock_68[38] = [168.0, 175.0]
    mock_68[39] = [175.0, 180.0]
    mock_68[40] = [168.0, 185.0]
    mock_68[41] = [152.0, 185.0]

    # Right eye points 42..47 (around center (240, 180))
    mock_68[42] = [225.0, 180.0]
    mock_68[43] = [232.0, 175.0]
    mock_68[44] = [248.0, 175.0]
    mock_68[45] = [255.0, 180.0]
    mock_68[46] = [248.0, 185.0]
    mock_68[47] = [232.0, 185.0]

    metrics = sensor.analyze_eyes(frame, bbox, landmarks=mock_68)

    assert metrics.eyes_detected is True
    assert metrics.eye_state in ("open", "blink")
    assert pytest.approx(metrics.left_eye_center[0], abs=5) == 160.0
    assert pytest.approx(metrics.right_eye_center[0], abs=5) == 240.0
    assert metrics.eye_tilt_deg < 5.0


def test_eye_tilt_detection():
    """Verify severe head tilt is detected and flagged."""
    sensor = EyeSensor()
    frame = np.ones((480, 640, 3), dtype=np.uint8) * 128
    bbox = [100, 100, 300, 350]

    # Left eye at (150, 150), Right eye heavily tilted at (230, 240) -> ~48 deg tilt
    mock_68 = np.zeros((68, 2), dtype=np.float32)
    mock_68[36:42] = [150.0, 150.0]
    mock_68[36] = [140.0, 150.0]; mock_68[39] = [160.0, 150.0]
    mock_68[37] = [150.0, 145.0]; mock_68[41] = [150.0, 155.0]
    mock_68[38] = [155.0, 145.0]; mock_68[40] = [155.0, 155.0]

    mock_68[42:48] = [230.0, 240.0]
    mock_68[42] = [220.0, 240.0]; mock_68[45] = [240.0, 240.0]
    mock_68[43] = [230.0, 235.0]; mock_68[47] = [230.0, 245.0]
    mock_68[44] = [235.0, 235.0]; mock_68[46] = [235.0, 245.0]

    metrics = sensor.analyze_eyes(frame, bbox, landmarks=mock_68)
    assert metrics.eye_tilt_deg > 35.0
    assert "tilt" in metrics.status_message.lower()


def test_temporal_liveness_verification():
    """Verify temporal tracking detects live open eyes and rejects closed eyes."""
    sensor = EyeSensor()

    track_id = "track_1"

    # Frame 1: Open eyes
    open_metric = EyeMetrics(
        eyes_detected=True,
        left_eye_center=[160.0, 180.0],
        right_eye_center=[240.0, 180.0],
        avg_openness=0.28,
        eye_state="open",
        eye_tilt_deg=2.0,
        sharpness=35.0
    )

    is_live, msg = sensor.verify_temporal_liveness(track_id, open_metric)
    assert is_live is True

    # Frame 2 with slight natural micro-movement
    open_metric2 = EyeMetrics(
        eyes_detected=True,
        left_eye_center=[160.8, 180.2],
        right_eye_center=[240.7, 180.1],
        avg_openness=0.29,
        eye_state="open",
        eye_tilt_deg=2.1,
        sharpness=36.0
    )

    is_live2, msg2 = sensor.verify_temporal_liveness(track_id, open_metric2)
    assert is_live2 is True
    assert "open" in msg2.lower() or "active" in msg2.lower()

    # Closed eyes must be rejected
    closed_metric = EyeMetrics(
        eyes_detected=True,
        left_eye_center=[160.8, 180.2],
        right_eye_center=[240.7, 180.1],
        avg_openness=0.08,
        eye_state="closed",
        eye_tilt_deg=2.1,
        sharpness=36.0
    )
    is_live_closed, msg_closed = sensor.verify_temporal_liveness(track_id, closed_metric)
    assert is_live_closed is False
    assert "closed" in msg_closed.lower()
