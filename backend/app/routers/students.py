from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Student
from app.schemas import StudentCreate, StudentUpdate, StudentInDB, StudentWithAvatar
from app.deps import get_current_active_user
from app.config import settings
import os


router = APIRouter()



# For now, we'll skip authentication to focus on structure
# In a real implementation, we would add authentication

@router.get("/", response_model=List[StudentInDB])
async def read_students(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_active_user)
):
    students = db.query(Student).offset(skip).limit(limit).all()
    return students


@router.post("/", response_model=StudentInDB)
async def create_student(
    student: StudentCreate,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_active_user)
):
    # Check if roll_no already exists
    db_student = db.query(Student).filter(Student.roll_no == student.roll_no).first()
    if db_student:
        raise HTTPException(status_code=400, detail="Roll number already registered")
    db_student = Student(**student.dict())
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student


@router.get("/{student_id}", response_model=StudentInDB)
async def read_student(
    student_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_active_user)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.put("/{student_id}", response_model=StudentInDB)
async def update_student(
    student_id: int,
    student: StudentUpdate,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_active_user)
):
    db_student = db.query(Student).filter(Student.id == student_id).first()
    if db_student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    update_data = student.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_student, key, value)
    db.commit()
    db.refresh(db_student)
    return db_student


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_active_user)
):
    db_student = db.query(Student).filter(Student.id == student_id).first()
    if db_student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(db_student)
    db.commit()
    return None


# Helper to get avatar URL (placeholder)
def get_avatar_url(student_id: int) -> Optional[str]:
    # In a real implementation, we would check if there are face images and return the first one
    # For now, return a placeholder or None
    return None