"""
Dedicated Smart Attendance Face Recognition & Eye Sensor Engine.

Integrates:
- High-accuracy face detection and 512-d / 128-d biometric embedding extraction
- Multi-metric Eye Sensor (eye localization, EAR openness, bilateral symmetry, sharpness)
- Spatial Multi-Frame Face Tracking (persistent track_id across consecutive stream frames)
- Temporal eye liveness / blink verification (anti-spoofing against photos and screens)
- Automatic Attendance marking in database with duplicate and session management
"""

import cv2
import numpy as np
import time
from datetime import date, datetime
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
import logging

from app.config import settings
from app.services.face_engine import FaceEngine, get_engine
from app.services.eye_sensor import EyeSensor, EyeMetrics
from app.services.tracker import SpatialFaceTracker, TrackedFace
from app.services.attendance_service import AttendanceService
from app.services.session_service import SessionService
from app.models import Student, FaceEmbedding

logger = logging.getLogger(__name__)


class SmartAttendanceEngine:
    def __init__(self, face_engine: Optional[FaceEngine] = None):
        self.face_engine = face_engine or get_engine()
        self.eye_sensor = EyeSensor()
        self.tracker = SpatialFaceTracker(max_stale_seconds=2.5, iou_threshold=0.25)
        self.session_service = SessionService()
        self.threshold = settings.RECOGNITION_THRESHOLD or 0.45

        # In-memory student cache: student_id -> (name, roll_no)
        self._student_cache: Dict[int, Tuple[str, str]] = {}

    def refresh_embeddings(self, db: Session):
        """Reload all enrolled student embeddings from database."""
        if db is None:
            return
        try:
            self.face_engine.load_embeddings_from_db(db)
            students = db.query(Student).all()
            self._student_cache = {s.id: (s.name, s.roll_no) for s in students}
            logger.info(f"SmartAttendanceEngine refreshed with {len(self.face_engine.embeddings)} enrolled students")
        except Exception as e:
            logger.error(f"Failed to refresh embeddings in SmartAttendanceEngine: {e}")

    def get_student_info(self, student_id: int, db: Session) -> Tuple[Optional[str], Optional[str]]:
        """Retrieve student name and roll_no from cache or DB."""
        if student_id in self._student_cache:
            return self._student_cache[student_id]
        if db is not None:
            st = db.query(Student).filter(Student.id == student_id).first()
            if st:
                self._student_cache[student_id] = (st.name, st.roll_no)
                return (st.name, st.roll_no)
        return (None, None)

    def process_frame(
        self,
        frame: np.ndarray,
        db: Optional[Session] = None,
        enforce_liveness: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        """
        Full frame recognition pipeline:
        1. Detect faces
        2. Track across frames (persistent track_id)
        3. Analyze eye sensor metrics
        4. Match embedding against enrolled students
        5. Verify liveness & mark attendance
        """
        if frame is None or frame.size == 0:
            return []

        check_liveness = settings.LIVENESS_CHECK if enforce_liveness is None else enforce_liveness

        # Ensure embeddings are loaded if not yet populated
        if len(self.face_engine.embeddings) == 0 and db is not None:
            self.refresh_embeddings(db)

        # 1. Detect faces
        detected_faces = self.face_engine.detect_faces(frame)
        if not detected_faces:
            return []

        bboxes = [f["bbox"] for f in detected_faces]

        # 2. Update spatial tracker
        tracked_results = self.tracker.update(bboxes)

        results = []
        today = date.today()
        current_session = self.session_service.get_current_session()
        effective_session = current_session or "morning"

        attendance_service = AttendanceService(db) if db is not None else None

        for idx, (track_id, bbox, trk) in enumerate(tracked_results):
            face_info = detected_faces[idx] if idx < len(detected_faces) else None
            if not face_info:
                continue

            # 3. Eye Sensor Analysis
            landmarks = face_info.get("landmarks")
            eye_metrics = self.eye_sensor.analyze_eyes(
                frame=frame,
                bbox=bbox,
                landmarks=landmarks,
                face_obj=face_info.get("raw_face")
            )

            # 4. Multi-frame Temporal Eye Liveness
            is_live, liveness_msg = self.eye_sensor.verify_temporal_liveness(
                track_id=str(track_id),
                current_metrics=eye_metrics
            )
            eye_metrics.liveness_verified = is_live
            if not is_live and liveness_msg:
                eye_metrics.status_message = liveness_msg

            # 5. Extract / retrieve face embedding
            embedding = face_info.get("embedding")
            if embedding is None:
                embedding = self.face_engine.get_embedding(face_info.get("image"))

            student_id = None
            confidence = 0.0

            if embedding is not None:
                matched_id, score = self.face_engine.match_embedding(embedding)
                if matched_id is not None:
                    student_id = matched_id
                    confidence = float(score)

            # Update track info
            trk.student_id = student_id
            trk.confidence = confidence
            student_name, roll_no = (None, None)
            if student_id is not None:
                student_name, roll_no = self.get_student_info(student_id, db)
                trk.student_name = student_name
                trk.roll_no = roll_no

            # 6. Determine Recognition & Attendance Status
            status = "unknown"

            if student_id is not None and confidence >= self.threshold:
                # Face matches an enrolled student!
                # Check eye sensor requirements
                if not eye_metrics.eyes_detected:
                    status = "eyes_not_detected"
                elif eye_metrics.eye_state == "closed":
                    status = "eyes_closed"
                elif check_liveness and not is_live:
                    status = "verifying_eyes"
                else:
                    # Eye sensor passed and face matched!
                    status = "recognized"

                    if db is not None and attendance_service is not None:
                        # Check if already marked on this track or in DB
                        if trk.attendance_marked:
                            status = "marked"
                        elif trk.already_marked:
                            status = "already_marked"
                        else:
                            is_already_in_db = attendance_service.check_already_marked(
                                student_id=student_id,
                                target_date=today,
                                session=effective_session
                            )
                            if is_already_in_db:
                                status = "already_marked"
                                trk.already_marked = True
                            else:
                                # Mark attendance now!
                                try:
                                    note_str = (
                                        f"Face recognized {confidence * 100:.1f}%, "
                                        f"Eye sensor: {eye_metrics.eye_state} (EAR={eye_metrics.avg_openness:.2f}, sharp={eye_metrics.sharpness:.0f})"
                                    )
                                    attendance_service.mark_attendance(
                                        student_id=student_id,
                                        target_date=today,
                                        session=effective_session,
                                        method="auto",
                                        note=note_str,
                                        allow_fallback=True
                                    )
                                    status = "marked"
                                    trk.attendance_marked = True
                                    logger.info(f"Marked attendance for {student_name} ({roll_no}) [Track {track_id}]")
                                except ValueError as ve:
                                    # Already marked or cooldown
                                    if "already marked" in str(ve).lower():
                                        status = "already_marked"
                                        trk.already_marked = True
                                    else:
                                        status = "recognized"
                                except Exception as exc:
                                    logger.error(f"Error marking attendance for student {student_id}: {exc}")
                                    status = "recognized"
            else:
                status = "unknown"

            results.append({
                "bbox": bbox,
                "track_id": track_id,
                "confidence": round(confidence, 3),
                "student_id": student_id,
                "student_name": student_name,
                "roll_no": roll_no,
                "status": status,
                "eye_sensor": eye_metrics.to_dict()
            })

        return results


# Global singleton instance
_smart_engine_instance: Optional[SmartAttendanceEngine] = None

def get_smart_engine(face_engine: Optional[FaceEngine] = None) -> SmartAttendanceEngine:
    global _smart_engine_instance
    if _smart_engine_instance is None:
        _smart_engine_instance = SmartAttendanceEngine(face_engine)
    return _smart_engine_instance
