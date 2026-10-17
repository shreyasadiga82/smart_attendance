from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Attendance, Student, User
from app.schemas import AttendanceCreate, AttendanceUpdate, AttendanceInDB, AttendanceWithStudent
from app.services.attendance_service import AttendanceService
from app.deps import get_current_active_user
from app.config import settings
from datetime import date, datetime


router = APIRouter()


@router.post("/", response_model=AttendanceInDB)
async def mark_attendance(
    attendance: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Use attendance service to mark attendance
    attendance_service = AttendanceService(db)
    try:
        db_attendance = attendance_service.mark_attendance(
            student_id=attendance.student_id,
            date=attendance.date,
            session=attendance.session,
            method=attendance.method,
            note=attendance.note
        )
        return db_attendance
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[AttendanceWithStudent])
async def read_attendance(
    skip: int = 0,
    limit: int = 100,
    student_id: Optional[int] = None,
    target_date: Optional[date] = None,
    session: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Attendance).join(Student)
    if student_id:
        query = query.filter(Attendance.student_id == student_id)
    if target_date:
        query = query.filter(Attendance.date == target_date)
    if session:
        query = query.filter(Attendance.session == session)
    attendance_records = query.offset(skip).limit(limit).all()
    return attendance_records


@router.put("/{attendance_id}", response_model=AttendanceInDB)
async def update_attendance(
    attendance_id: int,
    attendance_update: AttendanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if db_attendance is None:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    update_data = attendance_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_attendance, key, value)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance


@router.delete("/{attendance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attendance(
    attendance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if db_attendance is None:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    db.delete(db_attendance)
    db.commit()
    return None


@router.get("/today", response_model=List[AttendanceWithStudent])
async def get_today_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    today = date.today()
    attendance_records = db.query(Attendance).join(Student).filter(Attendance.date == today).all()
    return attendance_records