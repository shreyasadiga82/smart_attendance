"""
Clean / Reset Demo Data Script
Wipes mock students, mock attendance, and mock face embeddings while preserving:
- Admin account ('admin')
- Teacher account ('teacher')
- Edge device credentials
- System settings
Prepares the Smart Attendance System for clean, production/real-world deployment.
"""

import sys
import os

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database import SessionLocal
from app.models import Student, Attendance, FaceEmbedding, NotificationLog, AuditLog, User
from app.services.face_engine import get_engine
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("clean_demo_data")

def clean_database():
    db = SessionLocal()
    try:
        att_count = db.query(Attendance).count()
        student_count = db.query(Student).count()
        emb_count = db.query(FaceEmbedding).count()
        notif_count = db.query(NotificationLog).count()

        logger.info(f"Existing records found:")
        logger.info(f"  - Students: {student_count}")
        logger.info(f"  - Attendance Records: {att_count}")
        logger.info(f"  - Face Embeddings: {emb_count}")
        logger.info(f"  - Notification Logs: {notif_count}")

        # Delete attendance records
        db.query(Attendance).delete()
        # Delete face embeddings
        db.query(FaceEmbedding).delete()
        # Delete students
        db.query(Student).delete()
        # Delete notification logs
        db.query(NotificationLog).delete()
        # Delete audit logs
        db.query(AuditLog).delete()

        db.commit()
        logger.info("Successfully wiped all demo student, attendance, and biometric records.")

        # Reload face engine cache
        try:
            engine = get_engine()
            engine.load_embeddings_from_db(db)
            logger.info("Face engine in-memory cache refreshed (now empty).")
        except Exception as e:
            logger.warning(f"Could not reload face engine: {e}")

        # Clean generated mock reports
        for rep_dir in [os.path.join(backend_dir, '..', 'data', 'reports'), os.path.join(backend_dir, 'data', 'reports')]:
            if os.path.exists(rep_dir):
                for f in os.listdir(rep_dir):
                    fpath = os.path.join(rep_dir, f)
                    if os.path.isfile(fpath) and not f.startswith('.'):
                        try:
                            os.remove(fpath)
                            logger.info(f"Removed demo report file: {f}")
                        except Exception as err:
                            logger.warning(f"Could not remove {fpath}: {err}")

        # Verify users exist
        users = db.query(User).all()
        logger.info(f"Active system users retained: {[u.username for u in users]}")

        print("\n" + "=" * 60)
        print("  CLEANUP COMPLETE: Ready for Real-World Usage!")
        print("=" * 60)
        print("  - All mock/demo data removed.")
        print("  - Admin and Teacher accounts preserved.")
        print("  - Database is now completely clean for registering real students.")
        print("=" * 60 + "\n")

    except Exception as e:
        db.rollback()
        logger.error(f"Error cleaning database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    auto_yes = "--yes" in sys.argv or "-y" in sys.argv or os.environ.get("AUTO_CONFIRM") == "1"
    if auto_yes:
        clean_database()
    else:
        confirm = input("Are you sure you want to delete all demo students and attendance records? (y/N): ")
        if confirm.strip().lower() in ('y', 'yes'):
            clean_database()
        else:
            print("Cleanup aborted by user.")
