from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.database import get_db
from app.models import (
    Settings as SettingsModel,
    User,
    Student,
    Attendance,
    FaceEmbedding,
    NotificationLog,
    AuditLog
)
from app.schemas import SettingBase, SettingCreate, SettingUpdate, SettingInDB
from app.deps import get_current_active_user
from app.config import settings
from app.services.face_engine import get_engine
from app.services.supabase_service import supabase_service
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/all")
@router.get("/")
async def get_all_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """Retrieve full application settings dictionary."""
    db_settings = {s.key: s.value for s in db.query(SettingsModel).all()}

    return {
        "morning_session_start": db_settings.get("morning_session_start", settings.MORNING_SESSION_START),
        "morning_session_end": db_settings.get("morning_session_end", settings.MORNING_SESSION_END),
        "afternoon_session_start": db_settings.get("afternoon_session_start", settings.AFTERNOON_SESSION_START),
        "afternoon_session_end": db_settings.get("afternoon_session_end", settings.AFTERNOON_SESSION_END),
        "recognition_threshold": float(db_settings.get("recognition_threshold", settings.RECOGNITION_THRESHOLD or 0.45)),
        "liveness_check": db_settings.get("liveness_check", str(settings.LIVENESS_CHECK)).lower() in ("true", "1"),
        "stream_fps": int(db_settings.get("stream_fps", settings.STREAM_FPS or 5)),
        "frame_width": int(db_settings.get("frame_width", settings.FRAME_WIDTH or 640)),
        "lcd_mode": db_settings.get("lcd_mode", settings.LCD_MODE),
        "teacher_email": db_settings.get("teacher_email", ""),
        "notifier_type": db_settings.get("notifier_type", "smtp"),
        "whatsapp_token": db_settings.get("whatsapp_token", ""),
        "whatsapp_phone_number_id": db_settings.get("whatsapp_phone_number_id", ""),
        "fast2sms_api_key": db_settings.get("fast2sms_api_key", ""),
        "smtp_server": db_settings.get("smtp_server", ""),
        "smtp_port": int(db_settings.get("smtp_port", 587)),
        "smtp_username": db_settings.get("smtp_username", ""),
        "smtp_password": db_settings.get("smtp_password", ""),
        "smtp_tls": db_settings.get("smtp_tls", "true").lower() in ("true", "1"),
        "auto_report_enabled": db_settings.get("auto_report_enabled", str(settings.AUTO_REPORT_ENABLED)).lower() in ("true", "1"),
        "auto_report_time": db_settings.get("auto_report_time", settings.AUTO_REPORT_TIME),
        "auto_report_recipients": db_settings.get("auto_report_recipients", settings.AUTO_REPORT_RECIPIENTS),
        # Supabase Cloud Sync settings
        "supabase_enabled": db_settings.get("supabase_enabled", str(settings.SUPABASE_ENABLED)).lower() in ("true", "1"),
        "supabase_url": db_settings.get("supabase_url", settings.SUPABASE_URL or ""),
        "supabase_key": db_settings.get("supabase_key", settings.SUPABASE_KEY or ""),
        "supabase_sync_auto": db_settings.get("supabase_sync_auto", str(settings.SUPABASE_SYNC_AUTO)).lower() in ("true", "1")
    }


@router.post("/all")
@router.put("/all")
async def save_all_settings(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Save full application settings to database and update runtime."""
    for key, val in payload.items():
        str_val = str(val) if val is not None else ""
        row = db.query(SettingsModel).filter(SettingsModel.key == key).first()
        if row:
            row.value = str_val
        else:
            db.add(SettingsModel(key=key, value=str_val))

    db.commit()

    # Update runtime settings
    if "recognition_threshold" in payload:
        try:
            settings.RECOGNITION_THRESHOLD = float(payload["recognition_threshold"])
            engine = get_engine()
            engine.threshold = settings.RECOGNITION_THRESHOLD
        except Exception:
            pass

    if "supabase_url" in payload:
        settings.SUPABASE_URL = str(payload["supabase_url"])
    if "supabase_key" in payload:
        settings.SUPABASE_KEY = str(payload["supabase_key"])
    if "supabase_enabled" in payload:
        settings.SUPABASE_ENABLED = bool(payload["supabase_enabled"])
        supabase_service.url = settings.SUPABASE_URL
        supabase_service.key = settings.SUPABASE_KEY
        supabase_service.enabled = settings.SUPABASE_ENABLED

    return {"success": True, "message": "Settings saved and applied successfully."}


@router.post("/clean-demo-data")
async def clean_demo_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Wipes all demo/mock attendance records, students, and face embeddings.
    Retains admin ('admin') and teacher ('teacher') accounts, hardware settings, and edge devices.
    Leaves the system 100% clean and ready for real production usage.
    """
    try:
        att_deleted = db.query(Attendance).delete()
        emb_deleted = db.query(FaceEmbedding).delete()
        stu_deleted = db.query(Student).delete()
        db.query(NotificationLog).delete()
        db.query(AuditLog).delete()
        db.commit()

        # Reload empty face engine cache
        try:
            engine = get_engine()
            engine.load_embeddings_from_db(db)
        except Exception:
            pass

        return {
            "success": True,
            "message": f"Demo data successfully cleared! Deleted {stu_deleted} students, {att_deleted} attendance logs, and {emb_deleted} biometric embeddings. Ready for production enrollment.",
            "deleted_students": stu_deleted,
            "deleted_attendance": att_deleted,
            "deleted_embeddings": emb_deleted
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to clear demo data: {str(e)}")


@router.post("/supabase/test")
async def test_supabase(
    payload: Optional[Dict[str, Any]] = Body(None),
    current_user: User = Depends(get_current_active_user)
):
    """Test connectivity to Supabase Cloud."""
    if payload:
        url = payload.get("supabase_url") or settings.SUPABASE_URL
        key = payload.get("supabase_key") or settings.SUPABASE_KEY
        if url:
            supabase_service.url = url.rstrip("/")
        if key:
            supabase_service.key = key

    res = supabase_service.test_connection()
    return res


@router.post("/supabase/sync")
async def sync_supabase(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Trigger full sync of local database to Supabase."""
    res = supabase_service.sync_all_from_local(db)
    return res