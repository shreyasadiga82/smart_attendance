from abc import ABC, abstractmethod
from typing import Optional
import logging
from app.config import settings
from app.models import NotificationLog
from sqlalchemy.orm import Session
from datetime import datetime

logger = logging.getLogger(__name__)


class Notifier(ABC):
    @abstractmethod
    def send_notification(
        self,
        recipient: str,
        message: str,
        db_session: Optional[Session] = None
    ) -> bool:
        """Send a notification. Returns True if successful, False otherwise."""
        pass


class ConsoleNotifier(Notifier):
    def send_notification(
        self,
        recipient: str,
        message: str,
        db_session: Optional[Session] = None
    ) -> bool:
        """Log notification to console"""
        logger.info(f"NOTIFICATION to {recipient}: {message}")
        # Also log to database if session provided
        if db_session:
            try:
                notification_log = NotificationLog(
                    recipient=recipient,
                    message=message,
                    provider="console",
                    status="sent"
                )
                db_session.add(notification_log)
                db_session.commit()
            except Exception as e:
                logger.error(f"Failed to log notification to DB: {e}")
        return True


class WhatsAppCloudNotifier(Notifier):
    def __init__(self):
        self.token = settings.WHATSAPP_TOKEN
        self.phone_number_id = settings.WHATSAPP_PHONE_NUMBER_ID
        self.api_url = f"https://graph.facebook.com/v17.0/{self.phone_number_id}/messages"

    def send_notification(
        self,
        recipient: str,
        message: str,
        db_session: Optional[Session] = None
    ) -> bool:
        """Send notification via WhatsApp Cloud API"""
        if not self.token or not self.phone_number_id:
            logger.error("WhatsApp credentials not configured")
            return False

        import requests
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        data = {
            "messaging_product": "whatsapp",
            "to": recipient,
            "type": "text",
            "text": {
                "body": message
            }
        }

        try:
            response = requests.post(self.api_url, headers=headers, json=data)
            response.raise_for_status()
            result = response.json()
            logger.info(f"WhatsApp notification sent: {result}")

            # Log to database
            if db_session:
                notification_log = NotificationLog(
                    recipient=recipient,
                    message=message,
                    provider="whatsapp",
                    status="sent"
                )
                db_session.add(notification_log)
                db_session.commit()
            return True
        except Exception as e:
            logger.error(f"Failed to send WhatsApp notification: {e}")
            # Log failure to database
            if db_session:
                notification_log = NotificationLog(
                    recipient=recipient,
                    message=message,
                    provider="whatsapp",
                    status="failed"
                )
                db_session.add(notification_log)
                db_session.commit()
            return False


class SMSNotifier(Notifier):
    def __init__(self):
        self.api_key = settings.FAST2SMS_API_KEY
        self.api_url = "https://www.fast2sms.com/dev/bulkV2"

    def send_notification(
        self,
        recipient: str,
        message: str,
        db_session: Optional[Session] = None
    ) -> bool:
        """Send notification via SMS (Fast2SMS)"""
        if not self.api_key:
            logger.error("Fast2SMS API key not configured")
            return False

        import requests
        headers = {
            "authorization": self.api_key,
            "Content-Type": "application/json"
        }
        data = {
            "sender_id": "FSTSMS",
            "message": message,
            "language": "english",
            "route": "q",
            "numbers": recipient
        }

        try:
            response = requests.post(self.api_url, headers=headers, json=data)
            response.raise_for_status()
            result = response.json()
            logger.info(f"SMS notification sent: {result}")

            # Log to database
            if db_session:
                notification_log = NotificationLog(
                    recipient=recipient,
                    message=message,
                    provider="sms",
                    status="sent"
                )
                db_session.add(notification_log)
                db_session.commit()
            return True
        except Exception as e:
            logger.error(f"Failed to send SMS notification: {e}")
            # Log failure to database
            if db_session:
                notification_log = NotificationLog(
                    recipient=recipient,
                    message=message,
                    provider="sms",
                    status="failed"
                )
                db_session.add(notification_log)
                db_session.commit()
            return False


def get_notifier() -> Notifier:
    """Factory function to get the appropriate notifier based on settings"""
    notifier_type = settings.NOTIFIER_TYPE.lower()
    if notifier_type == "whatsapp":
        return WhatsAppCloudNotifier()
    elif notifier_type == "sms":
        return SMSNotifier()
    else:
        # Default to console notifier
        return ConsoleNotifier()