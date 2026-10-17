import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class Mailer:
    def __init__(self):
        self.smtp_server = settings.SMTP_SERVER
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_tls = settings.SMTP_TLS
        self.teacher_email = settings.TEACHER_EMAIL

    def send_email(
        self,
        to_emails: List[str],
        subject: str,
        body: str,
        is_html: bool = False
    ) -> bool:
        """Send an email via SMTP"""
        if not self.smtp_server or not self.smtp_username or not self.smtp_password:
            logger.error("SMTP credentials not configured")
            return False

        try:
            msg = MIMEMultipart()
            msg['From'] = self.smtp_username
            msg['To'] = ", ".join(to_emails)
            msg['Subject'] = subject

            if is_html:
                msg.attach(MIMEText(body, 'html'))
            else:
                msg.attach(MIMEText(body, 'plain'))

            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            if self.smtp_tls:
                server.starttls()
            server.login(self.smtp_username, self.smtp_password)
            text = msg.as_string()
            server.sendmail(self.smtp_username, to_emails, text)
            server.quit()

            logger.info(f"Email sent to {to_emails}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False

    def send_attendance_report(self, recipient_emails: List[str], report_data: dict) -> bool:
        """Send attendance report via email"""
        subject = "Daily Attendance Report"
        body = f"""
        Hello,

        Please find the attendance report attached.

        Summary:
        - Total Students: {report_data.get('total_students', 0)}
        - Total Present: {report_data.get('total_present', 0)}
        - Attendance Percentage: {report_data.get('attendance_percentage', 0)}%

        Best regards,
        Smart Attendance System
        """
        # In a real implementation, we would attach the Excel file
        return self.send_email(recipient_emails, subject, body)

    def send_notification(self, recipient: str, message: str) -> bool:
        """Send a simple notification email"""
        return self.send_email([recipient], "Notification from Smart Attendance System", message)