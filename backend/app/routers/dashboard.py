from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Attendance, Student, User
from app.schemas import DashboardStats, RecentActivity, DashboardData
from app.services.session_service import SessionService
from app.deps import get_current_active_user
from app.config import settings
from datetime import date, datetime, timedelta
import json


router = APIRouter()


@router.get("/", response_model=DashboardData)
async def get_dashboard_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Get today's date
    today = date.today()

    # Get current session (morning/afternoon/none)
    session_service = SessionService()
    current_session = session_service.get_current_session()

    # Get today's attendance records
    today_attendance = db.query(Attendance).filter(Attendance.date == today).all()

    # Calculate stats
    total_students = db.query(Student).count()
    present_today = len(today_attendance)
    absent_today = total_students - present_today
    attendance_percentage = (present_today / total_students * 100) if total_students > 0 else 0

    # Morning and afternoon counts
    morning_present = len([a for a in today_attendance if a.session == "morning"])
    afternoon_present = len([a for a in today_attendance if a.session == "afternoon"])

    stats = DashboardStats(
        present_count=present_today,
        absent_count=absent_today,
        attendance_percentage=round(attendance_percentage, 2),
        current_session=current_session,
        morning_present=morning_present,
        afternoon_present=afternoon_present
    )

    # Get trend data for the last 7 days
    trend_data = []
    for i in range(7):
        target_date = today - timedelta(days=i)
        day_attendance = db.query(Attendance).filter(Attendance.date == target_date).count()
        day_students = db.query(Student).count()  # Assuming total students doesn't change daily
        percentage = (day_attendance / day_students * 100) if day_students > 0 else 0
        trend_data.append({
            "date": target_date.isoformat(),
            "present": day_attendance,
            "percentage": round(percentage, 2)
        })
    trend_data.reverse()  # Most recent last for chart

    # Get session donut data (morning vs afternoon today)
    session_donut_data = [
        {"name": "Morning", "value": morning_present},
        {"name": "Afternoon", "value": afternoon_present}
    ]

    # Get recent activity (last 10 attendance records)
    recent_records = db.query(Attendance).join(Student).order_by(Attendance.timestamp.desc()).limit(10).all()
    recent_activity = []
    for record in recent_records:
        recent_activity.append(RecentActivity(
            id=record.id,
            student_name=record.student.name,
            roll_no=record.student.roll_no,
            timestamp=record.timestamp,
            session=record.session,
            status="present"  # Since it's an attendance record, it's present
        ))

    # Edge devices
    from app.models import EdgeDevice
    edge_devices = db.query(EdgeDevice).all()
    
    # System Stats
    cpu_percent = 0.0
    ram_percent = 0.0
    try:
        import psutil
        cpu_percent = psutil.cpu_percent(interval=None)
        ram_percent = psutil.virtual_memory().percent
    except Exception:
        pass

    cpu_temp = None
    try:
        # Works on Raspberry Pi
        with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
            cpu_temp = float(f.read().strip()) / 1000.0
    except Exception:
        pass
        
    system_stats = {
        "cpu_percent": cpu_percent,
        "ram_percent": ram_percent,
        "cpu_temp": cpu_temp,
        "is_pi": (settings.PROFILE == "pi3")
    }

    return DashboardData(
        stats=stats,
        trend_data=trend_data,
        session_donut_data=session_donut_data,
        recent_activity=recent_activity,
        edge_devices=edge_devices,
        system_stats=system_stats
    )