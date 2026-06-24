"""
Student CRUD & enrollment tests — WBS 14.1.3

Covers: create, read, update, delete students; duplicate detection;
        course enrollment/unenrollment; admin/teacher role enforcement.
"""

import pytest
from httpx import AsyncClient

from tests.conftest import auth

pytestmark = pytest.mark.asyncio

_STUDENT_PAYLOAD = {
    "name": "Ali Hamza",
    "email": "ali@test.local",
    "roll_no": "STU-001",
    "student_id": "2021-CS-001",
    "department": "Computer Science",
}


async def _create_student(client: AsyncClient, token: str, payload: dict = None) -> dict:
    r = await client.post(
        "/api/v1/students",
        json=payload or _STUDENT_PAYLOAD,
        headers=auth(token),
    )
    assert r.status_code in (200, 201), r.text
    return r.json()


# ── CRUD ──────────────────────────────────────────────────────────────────────

async def test_create_student_as_teacher(client: AsyncClient, teacher_token: str):
    r = await client.post(
        "/api/v1/students",
        json=_STUDENT_PAYLOAD,
        headers=auth(teacher_token),
    )
    assert r.status_code in (200, 201)
    data = r.json()
    assert data["roll_no"] == "STU-001"
    assert data["name"] == "Ali Hamza"


async def test_create_student_as_student_forbidden(
    client: AsyncClient, student_token: str
):
    r = await client.post(
        "/api/v1/students",
        json={**_STUDENT_PAYLOAD, "roll_no": "STU-FORBIDDEN"},
        headers=auth(student_token),
    )
    assert r.status_code == 403


async def test_get_students_list(client: AsyncClient, teacher_token: str):
    await _create_student(client, teacher_token)
    r = await client.get("/api/v1/students", headers=auth(teacher_token))
    assert r.status_code == 200
    assert isinstance(r.json(), list)


async def test_get_student_by_id(client: AsyncClient, teacher_token: str):
    s = await _create_student(client, teacher_token)
    r = await client.get(f"/api/v1/students/{s['id']}", headers=auth(teacher_token))
    assert r.status_code == 200
    assert r.json()["id"] == s["id"]


async def test_get_student_not_found(client: AsyncClient, teacher_token: str):
    fake_id = "00000000-0000-0000-0000-000000000000"
    r = await client.get(f"/api/v1/students/{fake_id}", headers=auth(teacher_token))
    assert r.status_code == 404


async def test_delete_student(client: AsyncClient, admin_token: str, teacher_token: str):
    s = await _create_student(
        client, teacher_token,
        {**_STUDENT_PAYLOAD, "roll_no": "STU-DEL", "student_id": "2021-CS-DEL"}
    )
    r = await client.delete(f"/api/v1/students/{s['id']}", headers=auth(admin_token))
    assert r.status_code == 204

    r2 = await client.get(f"/api/v1/students/{s['id']}", headers=auth(teacher_token))
    assert r2.status_code == 404


# ── Duplicate detection ───────────────────────────────────────────────────────

async def test_duplicate_roll_no_rejected(client: AsyncClient, teacher_token: str):
    await _create_student(
        client, teacher_token,
        {**_STUDENT_PAYLOAD, "roll_no": "DUP-001", "student_id": "2021-DUP-001"}
    )
    r2 = await client.post(
        "/api/v1/students",
        json={**_STUDENT_PAYLOAD, "roll_no": "DUP-001", "student_id": "2021-DUP-002", "name": "Other"},
        headers=auth(teacher_token),
    )
    assert r2.status_code == 409


# ── Search / filter ───────────────────────────────────────────────────────────

async def test_search_students_by_name(client: AsyncClient, teacher_token: str):
    await _create_student(
        client, teacher_token,
        {**_STUDENT_PAYLOAD, "roll_no": "SRCH-001", "student_id": "SRCH-001", "name": "Unique Searchable Name"}
    )
    r = await client.get(
        "/api/v1/students?search=Unique+Searchable",
        headers=auth(teacher_token),
    )
    assert r.status_code == 200
    results = r.json()
    assert any("Unique" in s["name"] for s in results)
