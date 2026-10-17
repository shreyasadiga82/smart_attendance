#!/usr/bin/env python3
"""
Script to create the initial admin user for the Smart Attendance System.
"""

import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.database import SessionLocal, engine
from app.models import User, Base
from app.security import get_password_hash
from app.config import settings

def create_admin():
    """Create admin user if it doesn't exist."""
    # Create database tables if they don't exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if admin user already exists
        admin_user = db.query(User).filter(User.username == "admin").first()
        if admin_user:
            print("Admin user already exists.")
            return admin_user

        # Create admin user
        hashed_password = get_password_hash(settings.ADMIN_PASSWORD or "admin123")
        admin_user = User(
            username="admin",
            email="admin@example.com",
            hashed_password=hashed_password,
            is_active=True,
            is_admin=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print("Admin user created successfully!")
        print(f"Username: admin")
        print(f"Password: {settings.ADMIN_PASSWORD or 'admin123'}")
        print(f"Email: admin@example.com")
        print("\nPlease change the password after first login.")

        return admin_user
    except Exception as e:
        print(f"Error creating admin user: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()