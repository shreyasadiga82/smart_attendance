import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class Mailer:
    def __init__(
        self,
        db: Optional[Session] = None,
        smtp_server: Optional[str] = None,
        smtp_port: Optional[int] = None,
        smtp_username: Optional[str] = None,
        smtp_password: Optional[str] = None,
        smtp_tls: Optional[bool] = None
    ):
        db_settings: Dict[str, Any] = {}
        if db is not None:
            try:
                from app.models import Settings as SettingsModel
                db_settings = {s.key: s.value for s in db.query(SettingsModel).all()}
            except Exception as e:
                logger.debug(f"Could not load settings from DB: {e}")

        self.smtp_server = (
            smtp_server or
            db_settings.get("smtp_server") or
            settings.SMTP_SERVER or
            "smtp.gmail.com"
        ).strip()

        port_val = smtp_port or db_settings.get("smtp_port") or settings.SMTP_PORT or 587
        try:
            self.smtp_port = int(port_val)
        except (ValueError, TypeError):
            self.smtp_port = 587

        self.smtp_username = (
            smtp_username or
            db_settings.get("smtp_username") or
            settings.SMTP_USERNAME or
            ""
        ).strip()

        self.smtp_password = (
            smtp_password or
            db_settings.get("smtp_password") or
            settings.SMTP_PASSWORD or
            ""
        ).strip()

        if smtp_tls is not None:
            self.smtp_tls = smtp_tls
        elif "smtp_tls" in db_settings:
            self.smtp_tls = db_settings.get("smtp_tls", "true").lower() in ("true", "1")
        else:
            self.smtp_tls = settings.SMTP_TLS

        self.teacher_email = db_settings.get("teacher_email") or settings.TEACHER_EMAIL or ""

    def test_connection(self, test_recipient: Optional[str] = None) -> Dict[str, Any]:
        """Test SMTP server connectivity and optionally dispatch a test email."""
        if not self.smtp_server:
            return {"success": False, "message": "SMTP Server host is missing (e.g. smtp.gmail.com)"}
        if not self.smtp_username:
            return {"success": False, "message": "Sender email address / username is missing"}
        if not self.smtp_password:
            return {"success": False, "message": "SMTP password or App Password is missing"}

        try:
            if self.smtp_port == 465:
                server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, timeout=10)
            else:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=10)
                if self.smtp_tls:
                    server.starttls()

            server.login(self.smtp_username, self.smtp_password)

            if test_recipient:
                msg = MIMEMultipart()
                msg['From'] = self.smtp_username
                msg['To'] = test_recipient
                msg['Subject'] = "Smart Attendance System - Test Email"
                body = (
                    f"Hello,\n\n"
                    f"This is a confirmation test email from your Smart Attendance System.\n"
                    f"Your email configuration ({self.smtp_username} via {self.smtp_server}:{self.smtp_port}) is working perfectly!\n\n"
                    f"Parent notifications will be dispatched from this address.\n"
                )
                msg.attach(MIMEText(body, 'plain'))
                server.sendmail(self.smtp_username, [test_recipient], msg.as_string())

            server.quit()
            return {
                "success": True,
                "message": f"Successfully connected to {self.smtp_server} as {self.smtp_username}!" +
                           (f" Test email delivered to {test_recipient}." if test_recipient else "")
            }
        except smtplib.SMTPAuthenticationError as auth_err:
            return {
                "success": False,
                "message": f"SMTP Authentication failed: Check your email and password. If using Gmail, you must generate a 16-character App Password (error: {auth_err})"
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"SMTP connection error: {str(e)}"
            }

    def send_email(
        self,
        to_emails: List[str],
        subject: str,
        body: str,
        is_html: bool = False
    ) -> bool:
        """Send an email via SMTP"""
        if not self.smtp_server or not self.smtp_username or not self.smtp_password:
            logger.warning("SMTP credentials not fully configured, email not sent")
            return False

        # Filter valid recipients
        valid_recipients = [e.strip() for e in to_emails if e and "@" in e]
        if not valid_recipients:
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg['From'] = f"Smart Attendance System <{self.smtp_username}>"
            msg['To'] = ", ".join(valid_recipients)
            msg['Subject'] = subject

            if is_html:
                msg.attach(MIMEText(body, 'html'))
            else:
                msg.attach(MIMEText(body, 'plain'))

            if self.smtp_port == 465:
                server = smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, timeout=12)
            else:
                server = smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=12)
                if self.smtp_tls:
                    server.starttls()

            server.login(self.smtp_username, self.smtp_password)
            text = msg.as_string()
            server.sendmail(self.smtp_username, valid_recipients, text)
            server.quit()

            logger.info(f"Email sent successfully to {valid_recipients}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {valid_recipients}: {e}")
            return False

    def send_parent_notification(
        self,
        parent_email: str,
        student_name: str,
        roll_no: str,
        session_name: str,
        timestamp_str: str,
        status: str = "Present",
        db_session: Optional[Session] = None
    ) -> bool:
        """Send formatted attendance notification directly to student's parent."""
        if not parent_email or "@" not in parent_email:
            return False

        subject = f"Attendance Alert: {student_name} is Marked {status}"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }}
            .container {{ max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }}
            .header {{ background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%); color: white; padding: 24px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em; }}
            .header p {{ margin: 6px 0 0; opacity: 0.9; font-size: 13px; }}
            .content {{ padding: 28px 24px; color: #1e293b; font-size: 14px; line-height: 1.6; }}
            .card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 18px 0; }}
            .row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #edf2f7; }}
            .row:last-child {{ border-bottom: none; }}
            .label {{ color: #64748b; font-weight: 500; font-size: 13px; }}
            .value {{ font-weight: 600; color: #0f172a; font-size: 13px; text-align: right; }}
            .status-badge {{ display: inline-block; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; padding: 4px 14px; border-radius: 9999px; font-weight: 700; font-size: 12px; letter-spacing: 0.05em; }}
            .footer {{ background: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Smart Attendance System</h1>
              <p>Institutional Biometric Notification</p>
            </div>
            <div class="content">
              <p style="margin-top: 0;">Dear Parent / Guardian,</p>
              <p>This is to inform you that your ward has been successfully marked present for today's session:</p>
              
              <div class="card">
                <div class="row">
                  <span class="label">Student Name:</span>
                  <span class="value">{student_name}</span>
                </div>
                <div class="row">
                  <span class="label">Roll Number:</span>
                  <span class="value">{roll_no}</span>
                </div>
                <div class="row">
                  <span class="label">Session:</span>
                  <span class="value" style="text-transform: capitalize;">{session_name} Session</span>
                </div>
                <div class="row">
                  <span class="label">Recorded Time:</span>
                  <span class="value">{timestamp_str}</span>
                </div>
                <div class="row">
                  <span class="label">Verification Security:</span>
                  <span class="value" style="color: #059669;">Facial Biometric & Live Eye Blink Verified</span>
                </div>
                <div class="row" style="margin-top: 10px; justify-content: center; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
                  <span class="status-badge">STATUS: {status.upper()}</span>
                </div>
              </div>

              <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
                This notification was sent automatically via camera facial recognition and anti-spoofing live eye verification.
              </p>
            </div>
            <div class="footer">
              Smart Attendance System • Institutional Biometric Security • Automatic Notification
            </div>
          </div>
        </body>
        </html>
        """

        plain_body = f"""
        Dear Parent / Guardian,

        Your ward {student_name} (Roll No: {roll_no}) has been marked {status.upper()} for the {session_name} session at {timestamp_str}.

        Verification: Facial Biometric & Live Eye Blink Verified
        
        Best regards,
        Smart Attendance System
        """

        success = self.send_email([parent_email], subject, html_body, is_html=True)
        if not success:
            success = self.send_email([parent_email], subject, plain_body, is_html=False)

        if db_session:
            try:
                from app.models import NotificationLog
                log_entry = NotificationLog(
                    recipient=parent_email,
                    message=f"Attendance {status} for {student_name} ({roll_no}) - {session_name} at {timestamp_str}",
                    provider="smtp_email",
                    status="sent" if success else "failed"
                )
                db_session.add(log_entry)
                db_session.commit()
            except Exception as e:
                logger.debug(f"Failed to write notification log: {e}")

        return success

    def send_attendance_report(self, recipient_emails: List[str], report_data: dict) -> bool:
        """Send attendance report via email"""
        subject = "Daily Attendance Report"
        body = f"""
        Hello,

        Please find the attendance summary below:

        - Total Students: {report_data.get('total_students', 0)}
        - Total Present: {report_data.get('total_present', 0)}
        - Attendance Percentage: {report_data.get('attendance_percentage', 0)}%

        Best regards,
        Smart Attendance System
        """
        return self.send_email(recipient_emails, subject, body)

    def send_notification(self, recipient: str, message: str) -> bool:
        """Send a simple notification email"""
        return self.send_email([recipient], "Notification from Smart Attendance System", message)