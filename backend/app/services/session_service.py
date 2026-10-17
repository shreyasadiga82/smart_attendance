from datetime import datetime, time
from typing import Optional
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class SessionService:
    def __init__(self):
        self.morning_start = self._parse_time(settings.MORNING_SESSION_START)
        self.morning_end = self._parse_time(settings.MORNING_SESSION_END)
        self.afternoon_start = self._parse_time(settings.AFTERNOON_SESSION_START)
        self.afternoon_end = self._parse_time(settings.AFTERNOON_SESSION_END)

    def _parse_time(self, time_str: str) -> time:
        """Parse HH:MM string to time object"""
        try:
            hour, minute = map(int, time_str.split(':'))
            return time(hour, minute)
        except Exception as e:
            logger.error(f"Error parsing time {time_str}: {e}")
            # Return default times
            if "MORNING" in time_str.upper():
                return time(8, 0)
            else:
                return time(13, 0)

    def get_current_session(self) -> Optional[str]:
        """
        Get current session based on system time.
        Returns 'morning', 'afternoon', or None if outside sessions.
        """
        now = datetime.now().time()

        if self.morning_start <= now < self.morning_end:
            return "morning"
        elif self.afternoon_start <= now < self.afternoon_end:
            return "afternoon"
        else:
            return None

    def is_session_active(self) -> bool:
        """Check if any session is currently active"""
        return self.get_current_session() is not None

    def get_session_info(self) -> dict:
        """Get detailed session information"""
        now = datetime.now()
        current_session = self.get_current_session()

        info = {
            "current_session": current_session,
            "is_active": current_session is not None,
            "now": now.isoformat(),
            "morning_start": self.morning_start.isoformat(),
            "morning_end": self.morning_end.isoformat(),
            "afternoon_start": self.afternoon_start.isoformat(),
            "afternoon_end": self.afternoon_end.isoformat()
        }

        if current_session == "morning":
            info["time_until_end"] = (
                datetime.combine(now.date(), self.morning_end) - now
            ).total_seconds()
        elif current_session == "afternoon":
            info["time_until_end"] = (
                datetime.combine(now.date(), self.afternoon_end) - now
            ).total_seconds()

        return info