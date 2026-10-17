#!/usr/bin/env python3
"""
Script to regenerate face embeddings for all enrolled students
using the currently active FACE_ENGINE in settings.
"""

import os
import sys
from pathlib import Path
import cv2
import json

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.database import SessionLocal, engine
from app.models import Student, FaceEmbedding, Base
from app.config import settings
from app.services.face_engine import get_engine

def regenerate():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    face_engine = get_engine()
    print(f"Regenerating embeddings using engine: {face_engine.engine_name} (Dim: {face_engine.dimension})")
    
    try:
        students = db.query(Student).all()
        total_students = len(students)
        success_count = 0
        
        for student in students:
            # Delete old embeddings for this student, but maybe ONLY for the current engine, 
            # or all of them? Let's delete old ones for the current engine so we replace them, 
            # or delete all if we want to clean up. Let's delete all to avoid clutter.
            db.query(FaceEmbedding).filter(FaceEmbedding.student_id == student.id).delete()
            
            student_dir = Path(settings.FACES_DIR) / student.roll_no
            if not student_dir.exists():
                print(f"Skipping {student.name} ({student.roll_no}) - No face folder found.")
                continue
                
            enrolled = False
            for img_path in student_dir.glob("*.jpg"):
                img = cv2.imread(str(img_path))
                if img is None:
                    continue
                    
                embedding = face_engine.get_embedding(img)
                if embedding is not None:
                    new_emb = FaceEmbedding(
                        student_id=student.id,
                        embedding=json.dumps(embedding.tolist()),
                        engine=face_engine.engine_name,
                        dimension=face_engine.dimension
                    )
                    db.add(new_emb)
                    enrolled = True
                    
            if enrolled:
                success_count += 1
                print(f"Successfully regenerated embeddings for {student.name} ({student.roll_no})")
            else:
                print(f"Failed to extract embeddings for {student.name} ({student.roll_no}) from saved images.")
                
        db.commit()
        print(f"Done! Successfully regenerated embeddings for {success_count}/{total_students} students.")
    except Exception as e:
        print(f"Error regenerating embeddings: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    regenerate()
