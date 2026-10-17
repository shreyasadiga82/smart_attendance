import pytest
from datetime import date, datetime
from unittest.mock import MagicMock
from app.services.report_service import ReportService
from app.models import Attendance, Student


@pytest.fixture
def db_session():
    """Create a mock database session"""
    return MagicMock()


@pytest.fixture
def report_service(db_session):
    """Create a ReportService instance with mock DB"""
    return ReportService(db_session)


def test_generate_report_empty(db_session, report_service):
    """Test generating report with no attendance records"""
    # Setup
    db_session.query.return_value.join.return_value.filter.return_value.all.return_value = []

    # Execute
    start_date = date(2026, 10, 1)
    end_date = date(2026, 10, 7)
    result = report_service.generate_report(start_date, end_date)

    # Verify
    assert isinstance(result.rows, list)
    assert len(result.rows) == 0
    assert result.summary["total_students"] == 0
    assert result.summary["total_days"] == 7
    assert result.summary["total_present_records"] == 0
    assert result.summary["total_possible_records"] == 0
    assert result.summary["attendance_percentage"] == 0.0


def test_generate_report_with_data(db_session, report_service):
    """Test generating report with sample data"""
    # Setup mock data
    student1 = Student(id=1, roll_no="001", name="John Doe", class_name="10A")
    student2 = Student(id=2, roll_no="002", name="Jane Smith", class_name="10B")

    attendance1 = Attendance(
        id=1,
        student_id=1,
        date=date(2026, 10, 1),
        session="morning",
        timestamp=datetime(2026, 10, 1, 8, 30)
    )
    attendance1.student = student1

    attendance2 = Attendance(
        id=2,
        student_id=1,
        date=date(2026, 10, 1),
        session="afternoon",
        timestamp=datetime(2026, 10, 1, 13, 30)
    )
    attendance2.student = student1

    attendance3 = Attendance(
        id=3,
        student_id=2,
        date=date(2026, 10, 1),
        session="morning",
        timestamp=datetime(2026, 10, 1, 8, 45)
    )
    attendance3.student = student2

    # Mock the query to return our sample data
    mock_query = MagicMock()
    mock_query.join.return_value = mock_query
    mock_query.filter.return_value = mock_query
    mock_query.all.return_value = [attendance1, attendance2, attendance3]
    db_session.query.return_value = mock_query

    # Execute
    start_date = date(2026, 10, 1)
    end_date = date(2026, 10, 1)
    result = report_service.generate_report(start_date, end_date)

    # Verify
    assert len(result.rows) > 0
    # We should have 2 students * 1 day = 2 rows (but each row represents a student-day)
    # Actually, our current implementation creates one row per student per day
    # So we expect 2 rows
    assert len(result.rows) == 2
    # Verify rows are strictly sorted by roll number
    assert [r.roll_no for r in result.rows] == sorted([r.roll_no for r in result.rows])
    assert result.rows[0].roll_no == "001"
    assert result.rows[1].roll_no == "002"

    # Check that the summary is correct
    assert result.summary["total_students"] == 2
    assert result.summary["total_days"] == 1
    assert result.summary["total_present_records"] == 3  # Three attendance records
    assert result.summary["total_possible_records"] == 2 * 1 * 2  # 2 students * 1 day * 2 sessions
    assert result.summary["attendance_percentage"] == 75.0  # 3/4 * 100


def test_export_to_csv(db_session, report_service):
    """Test CSV export functionality"""
    # Setup mock data similar to above
    student1 = Student(id=1, roll_no="001", name="John Doe", class_name="10A")
    attendance1 = Attendance(
        id=1,
        student_id=1,
        date=date(2026, 10, 1),
        session="morning",
        timestamp=datetime(2026, 10, 1, 8, 30)
    )
    attendance1.student = student1

    mock_query = MagicMock()
    mock_query.join.return_value = mock_query
    mock_query.filter.return_value = mock_query
    mock_query.all.return_value = [attendance1]
    db_session.query.return_value = mock_query

    # Execute
    start_date = date(2026, 10, 1)
    end_date = date(2026, 10, 1)
    csv_path = report_service.export_to_csv(start_date, end_date)

    # Verify file was created (in real test, we'd check the content)
    assert csv_path.endswith(".csv")
    # In a real test, we would read the file and verify its content
    # For now, we just check that the method doesn't throw an exception