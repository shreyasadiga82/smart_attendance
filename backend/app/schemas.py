from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List
from datetime import date, datetime
from app.models import User, Student, Attendance


# User schemas
class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class UserInDBBase(UserBase):
    id: int
    is_active: bool
    is_admin: bool
    role: str = "teacher"
    created_at: datetime

    class Config:
        from_attributes = True
        orm_mode = True


class UserInDB(UserInDBBase):
    hashed_password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    role: Optional[str] = "admin"
    username: Optional[str] = None


class TokenData(BaseModel):
    username: Optional[str] = None


# Student schemas
class StudentBase(BaseModel):
    roll_no: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=100)
    class_name: str = Field(..., min_length=1, max_length=50)
    parent_phone: Optional[str] = Field(None, max_length=20)
    parent_email: Optional[EmailStr] = None


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    class_name: Optional[str] = Field(None, min_length=1, max_length=50)
    parent_phone: Optional[str] = Field(None, max_length=20)
    parent_email: Optional[EmailStr] = None


class StudentInDBBase(StudentBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    biometrics_count: int = 0
    is_enrolled: bool = False
    last_biometric_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        orm_mode = True


class StudentInDB(StudentInDBBase):
    pass


class StudentWithAvatar(StudentInDB):
    avatar_url: Optional[str] = None


class BiometricInfo(BaseModel):
    student_id: int
    roll_no: str
    name: str
    class_name: str
    biometrics_count: int
    is_enrolled: bool
    last_biometric_at: Optional[datetime] = None
    engine: Optional[str] = "insightface"
    dimension: Optional[int] = 512


class AddBiometricsRequest(BaseModel):
    images: List[str]


# Attendance schemas
class AttendanceBase(BaseModel):
    date: date
    session: str  # morning or afternoon
    method: str = "auto"
    note: Optional[str] = None


class AttendanceCreate(AttendanceBase):
    student_id: int


class AttendanceUpdate(BaseModel):
    method: Optional[str] = None
    note: Optional[str] = None


class AttendanceInDBBase(AttendanceBase):
    id: int
    student_id: int
    timestamp: datetime

    class Config:
        orm_mode = True


class AttendanceInDB(AttendanceInDBBase):
    pass


class AttendanceWithStudent(AttendanceInDB):
    student: StudentInDB


# Notification schemas
class NotificationLogBase(BaseModel):
    recipient: str
    message: str
    provider: str


class NotificationLogCreate(NotificationLogBase):
    pass


class NotificationLogInDBBase(NotificationLogBase):
    id: int
    status: str
    attempts: int
    created_at: datetime

    class Config:
        orm_mode = True


class NotificationLogInDB(NotificationLogInDBBase):
    pass


# Audit log schemas
class AuditLogBase(BaseModel):
    action: str
    details: Optional[str] = None


class AuditLogCreate(AuditLogBase):
    user_id: Optional[int] = None


class AuditLogInDBBase(AuditLogBase):
    id: int
    user_id: Optional[int] = None
    timestamp: datetime

    class Config:
        orm_mode = True


class AuditLogInDB(AuditLogInDBBase):
    pass


# Settings schemas
class SettingBase(BaseModel):
    key: str
    value: Optional[str] = None


class SettingCreate(SettingBase):
    pass


class SettingUpdate(BaseModel):
    value: Optional[str] = None


class SettingInDBBase(SettingBase):
    id: int
    updated_at: datetime

    class Config:
        orm_mode = True


class SettingInDB(SettingInDBBase):
    pass


# Dashboard schemas
class DashboardStats(BaseModel):
    present_count: int
    absent_count: int
    attendance_percentage: float
    current_session: Optional[str] = None
    morning_present: int
    afternoon_present: int


class RecentActivity(BaseModel):
    id: int
    student_name: str
    roll_no: str
    timestamp: datetime
    session: str
    status: str  # present, absent, late


class EdgeDeviceBase(BaseModel):
    name: str
    token: str

class EdgeDeviceInDB(EdgeDeviceBase):
    id: int
    last_seen: Optional[datetime] = None
    created_at: datetime

    class Config:
        orm_mode = True

class SystemStats(BaseModel):
    cpu_percent: float
    ram_percent: float
    cpu_temp: Optional[float] = None
    is_pi: bool

class DashboardData(BaseModel):
    stats: DashboardStats
    trend_data: List[dict]  # For chart
    session_donut_data: List[dict]  # For donut chart
    recent_activity: List[RecentActivity]
    edge_devices: Optional[List[EdgeDeviceInDB]] = None
    system_stats: Optional[SystemStats] = None


# Enrollment schemas
class EnrollmentStep1(BaseModel):
    roll_no: str
    name: str
    class_name: str
    parent_phone: Optional[str] = None
    parent_email: Optional[EmailStr] = None


class EnrollmentStep2(BaseModel):
    student_id: int
    images: List[str]  # base64 encoded images


class EnrollmentResponse(BaseModel):
    student_id: int
    message: str


# Report schemas
class ReportFilter(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    class_name: Optional[str] = None
    session: Optional[str] = None
    status: Optional[str] = None  # present, absent


class ReportRow(BaseModel):
    roll_no: str
    name: str
    class_name: str
    morning: bool
    afternoon: bool
    time_in: Optional[str] = None  # HH:MM format


class ReportData(BaseModel):
    rows: List[ReportRow]
    summary: dict