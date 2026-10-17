"""
End-to-end verification script for Smart Attendance System.
Tests:
1. PROFILE=laptop:
   - User login and JWT retrieval (/api/auth/token)
   - Dashboard summary inspection (/api/dashboard/)
   - Attendance marking once per session and duplicate prevention (/api/attendance/)
2. PROFILE=pi3:
   - Mock hardware initialization with parallel 1602A LCD
   - Verify parallel pins (RS=25, E=24, D4=5, D5=6, D6=13, D7=19, RW=None)
   - Feedback actions (welcome, duplicate warning, unknown face, cleanup)
"""

import os
import sys
import asyncio
from datetime import datetime, date, time as dtime
from unittest.mock import MagicMock, patch

# Ensure paths
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "edge")))

from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models import User, Student, Attendance
from app.security import get_password_hash
from app.config import Settings
from app.services.attendance_service import AttendanceService
from app.services.session_service import SessionService
from app.services.hardware.feedback import HardwareFeedbackFactory, GPIOFeedback

print("==================================================================")
print("  STEP 1: VERIFYING BACKEND IN PROFILE=laptop")
print("==================================================================")

# Create an in-memory SQLite database for test verification
TEST_DB_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

db = TestingSessionLocal()
# Create admin user
hashed_pw = get_password_hash("admin123")
admin = User(username="admin", email="admin@example.com", hashed_password=hashed_pw, is_admin=True, is_active=True)
db.add(admin)

# Create demo student
student = Student(
    id=1,
    roll_no="CS101",
    name="Jane Doe",
    class_name="CS-3A",
    parent_phone="9876543210",
    parent_email="parent@example.com"
)
db.add(student)
db.commit()


async def verify_laptop_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        # 1. Test Login
        print("\n[1/4] Testing Admin Login (/api/auth/token)...")
        login_resp = await client.post("/api/auth/token", data={"username": "admin", "password": "admin123"})
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json()["access_token"]
        print(f"      [+] Login successful! JWT Access Token received (length {len(token)}).")
        auth_headers = {"Authorization": f"Bearer {token}"}

        # Mock current session to 'morning' for testing
        with patch.object(SessionService, "get_current_session", return_value="morning"):
            # 2. Check Dashboard Summary
            print("\n[2/4] Testing Dashboard Summary API (/api/dashboard/)...")
            dash_resp = await client.get("/api/dashboard/", headers=auth_headers)
            assert dash_resp.status_code == 200, f"Dashboard failed: {dash_resp.text}"
            dash_data = dash_resp.json()
            print(f"      [+] Dashboard retrieved successfully!")
            print(f"          Present Count  : {dash_data['stats']['present_count']}")
            print(f"          Current Session: {dash_data['stats']['current_session']}")

            # 3. Mark Attendance First Time
            print("\n[3/4] Marking Attendance for Student Jane Doe (First Scan)...")
            att_payload = {
                "student_id": 1,
                "date": str(date.today()),
                "session": "morning",
                "method": "face",
                "note": "Verified in session"
            }
            res1 = await client.post("/api/attendance/", json=att_payload, headers=auth_headers)
            assert res1.status_code == 200, f"Failed first mark: {res1.text}"
            rec1 = res1.json()
            print(f"      [+] Attendance marked successfully: Record ID {rec1['id']}, Student {rec1['student_id']}, Session {rec1['session']}")

            # 4. Mark Attendance Second Time in Same Session (Duplicate Prevention)
            print("\n[4/4] Marking Attendance Second Time (Duplicate Prevention Check)...")
            res2 = await client.post("/api/attendance/", json=att_payload, headers=auth_headers)
            print(f"      Response status: {res2.status_code}, Detail: {res2.json().get('detail')}")
            assert res2.status_code == 400, f"Expected 400 duplicate rejection, got {res2.status_code}: {res2.text}"
            assert "already marked" in res2.json()["detail"].lower()
            print("      [+] Duplicate attendance correctly prevented within same session!")

asyncio.run(verify_laptop_flow())

print("\n==================================================================")
print("  STEP 2: VERIFYING PROFILE=pi3 WITH MOCK HARDWARE")
print("==================================================================")

pi3_settings = Settings(
    PROFILE="pi3",
    LCD_MODE="parallel",
    LCD_RS_PIN=25,
    LCD_E_PIN=24,
    LCD_D4_PIN=5,
    LCD_D5_PIN=6,
    LCD_D6_PIN=13,
    LCD_D7_PIN=19,
    PIN_LED_GREEN=17,
    PIN_LED_RED=27,
    PIN_BUZZER=22,
    PIN_BUTTON=23
)

mock_gpio = MagicMock()
mock_rplcd_gpio = MagicMock()
mock_char_lcd_instance = MagicMock()
mock_rplcd_gpio.CharLCD.return_value = mock_char_lcd_instance
mock_gpiozero = MagicMock()

with patch.dict("sys.modules", {
    "RPi": MagicMock(GPIO=mock_gpio),
    "RPi.GPIO": mock_gpio,
    "RPLCD": MagicMock(),
    "RPLCD.gpio": mock_rplcd_gpio,
    "gpiozero": mock_gpiozero
}):
    print("\n[1/3] Initializing Pi 3 Hardware Feedback with Parallel 1602A LCD...")
    fb = GPIOFeedback(cfg=pi3_settings)
    init_ok = fb.init()
    assert init_ok is True
    print("      [+] Hardware Feedback successfully initialized!")

    print("\n[2/3] Verifying Parallel 1602A Pin Configuration...")
    mock_rplcd_gpio.CharLCD.assert_called_once()
    kwargs = mock_rplcd_gpio.CharLCD.call_args[1]
    print(f"      RS Pin   : {kwargs['pin_rs']} (Expected 25)")
    print(f"      E Pin    : {kwargs['pin_e']} (Expected 24)")
    print(f"      Data Pins: {kwargs['pins_data']} (Expected [5, 6, 13, 19])")
    print(f"      RW Pin   : {kwargs['pin_rw']} (Expected None - tied to GND)")
    assert kwargs['pin_rs'] == 25
    assert kwargs['pin_e'] == 24
    assert kwargs['pins_data'] == [5, 6, 13, 19]
    assert kwargs['pin_rw'] is None

    print("\n[3/3] Testing Feedback Actions...")
    fb.success("Jane Doe")
    mock_char_lcd_instance.write_string.assert_any_call("Welcome:")
    mock_char_lcd_instance.write_string.assert_any_call("Jane Doe")
    print("      [+] Success feedback displayed 'Welcome:' / 'Jane Doe' on LCD!")

    fb.already_marked("Jane Doe")
    mock_char_lcd_instance.write_string.assert_any_call("Already Marked:")
    print("      [+] Duplicate feedback displayed 'Already Marked:' on LCD!")

    fb.unknown()
    mock_char_lcd_instance.write_string.assert_any_call("Not Recognised")
    print("      [+] Unknown face feedback displayed 'Not Recognised' on LCD!")

    fb.cleanup()
    print("      [+] Cleanup executed cleanly.")

print("\n==================================================================")
print("  ALL VERIFICATION CHECKS COMPLETED WITH 100% SUCCESS!")
print("==================================================================")
