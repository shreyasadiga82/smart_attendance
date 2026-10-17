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


@router.websocket("/recognition")
@router.websocket("/ws/recognition")
async def websocket_recognition_endpoint(
    websocket: WebSocket,
    token: str = None,
    db: Session = Depends(get_db_ws)
):
    await manager.connect(websocket)
    face_engine = get_engine()
    
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
                    img_data = base64.b64decode(message["data"])
                    nparr = np.frombuffer(img_data, np.uint8)
                    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                    faces = face_engine.detect_faces(frame)
                    results = []

                    for face in faces:
                        embedding = face_engine.get_embedding(face["image"])
                        if embedding is None:
                            continue

                        # Check liveness
                        liveness_ok = True
                        if settings.LIVENESS_CHECK:
                            # Use track_id or random uuid if not tracked yet
                            face_id = str(uuid.uuid4())
                            liveness_ok = liveness_checker.check_liveness(
                                face_id=face_id,
                                frame=frame,
                                bbox=face["bbox"],
                                landmarks=face["landmarks"]
                            )

                        student_id, confidence = face_engine.match_embedding(embedding)

                        status = "unknown"
                        student_name = None
                        roll_no = None

                        if student_id is not None and confidence >= settings.RECOGNITION_THRESHOLD and liveness_ok:
                            student = db.query(Student).filter(Student.id == student_id).first()
                            if student:
                                student_name = student.name
                                roll_no = student.roll_no
                                status = "recognized"

                                today = date.today()
                                session_service = __import__('app.services.session_service', fromlist=['SessionService']).SessionService()
                                current_session = session_service.get_current_session()
                                if current_session:
                                    attendance_service = AttendanceService(db)
                                    already_marked = attendance_service.check_already_marked(
                                        student_id=student_id,
                                        date=today,
                                        session=current_session
                                    )
                                    if already_marked:
                                        status = "already_marked"
                                    else:
                                        attendance_service.mark_attendance(
                                            student_id=student_id,
                                            date=today,
                                            session=current_session,
                                            method="auto",
                                            note=f"Recognized with confidence {confidence:.2f}"
                                        )
                                        status = "marked"
                        else:
                            status = "unknown"

                        results.append({
                            "bbox": face["bbox"],
                            "confidence": float(confidence) if student_id is not None else 0.0,
                            "student_id": student_id,
                            "student_name": student_name,
                            "roll_no": roll_no,
                            "status": status
                        })

                    response = {
                        "type": "recognition_results",
                        "results": results,
                        "timestamp": message.get("timestamp")
                    }
                    await manager.send_personal_message(json.dumps(response), websocket)
                    
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
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)