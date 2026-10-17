from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Student, FaceEmbedding, User
from app.schemas import StudentCreate, StudentInDB, EnrollmentStep1, EnrollmentStep2, EnrollmentResponse
from app.services.face_engine import FaceEngine, get_engine
from app.deps import get_current_active_user
import numpy as np
import json
import os
from app.config import settings


router = APIRouter()


# Initialize face engine (singleton)
face_engine = get_engine()


@router.post("/step1", response_model=StudentInDB)
async def enrollment_step1(
    student_data: EnrollmentStep1,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Check if roll_no already exists
    db_student = db.query(Student).filter(Student.roll_no == student_data.roll_no).first()
    if db_student:
        raise HTTPException(status_code=400, detail="Roll number already registered")
    # Create student
    db_student = Student(**student_data.dict())
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student


@router.post("/step2/{student_id}", response_model=EnrollmentResponse)
async def enrollment_step2(
    student_id: int,
    enrollment_data: EnrollmentStep2,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Verify student exists
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Process images and extract embeddings
    embeddings = []
    for img_base64 in enrollment_data.images:
        # Decode base64 image
        import base64
        import cv2
        import numpy as np
        # For simplicity, we assume the image is in JPEG format
        # In a real implementation, we would use the face engine to extract embedding
        # Here we simulate by generating a random embedding (to be replaced)
        # Actually, we'll use the face engine
        try:
            # Convert base64 to image
            img_data = base64.b64decode(img_base64)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            # Extract embedding using face engine
            embedding = face_engine.get_embedding(img)
            if embedding is not None:
                embeddings.append(embedding.tolist())
        except Exception as e:
            # Log error and continue
            print(f"Error processing image: {e}")
            continue

    if not embeddings:
        raise HTTPException(status_code=400, detail="No valid faces detected in images")

    # Store embeddings in database
    for embedding in embeddings:
        face_embedding = FaceEmbedding(
            student_id=student_id,
            embedding=json.dumps(embedding)  # Store as JSON string
        )
        db.add(face_embedding)

    db.commit()

    # Reload face engine embeddings (in-memory cache)
    face_engine.load_embeddings_from_db(db)

    return EnrollmentResponse(
        student_id=student_id,
        message=f"Successfully enrolled {len(embeddings)} face images for student {student.roll_no}"
    )


@router.post("/complete", response_model=EnrollmentResponse)
async def complete_enrollment(
    student_data: EnrollmentStep1,
    images: List[str],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # This endpoint combines step1 and step2 for simplicity
    # In a real implementation, we might want to keep them separate
    student = await enrollment_step1(student_data, db, current_user)
    enrollment_data = EnrollmentStep2(student_id=student.id, images=images)
    result = await enrollment_step2(student.id, enrollment_data, db, current_user)
    return result