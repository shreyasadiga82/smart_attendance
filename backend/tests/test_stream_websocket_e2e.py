import pytest
import cv2
import numpy as np
import base64
import json
from unittest.mock import MagicMock, AsyncMock
from fastapi import WebSocketDisconnect
from app.routers.stream import websocket_recognition_endpoint
from app.services.recognition_engine import get_smart_engine


@pytest.mark.asyncio
async def test_websocket_stream_e2e_recognition():
    """
    End-to-End WebSocket stream test:
    Simulates WebSocket receiving streaming frames with textured human eyes,
    verifying Eye Sensor liveness verification and automatic attendance marking.
    """
    smart_engine = get_smart_engine()

    # Create synthetic frame with high-contrast eye details
    frame = np.ones((480, 640, 3), dtype=np.uint8) * 180
    # Draw left pupil & iris
    cv2.circle(frame, (160, 180), 8, (20, 20, 20), -1)
    cv2.circle(frame, (160, 180), 14, (70, 70, 70), 2)
    # Draw right pupil & iris
    cv2.circle(frame, (240, 180), 8, (20, 20, 20), -1)
    cv2.circle(frame, (240, 180), 14, (70, 70, 70), 2)

    _, buffer = cv2.imencode('.jpg', frame)
    frame_base64 = base64.b64encode(buffer).decode('utf-8')

    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.all.return_value = []
    mock_db.query.return_value.filter.return_value.count.return_value = 0
    mock_db.query.return_value.filter.return_value.first.return_value = None

    # Pre-populate student cache
    smart_engine._student_cache[1] = ("SHREYAS ADIGA", "1")
    smart_engine.face_engine.embeddings = {1: [np.ones(512, dtype=np.float32)]}

    # Mock face_engine inside smart_engine
    mock_68 = np.zeros((68, 2), dtype=np.float32)
    mock_68[36] = [145.0, 180.0]; mock_68[39] = [175.0, 180.0]
    mock_68[37] = [152.0, 175.0]; mock_68[41] = [152.0, 185.0]
    mock_68[38] = [168.0, 175.0]; mock_68[40] = [168.0, 185.0]
    mock_68[42] = [225.0, 180.0]; mock_68[45] = [255.0, 180.0]
    mock_68[43] = [232.0, 175.0]; mock_68[47] = [232.0, 185.0]
    mock_68[44] = [248.0, 175.0]; mock_68[46] = [248.0, 185.0]

    smart_engine.face_engine.detect_faces = MagicMock(return_value=[{
        "bbox": [100, 100, 300, 320],
        "landmarks": mock_68,
        "embedding": np.ones(512, dtype=np.float32),
        "image": np.zeros((100, 100, 3), dtype=np.uint8)
    }])
    smart_engine.face_engine.match_embedding = MagicMock(return_value=(1, 0.91))

    # Mock WebSocket connection receiving 2 stream frames
    sent_messages = []
    mock_ws = AsyncMock()
    mock_ws.accept = AsyncMock()
    mock_ws.send_text = AsyncMock(side_effect=lambda msg: sent_messages.append(msg))
    mock_ws.receive_text = AsyncMock(side_effect=[
        json.dumps({"type": "frame", "data": frame_base64, "timestamp": 1234567890}),
        json.dumps({"type": "frame", "data": frame_base64, "timestamp": 1234567891}),
        WebSocketDisconnect()
    ])

    # Run the endpoint
    await websocket_recognition_endpoint(websocket=mock_ws, token=None, db=mock_db)

    # Verify messages sent (2 frames processed)
    assert len(sent_messages) == 2
    response1 = json.loads(sent_messages[0])
    response2 = json.loads(sent_messages[1])

    assert response2["type"] == "recognition_results"
    assert len(response2["results"]) == 1

    res = response2["results"][0]
    assert res["student_id"] == 1
    assert res["student_name"] == "SHREYAS ADIGA"
    assert res["roll_no"] == "1"
    assert res["confidence"] == 0.91
    assert res["status"] in ("marked", "already_marked")

    # Verify Eye Sensor payload
    eye_sensor = res["eye_sensor"]
    assert eye_sensor["eyes_detected"] is True
    assert eye_sensor["eye_state"] in ("open", "blink")
    assert eye_sensor["eye_openness"] > 0.20
    assert eye_sensor["liveness_verified"] is True
    assert len(eye_sensor["left_eye"]) == 2
    assert len(eye_sensor["right_eye"]) == 2
