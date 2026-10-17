from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Attendance, Student, User
from app.schemas import ReportFilter, ReportRow, ReportData
from app.services.report_service import ReportService
from app.deps import get_current_active_user
from app.config import settings
from datetime import date
import os


router = APIRouter()


@router.get("/", response_model=ReportData)
async def read_report_get(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    class_name: Optional[str] = None,
    session: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not start_date:
        start_date = date.today().replace(day=1)
    if not end_date:
        end_date = date.today()

    report_service = ReportService(db)
    return report_service.generate_report(
        start_date=start_date,
        end_date=end_date,
        class_name=class_name,
        session=session,
        status=status
    )


@router.post("/", response_model=ReportData)
async def generate_report(
    report_filter: ReportFilter,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Set default date range if not provided
    if not report_filter.start_date:
        report_filter.start_date = date.today().replace(day=1)  # First day of current month
    if not report_filter.end_date:
        report_filter.end_date = date.today()

    report_service = ReportService(db)
    report_data = report_service.generate_report(
        start_date=report_filter.start_date,
        end_date=report_filter.end_date,
        class_name=report_filter.class_name,
        session=report_filter.session,
        status=report_filter.status
    )
    return report_data


@router.get("/export/excel")
async def export_excel(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    class_name: Optional[str] = None,
    session: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Set default date range if not provided
    if not start_date:
        start_date = date.today().replace(day=1)  # First day of current month
    if not end_date:
        end_date = date.today()

    report_service = ReportService(db)
    excel_path = report_service.export_to_excel(
        start_date=start_date,
        end_date=end_date,
        class_name=class_name,
        session=session,
        status=status
    )
    # Return the excel file for download
    from fastapi.responses import FileResponse
    return FileResponse(
        path=excel_path,
        filename="attendance_report.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@router.get("/export/csv")
async def export_csv(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    class_name: Optional[str] = None,
    session: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Set default date range if not provided
    if not start_date:
        start_date = date.today().replace(day=1)  # First day of current month
    if not end_date:
        end_date = date.today()

    report_service = ReportService(db)
    csv_path = report_service.export_to_csv(
        start_date=start_date,
        end_date=end_date,
        class_name=class_name,
        session=session,
        status=status
    )
    # Return the CSV file for download
    from fastapi.responses import FileResponse
    return FileResponse(
        path=csv_path,
        filename="attendance_report.csv",
        media_type="text/csv"
    )