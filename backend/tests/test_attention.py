"""API and service tests for attention logging and reports integration."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attention_log import AttentionLog
from app.models.session import Session, SessionStatus
from app.models.course import Course
from app.models.student import Student
from app.services import attention_service, report_service
from conftest import auth


@pytest.mark.asyncio
async def test_store_and_class_engagement(db_session: AsyncSession):
    course = Course(id=uuid4(), code="CS101", name="Intro CS")
    session = Session(
        id=uuid4(),
        session_id="SES-ATT-001",
        course_id=course.id,
        status=SessionStatus.closed,
        start_time=datetime.now(timezone.utc),
        total_enrolled=1,
        total_present=1,
    )
    student = Student(
        id=uuid4(),
        student_id="STU-ATT-001",
        name="Attention Test",
        roll_no="R-ATT-001",
    )
    db_session.add_all([course, session, student])
    await db_session.flush()

    await attention_service.store_attention_log(
        db_session, session.id, student.id, 85.0,
        head_pose={"yaw": 2, "pitch": 3, "roll": 0},
        posture="alert",
    )
    await attention_service.store_attention_log(
        db_session, session.id, student.id, 75.0,
    )

    result = await attention_service.get_class_engagement(db_session, session.id)
    assert result["class_average"] == 80.0
    assert len(result["students"]) == 1
    assert result["students"][0]["avg_score"] == 80.0


@pytest.mark.asyncio
async def test_dashboard_includes_avg_attention(db_session: AsyncSession):
    course = Course(id=uuid4(), code="CS102", name="Data Structures")
    session = Session(
        id=uuid4(),
        session_id="SES-ATT-002",
        course_id=course.id,
        status=SessionStatus.closed,
        start_time=datetime.now(timezone.utc),
        total_enrolled=1,
        total_present=1,
        avg_class_attention=65.0,
        attention_samples=10,
    )
    student = Student(
        id=uuid4(),
        student_id="STU-ATT-002",
        name="Dash Test",
        roll_no="R-ATT-002",
    )
    db_session.add_all([course, session, student])
    await db_session.flush()

    db_session.add(AttentionLog(
        id=uuid4(),
        session_id=session.id,
        student_id=student.id,
        score=65.0,
        timestamp=datetime.now(timezone.utc),
    ))
    await db_session.commit()

    summary = await report_service.get_dashboard_summary(db_session)
    assert "avg_attention" in summary
    assert summary["avg_attention"] >= 0


@pytest.mark.asyncio
async def test_counselor_cannot_read_out_of_batch_student_history(
    client: AsyncClient,
    admin_token: str,
    counselor_token: str,
):
    # Create student not in counselor batch
    await client.post("/api/v1/students", json={
        "name": "Outside Batch",
        "roll_no": "OUT-001",
        "student_id": "STU-OUT-001",
    }, headers=auth(admin_token))
    students = (await client.get("/api/v1/students", headers=auth(admin_token))).json()
    outside = next(s for s in students if s["student_id"] == "STU-OUT-001")

    resp = await client.get(
        f"/api/v1/attention/student/{outside['id']}/history",
        headers=auth(counselor_token),
    )
    assert resp.status_code == 403
