"""
Export service — generate CSV and PDF attendance reports.
Both return bytes that can be wrapped in FastAPI StreamingResponse / Response.
"""

from __future__ import annotations
import csv
import io
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.report_service import get_attendance_summary


async def export_csv(
    db: AsyncSession,
    course_id: Optional[UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> bytes:
    """
    Generate a UTF-8 CSV with one row per session × student.
    Columns: Session ID, Course, Date, Student ID, Name, Roll No, Status, Confidence
    """
    from sqlalchemy import select
    from app.models.session import Session, SessionStatus
    from app.models.attendance import Attendance
    from app.models.student import Student
    from app.models.course import Course

    q = (
        select(Session, Course)
        .join(Course, Session.course_id == Course.id)
        .where(Session.status == SessionStatus.closed)
    )
    if course_id:
        q = q.where(Session.course_id == course_id)
    if start_date:
        q = q.where(Session.start_time >= start_date)
    if end_date:
        q = q.where(Session.start_time <= end_date)
    q = q.order_by(Session.start_time)

    sessions = (await db.execute(q)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        ["Session ID", "Course Code", "Course Name", "Date",
         "Student ID", "Student Name", "Roll No", "Status", "Confidence", "First Seen"]
    )

    for session, course in sessions:
        att_q = (
            select(Attendance, Student)
            .join(Student, Attendance.student_id == Student.id)
            .where(Attendance.session_id == session.id)
            .order_by(Student.name)
        )
        att_rows = (await db.execute(att_q)).all()
        for att, student in att_rows:
            writer.writerow([
                session.session_id,
                course.code,
                course.name,
                session.start_time.strftime("%Y-%m-%d %H:%M"),
                student.student_id,
                student.name,
                student.roll_no,
                att.status.value,
                f"{att.confidence:.3f}" if att.confidence is not None else "",
                att.first_seen.strftime("%H:%M:%S") if att.first_seen else "",
            ])

    return output.getvalue().encode("utf-8-sig")  # BOM for Excel compatibility


async def export_pdf(
    db: AsyncSession,
    course_id: Optional[UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> bytes:
    """Generate a PDF attendance report using ReportLab."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.enums import TA_CENTER, TA_LEFT

    summary = await get_attendance_summary(db, course_id, start_date, end_date)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    heading = ParagraphStyle("heading", parent=styles["Heading1"], alignment=TA_CENTER, fontSize=18)
    subheading = ParagraphStyle("sub", parent=styles["Normal"], alignment=TA_CENTER, fontSize=11,
                                textColor=colors.HexColor("#64748B"))
    label_style = ParagraphStyle("label", parent=styles["Normal"], fontSize=9,
                                 textColor=colors.HexColor("#475569"))

    story = []

    # Title
    story.append(Paragraph("Smart Attendance System", heading))
    story.append(Paragraph("Attendance Report", subheading))
    date_range = ""
    if start_date or end_date:
        s = start_date.strftime("%d %b %Y") if start_date else "—"
        e = end_date.strftime("%d %b %Y") if end_date else "—"
        date_range = f"Period: {s} to {e}"
    story.append(Paragraph(date_range or f"Generated: {datetime.now().strftime('%d %b %Y %H:%M')}",
                           subheading))
    story.append(Spacer(1, 0.5 * cm))

    # Summary stats table
    stats_data = [
        ["Total Sessions", "Avg Attendance", "Total Present", "Total Absent"],
        [
            str(summary["total_sessions"]),
            f"{summary['avg_attendance_pct']}%",
            str(summary["total_present"]),
            str(summary["total_absent"]),
        ],
    ]
    stats_table = Table(stats_data, colWidths=[4 * cm] * 4)
    stats_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E3A5F")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("FONTSIZE", (0, 1), (-1, 1), 14),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(stats_table)
    story.append(Spacer(1, 0.5 * cm))

    # Session table
    story.append(Paragraph("Session Summary", styles["Heading2"]))
    story.append(Spacer(1, 0.2 * cm))

    if summary["sessions"]:
        headers = ["Session ID", "Course", "Date", "Enrolled", "Present", "Absent", "Rate"]
        rows = [headers]
        for s in summary["sessions"]:
            rows.append([
                s["session_id"],
                s["course_code"],
                s["start_time"][:10],
                str(s["total_enrolled"]),
                str(s["total_present"]),
                str(s["total_absent"]),
                f"{s['attendance_pct']}%",
            ])

        avail_w = 17 * cm
        col_w = [3.5 * cm, 2.5 * cm, 2.5 * cm, 2 * cm, 2 * cm, 2 * cm, 2.5 * cm]
        tbl = Table(rows, colWidths=col_w)
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E3A5F")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(tbl)
    else:
        story.append(Paragraph("No sessions found for the selected filters.", label_style))

    story.append(Spacer(1, 1 * cm))
    story.append(Paragraph(
        f"Report generated on {datetime.now().strftime('%d %b %Y at %H:%M')} — Smart Attendance System",
        ParagraphStyle("footer", parent=styles["Normal"], fontSize=8,
                       textColor=colors.HexColor("#94A3B8"), alignment=TA_CENTER)
    ))

    doc.build(story)
    return buf.getvalue()
