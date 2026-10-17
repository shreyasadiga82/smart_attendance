from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from app.services.mailer import Mailer
from app.services.report_service import ReportService
from app.database import SessionLocal
from app.config import settings
import logging
import datetime

logger = logging.getLogger(__name__)


class SchedulerService:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.mailer = Mailer()
        self._setup_jobs()

    def _setup_jobs(self):
        """Setup scheduled jobs based on settings"""
        if settings.AUTO_REPORT_ENABLED:
            # Parse the auto report time (HH:MM)
            try:
                hour, minute = map(int, settings.AUTO_REPORT_TIME.split(':'))
                trigger = CronTrigger(hour=hour, minute=minute)
                self.scheduler.add_job(
                    self.send_auto_report,
                    trigger=trigger,
                    id='auto_report',
                    name='Send daily attendance report',
                    replace_existing=True
                )
                logger.info(f"Auto-report scheduled for {settings.AUTO_REPORT_TIME} daily")
            except Exception as e:
                logger.error(f"Failed to parse auto report time {settings.AUTO_REPORT_TIME}: {e}")

    def send_auto_report(self):
        """Generate and send automatic attendance report"""
        logger.info("Generating automatic attendance report")
        db = SessionLocal()
        try:
            # Generate report for yesterday (or today, depending on preference)
            end_date = datetime.date.today()
            start_date = end_date - datetime.timedelta(days=1)  # Yesterday

            report_service = ReportService(db)
            report_data = report_service.generate_report(start_date, end_date)

            # Export to Excel
            excel_path = report_service.export_to_excel(start_date, end_date)

            # Send email if teacher email is configured
            if settings.TEACHER_EMAIL:
                self.mailer.send_attendance_report(
                    [settings.TEACHER_EMAIL],
                    {
                        "total_students": report_data.summary.get("total_students", 0),
                        "total_present": report_data.summary.get("total_present_records", 0),
                        "attendance_percentage": report_data.summary.get("attendance_percentage", 0)
                    }
                )
                logger.info(f"Auto-report sent to {settings.TEACHER_EMAIL}")
            else:
                logger.warning("Teacher email not configured, skipping email notification")

        except Exception as e:
            logger.error(f"Error generating auto-report: {e}")
        finally:
            db.close()

    def start(self):
        """Start the scheduler"""
        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("Scheduler started")

    def shutdown(self):
        """Shutdown the scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Scheduler shutdown")


# Global scheduler instance
scheduler_service = SchedulerService()