import logging
import json
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.config import settings

logger = logging.getLogger(__name__)


class SupabaseService:
    """
    Supabase Cloud Sync Service.
    Enables syncing student rosters, biometrics status, and real-time attendance logs
    to a Supabase PostgreSQL backend via Supabase REST (PostgREST) API or direct connection.
    Works offline: If Supabase is unreachable, local SQLite acts as the resilient primary store.
    """

    def __init__(self, url: Optional[str] = None, key: Optional[str] = None, enabled: Optional[bool] = None):
        self.url = (url if url is not None else settings.SUPABASE_URL or "").rstrip("/")
        self.key = key if key is not None else (settings.SUPABASE_KEY or "")
        if enabled is not None:
            self.enabled = bool(enabled and self.url and self.key)
        else:
            self.enabled = bool(settings.SUPABASE_ENABLED and self.url and self.key)

    def is_configured(self) -> bool:
        return bool(self.url and self.key)

    def _get_headers(self) -> Dict[str, str]:
        return {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation,resolution=merge-duplicates"
        }

    def test_connection(self) -> Dict[str, Any]:
        """Test whether Supabase endpoint and API key are reachable."""
        if not self.is_configured():
            return {
                "success": False,
                "message": "Supabase URL and API Key are not configured."
            }

        test_url = f"{self.url}/rest/v1/"
        try:
            req = urllib.request.Request(test_url, headers=self._get_headers(), method="GET")
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status in (200, 204):
                    return {
                        "success": True,
                        "message": "Successfully connected to Supabase Cloud API!",
                        "status_code": resp.status
                    }
                return {
                    "success": False,
                    "message": f"Supabase responded with HTTP {resp.status}"
                }
        except urllib.error.HTTPError as e:
            # PostgREST root might return 200 or 404 for schema root, check code
            if e.code in (200, 404):
                return {
                    "success": True,
                    "message": f"Supabase instance reached (HTTP {e.code})! Ready for sync.",
                    "status_code": e.code
                }
            return {
                "success": False,
                "message": f"Supabase authentication failed: HTTP {e.code} {e.reason}"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Connection error: {str(e)}"
            }

    def sync_student(self, student_dict: Dict[str, Any]) -> bool:
        """Upsert a student record to Supabase 'students' table."""
        if not self.enabled:
            return False

        endpoint = f"{self.url}/rest/v1/students"
        payload = json.dumps([{
            "roll_no": student_dict.get("roll_no"),
            "name": student_dict.get("name"),
            "class_name": student_dict.get("class_name"),
            "parent_phone": student_dict.get("parent_phone"),
            "parent_email": student_dict.get("parent_email"),
            "updated_at": datetime.utcnow().isoformat()
        }]).encode("utf-8")

        try:
            req = urllib.request.Request(endpoint, data=payload, headers=self._get_headers(), method="POST")
            with urllib.request.urlopen(req, timeout=5) as resp:
                return resp.status in (200, 201)
        except Exception as e:
            logger.warning(f"Failed to sync student {student_dict.get('roll_no')} to Supabase: {e}")
            return False

    def sync_attendance_record(self, record: Dict[str, Any]) -> bool:
        """Push an attendance event to Supabase 'attendance' table."""
        if not self.enabled:
            return False

        endpoint = f"{self.url}/rest/v1/attendance"
        payload = json.dumps([{
            "student_roll_no": record.get("roll_no"),
            "date": record.get("date"),
            "session": record.get("session"),
            "timestamp": record.get("timestamp") or datetime.utcnow().isoformat(),
            "method": record.get("method", "auto"),
            "note": record.get("note")
        }]).encode("utf-8")

        try:
            req = urllib.request.Request(endpoint, data=payload, headers=self._get_headers(), method="POST")
            with urllib.request.urlopen(req, timeout=5) as resp:
                return resp.status in (200, 201)
        except Exception as e:
            logger.warning(f"Failed to sync attendance record to Supabase: {e}")
            return False

    def sync_all_from_local(self, db_session) -> Dict[str, Any]:
        """Perform a full sync of local SQLite students and attendance to Supabase."""
        if not self.is_configured():
            return {
                "success": False,
                "message": "Supabase credentials are not configured in settings."
            }

        from app.models import Student, Attendance
        students = db_session.query(Student).all()
        attendance = db_session.query(Attendance).all()

        synced_students = 0
        synced_records = 0

        # Sync students batch
        if students:
            student_records = [{
                "roll_no": s.roll_no,
                "name": s.name,
                "class_name": s.class_name,
                "parent_phone": s.parent_phone,
                "parent_email": s.parent_email,
                "updated_at": datetime.utcnow().isoformat()
            } for s in students]

            try:
                endpoint = f"{self.url}/rest/v1/students"
                payload = json.dumps(student_records).encode("utf-8")
                req = urllib.request.Request(endpoint, data=payload, headers=self._get_headers(), method="POST")
                with urllib.request.urlopen(req, timeout=10) as resp:
                    if resp.status in (200, 201):
                        synced_students = len(students)
            except Exception as e:
                logger.error(f"Error bulk syncing students: {e}")

        # Sync attendance batch
        if attendance:
            att_records = [{
                "student_id": a.student_id,
                "date": a.date.isoformat() if hasattr(a.date, 'isoformat') else str(a.date),
                "session": a.session,
                "timestamp": a.timestamp.isoformat() if hasattr(a.timestamp, 'isoformat') else str(a.timestamp),
                "method": a.method,
                "note": a.note
            } for a in attendance]

            try:
                endpoint = f"{self.url}/rest/v1/attendance"
                payload = json.dumps(att_records).encode("utf-8")
                req = urllib.request.Request(endpoint, data=payload, headers=self._get_headers(), method="POST")
                with urllib.request.urlopen(req, timeout=10) as resp:
                    if resp.status in (200, 201):
                        synced_records = len(attendance)
            except Exception as e:
                logger.error(f"Error bulk syncing attendance: {e}")

        return {
            "success": True,
            "message": f"Sync completed: {synced_students} students, {synced_records} attendance records pushed to Supabase.",
            "synced_students": synced_students,
            "synced_records": synced_records
        }


# Singleton instance
supabase_service = SupabaseService()
