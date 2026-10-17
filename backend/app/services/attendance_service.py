from sqlalchemy.orm import Session
from typing import Optional, List
from app.models import Attendance, Student
from app.schemas import AttendanceCreate
from app.services.session_service import SessionService
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
        Raises ValueError if already marked or outside session.
        """
        target_date = target_date or date or datetime.now().date()
        # Check if session is active
        current_session = self.session_service.get_current_session()
        if current_session is None:
            raise ValueError("No active session at this time")

        # Check if the provided session matches current session
        if session != current_session:
            raise ValueError(f"Current session is {current_session}, not {session}")

        # Check for duplicate attendance (unique constraint will also catch this)
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

        logger.info(f"Attendance marked for student {student_id} at {now}")
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