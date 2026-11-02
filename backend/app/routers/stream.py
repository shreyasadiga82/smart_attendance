from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Student, EdgeDevice
from app.services.face_engine import get_engine
from app.services.attendance_service import AttendanceService
from app.services.liveness import LivenessChecker
from app.config import settings
import json
import base64
import cv2
import numpy as np
from datetime import date
from datetime import datetime
import asyncio
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter()

liveness_checker = LivenessChecker()

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

# Dependency to get DB session for WebSocket
async def get_db_ws():
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


from app.services.recognition_engine import get_smart_engine

smart_attendance_engine = get_smart_engine()


@router.websocket("/recognition")
@router.websocket("/ws/recognition")
async def websocket_recognition_endpoint(
    websocket: WebSocket,
    token: str = None,
    db: Session = Depends(get_db_ws)
):
    await manager.connect(websocket)
    
    # Authenticate edge device if token provided
    edge_device = None
    if token:
        edge_device = db.query(EdgeDevice).filter(EdgeDevice.token == token).first()
        if edge_device:
            logger.info(f"Edge device connected: {edge_device.name}")
            edge_device.last_seen = datetime.utcnow()
            db.commit()
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                
                # Heartbeat for Edge device
                if message.get("type") == "heartbeat" and edge_device:
                    edge_device.last_seen = datetime.utcnow()
                    db.commit()
                    continue
                    
                if message.get("type") == "frame":
                    frame_data = message.get("data", "")
                    img_data = base64.b64decode(frame_data)
                    nparr = np.frombuffer(img_data, np.uint8)
                    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                    results = []
                    frame_w = 640
                    frame_h = 480
                    if frame is not None and frame.size > 0:
                        frame_h, frame_w = frame.shape[:2]
                        # Execute full recognition, eye sensor analysis, and attendance marking
                        results = smart_attendance_engine.process_frame(frame, db=db)
                        logger.info(f"Stream: frame {frame_w}x{frame_h} -> {len(results)} faces: {[r.get('status') for r in results]}")
                    else:
                        logger.warning("Stream: decoded frame is None or empty")

                    response = {
                        "type": "recognition_results",
                        "results": results,
                        "frame_width": int(frame_w),
                        "frame_height": int(frame_h),
                        "timestamp": message.get("timestamp")
                    }

                    def _safe_serialize(obj):
                        if isinstance(obj, (np.floating, np.integer)):
                            return float(obj) if isinstance(obj, np.floating) else int(obj)
                        if isinstance(obj, np.ndarray):
                            return obj.tolist()
                        return str(obj)

                    await manager.send_personal_message(json.dumps(response, default=_safe_serialize), websocket)
                    
                    if edge_device:
                        edge_device.last_seen = datetime.utcnow()
                        db.commit()

            except Exception as e:
                logger.error(f"Error processing frame: {e}")
                await manager.send_personal_message(
                    json.dumps({"type": "error", "message": str(e)}),
                    websocket
                )

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.debug(f"WebSocket error: {e}")
        manager.disconnect(websocket)