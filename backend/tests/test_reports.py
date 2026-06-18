"""
Report & export tests — WBS 14.1.5

Covers: dashboard summary, attendance summary, at-risk list,
        attendance trends, CSV/PDF export (content-type + headers).
"""

import pytest
from httpx import AsyncClient

from tests.conftest import auth

pytestmark = pytest.mark.asyncio


# ── Dashboard summary ─────────────────────────────────────────────────────────

async def test_dashboard_summary_authenticated(
    client: AsyncClient, teacher_token: str
):
    r = await client.get("/api/v1/reports/dashboard",
                         headers=auth(teacher_token))
    assert r.status_code == 200
    data = r.json()
    assert "total_students" in data
    assert "total_courses" in data
    assert "avg_attendance" in data


async def test_dashboard_summary_unauthenticated(client: AsyncClient):
    r = await client.get("/api/v1/reports/dashboard")
    assert r.status_code == 401


# ── Attendance summary ────────────────────────────────────────────────────────

async def test_attendance_summary(client: AsyncClient, teacher_token: str):
    r = await client.get("/api/v1/reports/attendance",
                         headers=auth(teacher_token))
    assert r.status_code == 200
    data = r.json()
    assert "total_sessions" in data
    assert "avg_attendance_pct" in data


async def test_attendance_summary_course_filter(
    client: AsyncClient, teacher_token: str
):
    """Filtering by a non-existent course should return empty but not error."""
    fake_id = "00000000-0000-0000-0000-000000000001"
    r = await client.get(
        f"/api/v1/reports/attendance?course_id={fake_id}",
        headers=auth(teacher_token),
    )
    assert r.status_code == 200
    assert r.json()["total_sessions"] == 0


# ── At-risk students ──────────────────────────────────────────────────────────

async def test_at_risk_list_empty_when_no_sessions(
    client: AsyncClient, teacher_token: str
):
    r = await client.get("/api/v1/reports/at-risk",
                         headers=auth(teacher_token))
    assert r.status_code == 200
    assert isinstance(r.json(), list)


async def test_at_risk_student_role_forbidden(
    client: AsyncClient, student_token: str
):
    r = await client.get("/api/v1/reports/at-risk",
                         headers=auth(student_token))
    assert r.status_code == 403


# ── Attendance trends ─────────────────────────────────────────────────────────

async def test_attendance_trends_weekly(client: AsyncClient, teacher_token: str):
    r = await client.get(
        "/api/v1/reports/trends?period=weekly",
        headers=auth(teacher_token),
    )
    assert r.status_code == 200
    assert isinstance(r.json(), list)


async def test_attendance_trends_invalid_period(
    client: AsyncClient, teacher_token: str
):
    r = await client.get(
        "/api/v1/reports/trends?period=yearly",
        headers=auth(teacher_token),
    )
    assert r.status_code == 422


# ── CSV export ────────────────────────────────────────────────────────────────

async def test_csv_export_content_type(client: AsyncClient, teacher_token: str):
    r = await client.get("/api/v1/reports/export/csv",
                         headers=auth(teacher_token))
    assert r.status_code == 200
    assert "text/csv" in r.headers.get("content-type", "")
    assert "attachment" in r.headers.get("content-disposition", "")


async def test_csv_export_requires_teacher(
    client: AsyncClient, student_token: str
):
    r = await client.get("/api/v1/reports/export/csv",
                         headers=auth(student_token))
    assert r.status_code == 403


# ── PDF export ────────────────────────────────────────────────────────────────

async def test_pdf_export_content_type(client: AsyncClient, teacher_token: str):
    r = await client.get("/api/v1/reports/export/pdf",
                         headers=auth(teacher_token))
    assert r.status_code == 200
    assert "application/pdf" in r.headers.get("content-type", "")


# ── Correlation ───────────────────────────────────────────────────────────────

async def test_correlation_batch_authenticated(
    client: AsyncClient, teacher_token: str
):
    r = await client.get("/api/v1/reports/correlation/batch",
                         headers=auth(teacher_token))
    assert r.status_code == 200
    assert isinstance(r.json(), list)
