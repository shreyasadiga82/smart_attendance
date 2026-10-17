import pytest
from app.services.supabase_service import SupabaseService
from app.config import settings

def test_supabase_service_unconfigured():
    # When Supabase is not configured or disabled
    service = SupabaseService(enabled=False, url="", key="")
    assert not service.is_configured()
    res = service.test_connection()
    assert res["success"] is False
    assert "not configured" in res["message"]

def test_supabase_sync_when_disabled():
    service = SupabaseService(enabled=False)
    # Syncing student returns False when disabled
    res = service.sync_student({"id": 1, "name": "Test"})
    assert res is False
    # Syncing attendance returns False when disabled
    res_att = service.sync_attendance_record({"id": 1, "student_id": 1})
    assert res_att is False
