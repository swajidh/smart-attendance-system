"""
Tests for counselor batch assignment (CSV import, scoping, roster API).
"""

from __future__ import annotations

import io

import pytest
from httpx import AsyncClient

from conftest import auth
from app.config import settings

STAFF_KEY = settings.STAFF_REGISTRATION_KEY


BATCH_CSV = """intake_year,batch_code,counselor_email,student_id,roll_no,name,email,department
2026,A,counselor@test.local,STU-BATCH-001,R-B001,Batch Student One,bs1@test.local,CS
2026,A,counselor@test.local,STU-BATCH-002,R-B002,Batch Student Two,bs2@test.local,CS
2026,B,other@test.local,STU-BATCH-003,R-B003,Batch Student Three,bs3@test.local,CS
"""


@pytest.mark.asyncio
async def test_admin_csv_import_creates_batch_and_assigns_students(
    client: AsyncClient,
    admin_token: str,
    counselor_token: str,
):
    # Second counselor for batch B
    await client.post("/api/v1/auth/register/staff", json={
        "email": "other@test.local",
        "password": "Other1234!",
        "name": "Other Counselor",
        "role": "counselor",
        "staff_key": STAFF_KEY,
    })

    files = {"file": ("batches.csv", io.BytesIO(BATCH_CSV.encode()), "text/csv")}
    resp = await client.post(
        "/api/v1/batches/import-csv",
        files=files,
        headers=auth(admin_token),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["students_assigned"] == 3
    assert data["batches_created"] >= 1
    assert data["students_created"] == 3

    list_resp = await client.get("/api/v1/batches", headers=auth(admin_token))
    assert list_resp.status_code == 200
    batches = list_resp.json()
    assert len(batches) >= 2
    batch_a = next(b for b in batches if b["batch_code"] == "A")
    assert batch_a["student_count"] == 2


@pytest.mark.asyncio
async def test_counselor_mine_returns_only_own_batches(
    client: AsyncClient,
    admin_token: str,
    counselor_token: str,
):
    await client.post("/api/v1/auth/register/staff", json={
        "email": "other@test.local",
        "password": "Other1234!",
        "name": "Other Counselor",
        "role": "counselor",
        "staff_key": STAFF_KEY,
    })
    files = {"file": ("batches.csv", io.BytesIO(BATCH_CSV.encode()), "text/csv")}
    await client.post(
        "/api/v1/batches/import-csv",
        files=files,
        headers=auth(admin_token),
    )

    mine = await client.get("/api/v1/batches/mine", headers=auth(counselor_token))
    assert mine.status_code == 200
    batches = mine.json()
    assert len(batches) == 1
    assert batches[0]["batch_code"] == "A"
    assert batches[0]["student_count"] == 2


@pytest.mark.asyncio
async def test_counselor_students_scoped_to_batch(
    client: AsyncClient,
    admin_token: str,
    counselor_token: str,
    teacher_token: str,
):
    await client.post("/api/v1/auth/register/staff", json={
        "email": "other@test.local",
        "password": "Other1234!",
        "name": "Other Counselor",
        "role": "counselor",
        "staff_key": STAFF_KEY,
    })
    files = {"file": ("batches.csv", io.BytesIO(BATCH_CSV.encode()), "text/csv")}
    await client.post(
        "/api/v1/batches/import-csv",
        files=files,
        headers=auth(admin_token),
    )

    counselor_students = await client.get("/api/v1/students", headers=auth(counselor_token))
    assert counselor_students.status_code == 200
    c_ids = {s["student_id"] for s in counselor_students.json()}
    assert c_ids == {"STU-BATCH-001", "STU-BATCH-002"}

    teacher_students = await client.get("/api/v1/students", headers=auth(teacher_token))
    assert teacher_students.status_code == 200
    t_ids = {s["student_id"] for s in teacher_students.json()}
    assert "STU-BATCH-003" in t_ids
    assert len(t_ids) >= 3


@pytest.mark.asyncio
async def test_import_unknown_counselor_email_errors(
    client: AsyncClient,
    admin_token: str,
):
    csv = """intake_year,batch_code,counselor_email,student_id,roll_no,name,email,department
2026,X,nobody@test.local,STU-X-001,R-X001,Student X,sx@test.local,CS
"""
    files = {"file": ("bad.csv", io.BytesIO(csv.encode()), "text/csv")}
    resp = await client.post(
        "/api/v1/batches/import-csv",
        files=files,
        headers=auth(admin_token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["students_assigned"] == 0
    assert any("nobody@test.local" in e for e in data["errors"])


@pytest.mark.asyncio
async def test_student_reassign_to_new_batch(
    client: AsyncClient,
    admin_token: str,
    counselor_token: str,
):
    csv1 = """intake_year,batch_code,counselor_email,student_id,roll_no,name,email,department
2026,A,counselor@test.local,STU-REASSIGN,R-R001,Reassign Student,rs@test.local,CS
"""
    await client.post(
        "/api/v1/batches/import-csv",
        files={"file": ("b1.csv", io.BytesIO(csv1.encode()), "text/csv")},
        headers=auth(admin_token),
    )

    await client.post("/api/v1/auth/register/staff", json={
        "email": "other@test.local",
        "password": "Other1234!",
        "name": "Other Counselor",
        "role": "counselor",
        "staff_key": STAFF_KEY,
    })

    csv2 = """intake_year,batch_code,counselor_email,student_id,roll_no,name,email,department
2026,B,other@test.local,STU-REASSIGN,R-R001,Reassign Student,rs@test.local,CS
"""
    resp = await client.post(
        "/api/v1/batches/import-csv",
        files={"file": ("b2.csv", io.BytesIO(csv2.encode()), "text/csv")},
        headers=auth(admin_token),
    )
    assert resp.status_code == 200
    assert resp.json()["students_assigned"] == 1

    mine_a = await client.get("/api/v1/batches/mine", headers=auth(counselor_token))
    assert mine_a.json()[0]["student_count"] == 0

    other_login = await client.post("/api/v1/auth/login", json={
        "email": "other@test.local",
        "password": "Other1234!",
    })
    other_token = other_login.json()["access_token"]
    mine_b = await client.get("/api/v1/batches/mine", headers=auth(other_token))
    assert mine_b.json()[0]["student_count"] == 1
