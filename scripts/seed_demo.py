#!/usr/bin/env python3
"""
Script to seed the database with demo students and sample attendance data.
"""

import os
import sys
from datetime import date, datetime, timedelta
import random
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.database import SessionLocal, engine
from app.models import Student, Attendance, User, Base, FaceEmbedding
from app.security import get_password_hash
from app.services.face_engine import get_engine
import numpy as np
import json

def create_demo_students(db):
    """Create demo students if they don't exist."""
    # Check if we already have students
    existing_count = db.query(Student).count()
    if existing_count > 0:
        print(f"Found {existing_count} existing students. Skipping demo student creation.")
        return

    # Demo student data
    demo_students = [
        {"roll_no": "001", "name": "Alice Johnson", "class_name": "10A", "parent_phone": "555-0101", "parent_email": "alice.parent@example.com"},
        {"roll_no": "002", "name": "Bob Smith", "class_name": "10A", "parent_phone": "555-0102", "parent_email": "bob.parent@example.com"},
        {"roll_no": "003", "name": "Carol Davis", "class_name": "10B", "parent_phone": "555-0103", "parent_email": "carol.parent@example.com"},
        {"roll_no": "004", "name": "David Wilson", "class_name": "10B", "parent_phone": "555-0104", "parent_email": "david.parent@example.com"},
        {"roll_no": "005", "name": "Emma Brown", "class_name": "11A", "parent_phone": "555-0105", "parent_email": "emma.parent@example.com"},
        {"roll_no": "006", "name": "Frank Miller", "class_name": "11A", "parent_phone": "555-0106", "parent_email": "frank.parent@example.com"},
        {"roll_no": "007", "name": "Grace Lee", "class_name": "11B", "parent_phone": "555-0107", "parent_email": "grace.parent@example.com"},
        {"roll_no": "008", "name": "Henry Clark", "class_name": "11B", "parent_phone": "555-0108", "parent_email": "henry.parent@example.com"},
        {"roll_no": "009", "name": "Isabel Rodriguez", "class_name": "12A", "parent_phone": "555-0109", "parent_email": "isabel.parent@example.com"},
        {"roll_no": "010", "name": "Jack Walker", "class_name": "12A", "parent_phone": "555-0110", "parent_email": "jack.parent@example.com"},
        {"roll_no": "011", "name": "Katherine Young", "class_name": "12B", "parent_phone": "555-0111", "parent_email": "katherine.parent@example.com"},
        {"roll_no": "012", "name": "Leo King", "class_name": "12B", "parent_phone": "555-0112", "parent_email": "leo.parent@example.com"}
    ]

    # Create students
    students = []
    for student_data in demo_students:
        student = Student(**student_data)
        db.add(student)
        students.append(student)

    db.commit()
    print(f"Created {len(students)} demo students.")

    # Generate fake face embeddings for each student
    face_engine = get_engine()
    for student in students:
        # Generate 5 random embeddings per student
        for _ in range(5):
            # Generate a random N-dimensional vector depending on engine size
            embedding = np.random.randn(face_engine.dimension).astype(np.float32)
            # Normalize to unit vector
            embedding = embedding / np.linalg.norm(embedding)
            # Store as JSON string
            embedding_json = json.dumps(embedding.tolist())

            face_embedding = FaceEmbedding(
                student_id=student.id,
                embedding=embedding_json,
                engine=face_engine.engine_name,
                dimension=face_engine.dimension
            )
            db.add(face_embedding)

    db.commit()
    print("Generated demo face embeddings.")

def create_sample_attendance(db):
    """Create sample attendance data for the past 14 days."""
    # Check if we already have attendance records
    existing_count = db.query(Attendance).count()
    if existing_count > 0:
        print(f"Found {existing_count} existing attendance records. Skipping sample data generation.")
        return

    students = db.query(Student).all()
    if not students:
        print("No students found. Please create students first.")
        return

    # Generate attendance for the last 14 days
    end_date = date.today()
    start_date = end_date - timedelta(days=13)

    total_records = 0
    current_date = start_date
    while current_date <= end_date:
        # Determine if it's a weekday (Monday=0, Sunday=6)
        if current_date.weekday() < 5:  # Weekday
            # For each student, randomly decide if they attend morning and/or afternoon sessions
            for student in students:
                # Morning session (80% chance of attendance)
                if random.random() < 0.8:
                    # Random time between 8:00 and 9:00
                    hour = random.randint(8, 8)
                    minute = random.randint(0, 59)
                    second = random.randint(0, 59)
                    timestamp = datetime.combine(current_date, datetime.min.time()).replace(hour=hour, minute=minute, second=second)

                    attendance = Attendance(
                        student_id=student.id,
                        date=current_date,
                        session="morning",
                        timestamp=timestamp,
                        method="auto"
                    )
                    db.add(attendance)
                    total_records += 1

                # Afternoon session (70% chance of attendance)
                if random.random() < 0.7:
                    # Random time between 13:00 and 14:00
                    hour = random.randint(13, 13)
                    minute = random.randint(0, 59)
                    second = random.randint(0, 59)
                    timestamp = datetime.combine(current_date, datetime.min.time()).replace(hour=hour, minute=minute, second=second)

                    attendance = Attendance(
                        student_id=student.id,
                        date=current_date,
                        session="afternoon",
                        timestamp=timestamp,
                        method="auto"
                    )
                    db.add(attendance)
                    total_records += 1
        else:
            # Weekend - lower attendance
            for student in students:
                # Morning session (30% chance)
                if random.random() < 0.3:
                    hour = random.randint(9, 9)
                    minute = random.randint(0, 59)
                    second = random.randint(0, 59)
                    timestamp = datetime.combine(current_date, datetime.min.time()).replace(hour=hour, minute=minute, second=second)

                    attendance = Attendance(
                        student_id=student.id,
                        date=current_date,
                        session="morning",
                        timestamp=timestamp,
                        method="auto"
                    )
                    db.add(attendance)
                    total_records += 1

                # Afternoon session (20% chance)
                if random.random() < 0.2:
                    hour = random.randint(13, 13)
                    minute = random.randint(0, 59)
                    second = random.randint(0, 59)
                    timestamp = datetime.combine(current_date, datetime.min.time()).replace(hour=hour, minute=minute, second=second)

                    attendance = Attendance(
                        student_id=student.id,
                        date=current_date,
                        session="afternoon",
                        timestamp=timestamp,
                        method="auto"
                    )
                    db.add(attendance)
                    total_records += 1

        current_date += timedelta(days=1)

    db.commit()
    print(f"Created {total_records} sample attendance records.")

def main():
    """Main function to run the seeding process."""
    print("Starting database seeding...")

    # Create database tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        create_demo_students(db)
        create_sample_attendance(db)
        print("Seeding completed successfully!")
    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()