from pydantic_settings import BaseSettings
from typing import Optional, Literal
from pydantic import model_validator
import os


class Settings(BaseSettings):
    # App settings
    APP_NAME: str = "Smart Attendance System"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Profile
    PROFILE: Literal["laptop", "pi3"] = "laptop"

    # SSL settings for HTTPS (needed for PWA on mobile)
    USE_SSL: bool = False
    SSL_KEYFILE: Optional[str] = None
    SSL_CERTFILE: Optional[str] = None

    # JWT and Admin settings
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ADMIN_PASSWORD: Optional[str] = "admin123"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database
    DATABASE_URL: str = "sqlite:///./data/attendance.db"

    # Face recognition (defaults set in model_validator based on PROFILE)
    FACE_ENGINE: Optional[str] = None
    STREAM_FPS: Optional[int] = None
    FRAME_WIDTH: Optional[int] = None
    DETECT_EVERY_N_FRAMES: Optional[int] = None
    MAX_FACES: Optional[int] = None
    RECOGNITION_THRESHOLD: Optional[float] = None
    FACE_MODEL_NAME: str = "buffalo_s"
    LIVENESS_CHECK: bool = True

    # Hardware/Edge settings
    LCD_MODE: Literal["parallel", "i2c"] = "parallel"
    LCD_RS_PIN: int = 25
    LCD_E_PIN: int = 24
    LCD_D4_PIN: int = 5
    LCD_D5_PIN: int = 6
    LCD_D6_PIN: int = 13
    LCD_D7_PIN: int = 19
    LCD_I2C_ADDR: int = 0x27

    PIN_LED_GREEN: int = 17
    PIN_LED_RED: int = 27
    PIN_BUZZER: int = 22
    PIN_BUTTON: int = 23

    # Session timings (24-hour format)
    MORNING_SESSION_START: str = "08:00"
    MORNING_SESSION_END: str = "09:30"
    AFTERNOON_SESSION_START: str = "13:00"
    AFTERNOON_SESSION_END: str = "14:00"

    # Notification settings
    NOTIFIER_TYPE: str = "console"  # console, whatsapp, sms, email
    WHATSAPP_TOKEN: Optional[str] = None
    WHATSAPP_PHONE_NUMBER_ID: Optional[str] = None
    FAST2SMS_API_KEY: Optional[str] = None
    TEACHER_EMAIL: Optional[str] = None
    SMTP_SERVER: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_TLS: bool = True

    # Auto-report settings
    AUTO_REPORT_ENABLED: bool = True
    AUTO_REPORT_TIME: str = "18:00"  # Daily at 6 PM
    AUTO_REPORT_RECIPIENTS: str = ""  # Comma-separated emails

    # Paths
    FACES_DIR: str = "./data/faces"
    REPORTS_DIR: str = "./data/reports"
    LOGS_DIR: str = "./data/logs"
    MODELS_DIR: str = "./data/models"

    @model_validator(mode="after")
    def set_profile_defaults(self):
        if self.PROFILE == "pi3":
            if self.FACE_ENGINE is None:
                self.FACE_ENGINE = "opencv_sface"
            if self.STREAM_FPS is None:
                self.STREAM_FPS = 2
            if self.FRAME_WIDTH is None:
                self.FRAME_WIDTH = 320
            if self.DETECT_EVERY_N_FRAMES is None:
                self.DETECT_EVERY_N_FRAMES = 3
            if self.MAX_FACES is None:
                self.MAX_FACES = 1
            if self.RECOGNITION_THRESHOLD is None:
                self.RECOGNITION_THRESHOLD = 0.363
        else:
            if self.FACE_ENGINE is None:
                self.FACE_ENGINE = "insightface"
            if self.STREAM_FPS is None:
                self.STREAM_FPS = 5
            if self.FRAME_WIDTH is None:
                self.FRAME_WIDTH = 640
            if self.DETECT_EVERY_N_FRAMES is None:
                self.DETECT_EVERY_N_FRAMES = 1
            if self.MAX_FACES is None:
                self.MAX_FACES = 5
            if self.RECOGNITION_THRESHOLD is None:
                self.RECOGNITION_THRESHOLD = 0.45
        return self

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()