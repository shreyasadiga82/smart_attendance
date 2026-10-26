import pytest
import numpy as np
import time
from datetime import date
from unittest.mock import MagicMock
from app.services.tracker import SpatialFaceTracker, compute_iou
from app.services.recognition_engine import SmartAttendanceEngine
from app.models import Student, Attendance


def test_spatial_tracker_iou_matching():
    """Verify that consecutive frames with overlapping bounding boxes preserve track_id."""
    tracker = SpatialFaceTracker(max_stale_seconds=2.0, iou_threshold=0.25)

    # Frame 1: Face at [100, 100, 200, 220]
    res1 = tracker.update([[100, 100, 200, 220]])
    assert len(res1) == 1
    track_id1, bbox1, trk1 = res1[0]
    assert track_id1 == 1

    # Frame 2: Slight movement to [104, 102, 204, 222] (high IoU)
    res2 = tracker.update([[104, 102, 204, 222]])
    assert len(res2) == 1
    track_id2, bbox2, trk2 = res2[0]
    assert track_id2 == track_id1  # Must keep identical track_id!

    # Frame 3: A second face appears at completely different location [400, 200, 500, 320]
    res3 = tracker.update([[105, 103, 205, 223], [400, 200, 500, 320]])
    assert len(res3) == 2
    ids = [r[0] for r in res3]
    assert track_id1 in ids
    assert 2 in ids  # New track assigned


def test_smart_attendance_engine_marking_flow():
    """Verify that SmartAttendanceEngine marks attendance for enrolled student with open eyes."""
    mock_face_engine = MagicMock()
    mock_face_engine.embeddings = {1: [np.ones(512, dtype=np.float32)]}
    mock_face_engine.threshold = 0.45

    # Mock detection of 1 face with 68 landmarks (open eyes)
    mock_68 = np.zeros((68, 2), dtype=np.float32)
    # Open left eye
    mock_68[36] = [145.0, 180.0]; mock_68[39] = [175.0, 180.0]
    mock_68[37] = [152.0, 175.0]; mock_68[41] = [152.0, 185.0]
    mock_68[38] = [168.0, 175.0]; mock_68[40] = [168.0, 185.0]
    # Open right eye
    mock_68[42] = [225.0, 180.0]; mock_68[45] = [255.0, 180.0]
    mock_68[43] = [232.0, 175.0]; mock_68[47] = [232.0, 185.0]
    mock_68[44] = [248.0, 175.0]; mock_68[46] = [248.0, 185.0]

    mock_face_engine.detect_faces.return_value = [{
        "bbox": [100, 100, 300, 320],
        "landmarks": mock_68,
        "embedding": np.ones(512, dtype=np.float32),
        "image": np.zeros((100, 100, 3), dtype=np.uint8)
    }]
    mock_face_engine.match_embedding.return_value = (1, 0.88)

    engine = SmartAttendanceEngine(face_engine=mock_face_engine)

    # Mock DB
    mock_db = MagicMock()
    mock_student = Student(id=1, name="SHREYAS ADIGA", roll_no="1")
    mock_db.query.return_value.filter.return_value.first.return_value = None  # No existing attendance

    frame = np.ones((480, 640, 3), dtype=np.uint8) * 128

    # Process frame
    results = engine.process_frame(frame, db=mock_db, enforce_liveness=False)

    assert len(results) == 1
    res = results[0]
    assert res["student_id"] == 1
    assert res["confidence"] == 0.88
    assert res["status"] == "marked"
    assert res["eye_sensor"]["eyes_detected"] is True
    assert res["eye_sensor"]["eye_state"] in ("open", "blink")

    # DB attendance add & commit called
    assert mock_db.add.called
    assert mock_db.commit.called


def test_smart_attendance_engine_rejects_closed_eyes():
    """Verify that when eyes are closed, attendance is NOT marked."""
    mock_face_engine = MagicMock()
    mock_face_engine.embeddings = {1: [np.ones(512, dtype=np.float32)]}
    mock_face_engine.threshold = 0.45

    # Mock detection of face with CLOSED eyes (vertical distance near 0)
    mock_68 = np.zeros((68, 2), dtype=np.float32)
    mock_68[36] = [145.0, 180.0]; mock_68[39] = [175.0, 180.0]
    mock_68[37] = [152.0, 180.2]; mock_68[41] = [152.0, 179.8]
    mock_68[38] = [168.0, 180.2]; mock_68[40] = [168.0, 179.8]

    mock_68[42] = [225.0, 180.0]; mock_68[45] = [255.0, 180.0]
    mock_68[43] = [232.0, 180.2]; mock_68[47] = [232.0, 179.8]
    mock_68[44] = [248.0, 180.2]; mock_68[46] = [248.0, 179.8]

    mock_face_engine.detect_faces.return_value = [{
        "bbox": [100, 100, 300, 320],
        "landmarks": mock_68,
        "embedding": np.ones(512, dtype=np.float32),
        "image": np.zeros((100, 100, 3), dtype=np.uint8)
    }]
    mock_face_engine.match_embedding.return_value = (1, 0.88)

    engine = SmartAttendanceEngine(face_engine=mock_face_engine)
    mock_db = MagicMock()

    frame = np.ones((480, 640, 3), dtype=np.uint8) * 128
    results = engine.process_frame(frame, db=mock_db, enforce_liveness=True)

    assert len(results) == 1
    res = results[0]
    assert res["status"] in ("eyes_closed", "verifying_eyes")
    # Must NOT have marked attendance!
    assert not mock_db.add.called
