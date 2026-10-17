from sqlalchemy.orm import Session
from typing import Optional, List
from app.models import Attendance, Student
from app.schemas import AttendanceCreate
from app.services.session_service import SessionService
from app.services.supabase_service import supabase_service
from app.config import settings
from datetime import date, datetime
import logging

logger = logging.getLogger(__name__)


class AttendanceService:
    def __init__(self, db_session: Session):
        self.db = db_session
        self.session_service = SessionService()
        self.cooldown = {}  # Track last attendance time per student for cooldown

    def mark_attendance(
        self,
        student_id: int,
        target_date: Optional[date] = None,
        session: str = "morning",
        method: str = "auto",
        note: Optional[str] = None,
        date: Optional[date] = None
    ) -> Attendance:
        """
        Mark attendance for a student.
        Raises ValueError if already marked or within rapid duplicate cooldown.
        Supports automatic session fallback for off-hour classes/demos.
        """
        target_date = target_date or date or datetime.now().date()

        # Check if session is active
        current_session = self.session_service.get_current_session()
        if method == "auto" and current_session is None:
            raise ValueError("No active session at this time")

        if current_session:
            session = current_session
        elif not session:
            session = "morning"

        # Check for duplicate attendance
        existing = self.db.query(Attendance).filter(
            Attendance.student_id == student_id,
            Attendance.date == target_date,
            Attendance.session == session
        ).first()
        if existing:
            raise ValueError("Attendance already marked for this student today")

        # Check cooldown (3 seconds per person)
        now = datetime.now()
        if student_id in self.cooldown:
            last_time = self.cooldown[student_id]
            if (now - last_time).total_seconds() < 3:
                raise ValueError("Please wait a moment before trying again")

        # Create attendance record
        db_attendance = Attendance(
            student_id=student_id,
            date=target_date,
            session=session,
            method=method,
            note=note
        )
        self.db.add(db_attendance)
        self.db.commit()
        self.db.refresh(db_attendance)

        # Update cooldown
        self.cooldown[student_id] = now

        logger.info(f"Attendance marked: student {student_id}, session {session}, method {method}")

        # Async cloud sync to Supabase if configured
        try:
            if supabase_service.enabled:
                student = self.db.query(Student).filter(Student.id == student_id).first()
                supabase_service.sync_attendance_record({
                    "roll_no": student.roll_no if student else str(student_id),
                    "date": target_date.isoformat() if hasattr(target_date, 'isoformat') else str(target_date),
                    "session": session,
                    "timestamp": now.isoformat(),
                    "method": method,
                    "note": note
                })
        except Exception as e:
            logger.warning(f"Background Supabase sync failed: {e}")

        return db_attendance

    def check_already_marked(
        self,
        student_id: int,
        target_date: date,
        session: str
    ) -> bool:
        """Check if attendance is already marked for a student"""
        existing = self.db.query(Attendance).filter(
            Attendance.student_id == student_id,
            Attendance.date == target_date,
            Attendance.session == session
        ).first()
        return existing is not None

    def get_attendance_for_student(
        self,
        student_id: int,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None
    ) -> List[Attendance]:
        """Get attendance records for a student"""
        query = self.db.query(Attendance).filter(Attendance.student_id == student_id)
        if start_date:
            query = query.filter(Attendance.date >= start_date)
        if end_date:
            query = query.filter(Attendance.date <= end_date)
        return query.all()

    def get_today_attendance(self) -> List[Attendance]:
        """Get all attendance records for today"""
        today = date.today()
        return self.db.query(Attendance).filter(Attendance.date == today).all()