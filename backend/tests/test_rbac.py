"""
RBAC enforcement tests — canonical permission matrix.
"""

import pytest
from httpx import AsyncClient

from tests.conftest import auth

pytestmark = pytest.mark.asyncio


async def test_counselor_cannot_create_session(client: AsyncClient, counselor_token: str):
    r = await client.post(
        "/api/v1/sessions",
        json={"course_id": "00000000-0000-0000-0000-000000000001"},
        headers=auth(counselor_token),
    )
    assert r.status_code == 403


async def test_counselor_cannot_create_student(client: AsyncClient, counselor_token: str):
    r = await client.post(
        "/api/v1/students",
        json={
            "student_id": "STU-RBAC-001",
            "name": "RBAC Test",
            "roll_no": "R001",
            "email": "rbac@test.local",
        },
        headers=auth(counselor_token),
    )
    assert r.status_code == 403


async def test_counselor_can_list_students(client: AsyncClient, counselor_token: str):
    r = await client.get("/api/v1/students", headers=auth(counselor_token))
    assert r.status_code == 200


async def test_counselor_can_read_reports_dashboard(client: AsyncClient, counselor_token: str):
    r = await client.get("/api/v1/reports/dashboard", headers=auth(counselor_token))
    assert r.status_code == 200


async def test_counselor_cannot_export_reports(client: AsyncClient, counselor_token: str):
    r = await client.get("/api/v1/reports/export/csv", headers=auth(counselor_token))
    assert r.status_code == 403


async def test_teacher_cannot_access_system_health(client: AsyncClient, teacher_token: str):
    r = await client.get("/api/v1/system/health", headers=auth(teacher_token))
    assert r.status_code == 403


async def test_student_cannot_access_dashboard_reports(client: AsyncClient, student_token: str):
    r = await client.get("/api/v1/reports/dashboard", headers=auth(student_token))
    assert r.status_code == 403


async def test_student_cannot_access_students_list(client: AsyncClient, student_token: str):
    r = await client.get("/api/v1/students", headers=auth(student_token))
    assert r.status_code == 403


async def test_teacher_can_create_student(client: AsyncClient, teacher_token: str):
    r = await client.post(
        "/api/v1/students",
        json={
            "student_id": "STU-RBAC-T01",
            "name": "Teacher Created",
            "roll_no": "T001",
            "email": "teacher-created@test.local",
        },
        headers=auth(teacher_token),
    )
    assert r.status_code == 201
