from sqlalchemy.orm import Session
from app.models import Attendance, Student
from app.schemas import ReportRow, ReportData
from typing import List, Optional
from datetime import date, datetime, timedelta
import os
import json
import logging
from app.config import settings

logger = logging.getLogger(__name__)

# For Excel generation
try:
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter
    EXCEL_AVAILABLE = True
except ImportError:
    EXCEL_AVAILABLE = False
    logging.warning("openpyxl not installed. Excel export will not be available.")


class ReportService:
    def __init__(self, db_session: Session):
        self.db = db_session

    def generate_report(
        self,
        start_date: date,
        end_date: date,
        class_name: Optional[str] = None,
        session: Optional[str] = None,
        status: Optional[str] = None
    ) -> ReportData:
        """Generate report data for the given filters"""
        query = self.db.query(Attendance).join(Student)
        query = query.filter(Attendance.date >= start_date)
        query = query.filter(Attendance.date <= end_date)

        if class_name:
            query = query.filter(Student.class_name == class_name)
        if session:
            query = query.filter(Attendance.session == session)
        # Note: status filter is a bit tricky since we only have present records
        # For now, we'll ignore status filter as we only store present records
        # In a more complete system, we would have absent records too

        attendance_records = query.all()

        # Group by student and date to get daily attendance
        # We'll create a matrix of student -> date -> sessions
        student_data = {}
        for record in attendance_records:
            st = getattr(record, 'student', None)
            if st is None:
                st = self.db.query(Student).filter(Student.id == record.student_id).first()
            roll_no = getattr(st, 'roll_no', str(record.student_id))
            name = getattr(st, 'name', f"Student {record.student_id}")
            c_name = getattr(st, 'class_name', "Default")
            key = (record.student_id, roll_no, name, c_name)
            if key not in student_data:
                student_data[key] = {}
            date_key = record.date.isoformat()
            if date_key not in student_data[key]:
                student_data[key][date_key] = set()
            student_data[key][date_key].add(record.session)

        # Convert to report rows
        rows: List[ReportRow] = []

        # Find students matching class filter to include absentees if available
        active_students = []
        try:
            query_st = self.db.query(Student)
            if class_name:
                query_st = query_st.filter(Student.class_name == class_name)
            active_students = query_st.all()
        except Exception:
            pass

        target_students = []
        for s in active_students:
            if isinstance(s, Student):
                target_students.append((s.id, s.roll_no, s.name, s.class_name))

        if not target_students:
            target_students = list(student_data.keys())

        delta_days = (end_date - start_date).days
        for (student_id, roll_no, name, class_name) in target_students:
            date_sessions = student_data.get((student_id, roll_no, name, class_name), {})
            for i in range(delta_days + 1):
                target_date = start_date + timedelta(days=i)
                date_key = target_date.isoformat()
                sessions_present = date_sessions.get(date_key, set())
                morning_present = "morning" in sessions_present
                afternoon_present = "afternoon" in sessions_present

                time_in = None
                if morning_present or afternoon_present:
                    day_records = [
                        r for r in attendance_records
                        if r.student_id == student_id and r.date == target_date
                    ]
                    if day_records:
                        earliest = min(day_records, key=lambda x: x.timestamp)
                        time_in = earliest.timestamp.strftime("%H:%M")

                rows.append(ReportRow(
                    roll_no=roll_no,
                    name=name,
                    class_name=class_name,
                    morning=morning_present,
                    afternoon=afternoon_present,
                    time_in=time_in
                ))

        # Always sort report rows by roll_no
        rows.sort(key=lambda r: (r.class_name, r.roll_no))

        # Calculate summary
        total_students = len(set((r.roll_no, r.name, r.class_name) for r in rows))
        total_days = delta_days + 1
        total_present_records = len(attendance_records)
        total_possible = total_students * total_days * 2  # Two sessions per day
        attendance_percentage = (total_present_records / total_possible * 100) if total_possible > 0 else 0

        summary = {
            "total_students": total_students,
            "total_days": total_days,
            "total_present_records": total_present_records,
            "total_possible_records": total_possible,
            "attendance_percentage": round(attendance_percentage, 2)
        }

        return ReportData(rows=rows, summary=summary)

    def export_to_excel(
        self,
        start_date: date,
        end_date: date,
        class_name: Optional[str] = None,
        session: Optional[str] = None,
        status: Optional[str] = None
    ) -> str:
        """Export report to formatted Excel file with styled header and red-highlighted absentees"""
        if not EXCEL_AVAILABLE:
            raise RuntimeError("openpyxl is not installed. Cannot export to Excel.")

        report_data = self.generate_report(start_date, end_date, class_name, session, status)

        wb = Workbook()
        ws = wb.active
        ws.title = "Attendance Report"

        # Styled header
        header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
        center_align = Alignment(horizontal="center", vertical="center")

        # Status cell styles
        present_fill = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
        present_font = Font(name="Segoe UI", size=10, color="166534", bold=True)

        absent_fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
        absent_font = Font(name="Segoe UI", size=10, color="991B1B", bold=True)

        regular_font = Font(name="Segoe UI", size=10)

        headers = ["Roll No", "Name", "Class", "Morning Session", "Afternoon Session", "Time In"]
        for col_idx, header in enumerate(headers, start=1):
            cell = ws.cell(row=1, column=col_idx, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = center_align

        for row_idx, report_row in enumerate(report_data.rows, start=2):
            c_roll = ws.cell(row=row_idx, column=1, value=report_row.roll_no)
            c_name = ws.cell(row=row_idx, column=2, value=report_row.name)
            c_class = ws.cell(row=row_idx, column=3, value=report_row.class_name)

            for c in (c_roll, c_name, c_class):
                c.font = regular_font
                c.alignment = Alignment(vertical="center")

            # Morning
            c_morn = ws.cell(row=row_idx, column=4, value="Present" if report_row.morning else "Absent")
            c_morn.alignment = center_align
            if report_row.morning:
                c_morn.fill = present_fill
                c_morn.font = present_font
            else:
                c_morn.fill = absent_fill
                c_morn.font = absent_font

            # Afternoon
            c_aft = ws.cell(row=row_idx, column=5, value="Present" if report_row.afternoon else "Absent")
            c_aft.alignment = center_align
            if report_row.afternoon:
                c_aft.fill = present_fill
                c_aft.font = present_font
            else:
                c_aft.fill = absent_fill
                c_aft.font = absent_font

            # Time In
            c_time = ws.cell(row=row_idx, column=6, value=report_row.time_in or "-")
            c_time.font = regular_font
            c_time.alignment = center_align

        # Auto-adjust column widths
        widths = [14, 25, 14, 18, 18, 14]
        for col_idx, w in enumerate(widths, start=1):
            ws.column_dimensions[get_column_letter(col_idx)].width = w

        os.makedirs(settings.REPORTS_DIR, exist_ok=True)
        filename = f"attendance_report_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}.xlsx"
        filepath = os.path.join(settings.REPORTS_DIR, filename)
        wb.save(filepath)

        logger.info(f"Excel report exported to {filepath}")
        return filepath

    def export_to_csv(
        self,
        start_date: date,
        end_date: date,
        class_name: Optional[str] = None,
        session: Optional[str] = None,
        status: Optional[str] = None
    ) -> str:
        """Export report to CSV file and return the file path"""
        # Generate report data
        report_data = self.generate_report(start_date, end_date, class_name, session, status)

        # Create CSV content
        csv_lines = []
        csv_lines.append("Roll No,Name,Class,Date,Session,Time In,Status")

        # We need to expand by date and session
        # This is simplified; in a real implementation, we would iterate through dates
        # For now, we'll just write the report rows as-is (which is per student per day)
        # But we don't have date in ReportRow, so we need to adjust

        # For demonstration, we'll create a simple CSV
        csv_lines.append("Roll No,Name,Class,Morning Present,Afternoon Present,Time In")
        for report_row in report_data.rows:
            csv_lines.append(
                f"{report_row.roll_no},{report_row.name},{report_row.class_name},"
                f"{report_row.morning},{report_row.afternoon},{report_row.time_in or ''}"
            )

        # Save the file
        os.makedirs(settings.REPORTS_DIR, exist_ok=True)
        filename = f"attendance_report_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}.csv"
        filepath = os.path.join(settings.REPORTS_DIR, filename)
        with open(filepath, 'w') as f:
            f.write('\n'.join(csv_lines))

        logger.info(f"CSV report exported to {filepath}")
        return filepath