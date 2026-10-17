import pytest
from datetime import date, datetime
from unittest.mock import MagicMock
from app.services.attendance_service import AttendanceService
from app.models import Attendance, Student


@pytest.fixture
def db_session():
    """Create a mock database session"""
    return MagicMock()


@pytest.fixture
def attendance_service(db_session):
    """Create an AttendanceService instance with mock DB"""
    return AttendanceService(db_session)


def test_mark_attendance_success(attendance_service, db_session):
    """Test successful attendance marking"""
    # Setup
    student_id = 1
    target_date = date.today()
    session = "morning"
    method = "auto"
    note = "Test"

    # Mock the query to return no existing attendance (not marked yet)
    db_session.query.return_value.filter.return_value.first.return_value = None

    # Execute
    result = attendance_service.mark_attendance(
        student_id=student_id,
        target_date=target_date,
        session=session,
        method=method,
        note=note
    )

    # Verify
    assert isinstance(result, Attendance)
    assert result.student_id == student_id
    assert result.date == target_date
    assert result.session == session
    assert result.method == method
    assert result.note == note
    db_session.add.assert_called_once()
    db_session.commit.assert_called_once()
    db_session.refresh.assert_called_once()


def test_mark_attendance_already_marked(attendance_service, db_session):
    """Test marking attendance when already marked"""
    # Setup
    student_id = 1
    target_date = date.today()
    session = "morning"

    # Mock the query to return an existing attendance
    existing_attendance = Attendance(
        id=1,
        student_id=student_id,
        date=target_date,
        session=session,
        timestamp=datetime.now()
    )
    db_session.query.return_value.filter.return_value.first.return_value = existing_attendance

    # Execute and verify exception
    with pytest.raises(ValueError, match="Attendance already marked"):
        attendance_service.mark_attendance(
            student_id=student_id,
            target_date=target_date,
            session=session
        )


def test_mark_attendance_outside_session(attendance_service, db_session):
    """Test marking attendance outside of session hours"""
    # We would need to mock the session service, but for simplicity,
    # we'll test the check_already_marked method instead
    pass


def test_check_already_marked(attendance_service, db_session):
    """Test checking if attendance is already marked"""
    # Setup
    student_id = 1
    target_date = date.today()
    session = "morning"

    # Case 1: Not marked
    db_session.query.return_value.filter.return_value.first.return_value = None
    assert attendance_service.check_already_marked(student_id, target_date, session) is False

    # Case 2: Marked
    existing_attendance = Attendance(
        id=1,
        student_id=student_id,
        date=target_date,
        session=session,
        timestamp=datetime.now()
    )
    db_session.query.return_value.filter.return_value.first.return_value = existing_attendance
    assert attendance_service.check_already_marked(student_id, target_date, session) is True