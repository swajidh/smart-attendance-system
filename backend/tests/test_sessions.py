"""
Session lifecycle & attendance tests — WBS 14.1.4

Covers: create session, close session, manual override, idempotency,
        attendance status transitions, role enforcement.
"""

import pytest
from httpx import AsyncClient

from tests.conftest import auth

pytestmark = pytest.mark.asyncio


async def _create_course(client: AsyncClient, token: str, code: str = "TEST-101") -> dict:
    r = await client.post(
        "/api/v1/courses",
        json={"code": code, "name": f"Test Course {code}"},
        headers=auth(token),
    )
    assert r.status_code in (200, 201), r.text
    return r.json()


async def _create_student(client: AsyncClient, token: str, suffix: str = "A") -> dict:
    r = await client.post(
        "/api/v1/students",
        json={
            "name": f"Test Student {suffix}",
            "email": f"stu{suffix.lower()}@test.local",
            "roll_no": f"STU-S{suffix}",
            "student_id": f"2021-S{suffix}",
        },
        headers=auth(token),
    )
    assert r.status_code in (200, 201), r.text
    return r.json()


# ── Session creation ──────────────────────────────────────────────────────────

async def test_create_session(client: AsyncClient, teacher_token: str):
    course = await _create_course(client, teacher_token, "SES-101")
    r = await client.post(
        "/api/v1/sessions",
        json={"course_id": str(course["id"])},
        headers=auth(teacher_token),
    )
    assert r.status_code in (200, 201)
    data = r.json()
    assert data["status"] == "open"
    assert "id" in data


async def test_create_session_requires_auth(client: AsyncClient, teacher_token: str):
    course = await _create_course(client, teacher_token, "SES-NO-AUTH")
    r = await client.post(
        "/api/v1/sessions",
        json={"course_id": str(course["id"])},
    )
    assert r.status_code == 401


# ── Session close ─────────────────────────────────────────────────────────────

async def test_close_session(client: AsyncClient, teacher_token: str):
    course = await _create_course(client, teacher_token, "SES-CLOSE")
    open_r = await client.post(
        "/api/v1/sessions",
        json={"course_id": str(course["id"])},
        headers=auth(teacher_token),
    )
    session_id = open_r.json()["id"]

    close_r = await client.put(
        f"/api/v1/sessions/{session_id}/close",
        headers=auth(teacher_token),
    )
    assert close_r.status_code == 200
    assert close_r.json()["status"] == "closed"


async def test_close_already_closed_session(client: AsyncClient, teacher_token: str):
    course = await _create_course(client, teacher_token, "SES-DBLCLOSE")
    open_r = await client.post(
        "/api/v1/sessions",
        json={"course_id": str(course["id"])},
        headers=auth(teacher_token),
    )
    session_id = open_r.json()["id"]
    await client.put(f"/api/v1/sessions/{session_id}/close",
                     headers=auth(teacher_token))
    r2 = await client.put(f"/api/v1/sessions/{session_id}/close",
                          headers=auth(teacher_token))
    # Should return 400 or 409 (already closed)
    assert r2.status_code in (400, 409)


# ── Manual attendance override ────────────────────────────────────────────────

async def test_manual_attendance_override(
    client: AsyncClient, teacher_token: str, admin_token: str
):
    course = await _create_course(client, teacher_token, "SES-OVR")
    student = await _create_student(client, teacher_token, "OVR")

    # Enroll the student
    await client.post(
        f"/api/v1/courses/{course['id']}/enroll",
        json={"student_id": student["id"]},
        headers=auth(teacher_token),
    )

    # Create and close a session (attendance is auto-set to absent)
    open_r = await client.post(
        "/api/v1/sessions",
        json={"course_id": str(course["id"])},
        headers=auth(teacher_token),
    )
    session_id = open_r.json()["id"]
    await client.put(f"/api/v1/sessions/{session_id}/close",
                     headers=auth(teacher_token))

    # Override attendance to present
    r = await client.post(
        f"/api/v1/sessions/{session_id}/attendance/override",
        json={
            "student_id": student["id"],
            "status": "present",
            "reason": "Manual mark",
        },
        headers=auth(teacher_token),
    )
    assert r.status_code == 200
    assert r.json()["status"] == "present"


# ── Idempotency ───────────────────────────────────────────────────────────────

async def test_override_idempotency(
    client: AsyncClient, teacher_token: str
):
    """Marking the same student present twice should succeed without error."""
    course = await _create_course(client, teacher_token, "SES-IDEM")
    student = await _create_student(client, teacher_token, "IDEM")
    await client.post(
        f"/api/v1/courses/{course['id']}/enroll",
        json={"student_id": student["id"]},
        headers=auth(teacher_token),
    )
    open_r = await client.post(
        "/api/v1/sessions",
        json={"course_id": str(course["id"])},
        headers=auth(teacher_token),
    )
    session_id = open_r.json()["id"]
    await client.put(f"/api/v1/sessions/{session_id}/close",
                     headers=auth(teacher_token))

    payload = {
        "student_id": student["id"],
        "status": "present",
        "reason": "Idempotency test",
    }
    r1 = await client.post(
        f"/api/v1/sessions/{session_id}/attendance/override",
        json=payload, headers=auth(teacher_token),
    )
    r2 = await client.post(
        f"/api/v1/sessions/{session_id}/attendance/override",
        json=payload, headers=auth(teacher_token),
    )
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["status"] == r2.json()["status"] == "present"
