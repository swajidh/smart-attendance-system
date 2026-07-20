"""
Exam session lifecycle tests — create, start, calibrate, close, RBAC.
"""

import pytest
from httpx import AsyncClient

from tests.conftest import auth

pytestmark = pytest.mark.asyncio


async def _create_course(client: AsyncClient, token: str, code: str = "EXM-101") -> dict:
    r = await client.post(
        "/api/v1/courses",
        json={"code": code, "name": f"Exam Course {code}"},
        headers=auth(token),
    )
    assert r.status_code in (200, 201), r.text
    return r.json()


async def _create_exam(client: AsyncClient, token: str, course_id: str) -> dict:
    r = await client.post(
        "/api/v1/exams",
        json={"course_id": course_id, "room_name": "Hall A"},
        headers=auth(token),
    )
    assert r.status_code == 201, r.text
    return r.json()


async def test_create_exam_session(client: AsyncClient, teacher_token: str):
    course = await _create_course(client, teacher_token, "EXM-CREATE")
    exam = await _create_exam(client, teacher_token, course["id"])
    assert exam["status"] == "scheduled"
    assert exam["exam_code"].startswith("EXM-")
    assert exam["calibration_complete"] is False


async def test_start_exam_moves_to_calibrating(client: AsyncClient, teacher_token: str):
    course = await _create_course(client, teacher_token, "EXM-START")
    exam = await _create_exam(client, teacher_token, course["id"])
    r = await client.post(f"/api/v1/exams/{exam['id']}/start", headers=auth(teacher_token))
    assert r.status_code == 200
    assert r.json()["status"] == "calibrating"


async def test_finalize_calibration_without_samples_uses_defaults(
    client: AsyncClient, teacher_token: str
):
    course = await _create_course(client, teacher_token, "EXM-CAL")
    exam = await _create_exam(client, teacher_token, course["id"])
    await client.post(f"/api/v1/exams/{exam['id']}/start", headers=auth(teacher_token))
    r = await client.post(f"/api/v1/exams/{exam['id']}/calibrate", headers=auth(teacher_token))
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "active"
    assert data["calibration_complete"] is True


async def test_close_exam_session(client: AsyncClient, teacher_token: str):
    course = await _create_course(client, teacher_token, "EXM-CLOSE")
    exam = await _create_exam(client, teacher_token, course["id"])
    await client.post(f"/api/v1/exams/{exam['id']}/start", headers=auth(teacher_token))
    await client.post(f"/api/v1/exams/{exam['id']}/calibrate", headers=auth(teacher_token))
    r = await client.put(f"/api/v1/exams/{exam['id']}/close", headers=auth(teacher_token))
    assert r.status_code == 200
    assert r.json()["status"] == "closed"


async def test_exam_dashboard_kpis(client: AsyncClient, teacher_token: str):
    r = await client.get("/api/v1/exams/dashboard", headers=auth(teacher_token))
    assert r.status_code == 200
    data = r.json()
    assert "violations_7d" in data
    assert "pending_reviews" in data
    assert "active_exams" in data


async def test_create_exam_requires_permission(
    client: AsyncClient, teacher_token: str, counselor_token: str
):
    """Counselors can read violations but not create exam sessions."""
    course = await _create_course(client, teacher_token, "EXM-RBAC")
    r = await client.post(
        "/api/v1/exams",
        json={"course_id": course["id"], "room_name": "Hall"},
        headers=auth(counselor_token),
    )
    assert r.status_code == 403


async def test_list_exams_counselor_read_only(client: AsyncClient, teacher_token: str, counselor_token: str):
    course = await _create_course(client, teacher_token, "EXM-LIST")
    await _create_exam(client, teacher_token, course["id"])
    r = await client.get("/api/v1/exams", headers=auth(counselor_token))
    assert r.status_code == 200
    assert isinstance(r.json(), list)
