from __future__ import annotations

import datetime

import pytest

VALID_PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n"
    b"\x00\x00\x00\rIHDR"
    b"\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00"
    b"\x90wS\xde"
    b"\x00\x00\x00\x0cIDAT\x08\xd7c\xf8\xff\xff?\x00\x05\xfe\x02\xfeA\x89\x8f\x99"
    b"\x00\x00\x00\x00IEND\xaeB`\x82"
)


@pytest.mark.anyio
async def test_register_student_success(async_client):
    img_bytes = VALID_PNG_BYTES
    resp = await async_client.post(
        "/api/v1/register",
        data={"student_id": "S100", "name": "Alice"},
        files={"image": ("face.png", img_bytes, "image/png")},
    )

    assert resp.status_code == 201
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["student_id"] == "S100"
    assert body["data"]["name"] == "Alice"


@pytest.mark.anyio
async def test_register_student_invalid_mime_rejected(async_client):
    fake_bytes = b"not-an-image"
    resp = await async_client.post(
        "/api/v1/register",
        data={"student_id": "S101", "name": "Bob"},
        files={"image": ("face.txt", fake_bytes, "text/plain")},
    )

    assert resp.status_code == 400
    body = resp.json()
    assert body["success"] is False
    assert body["code"] == "INVALID_IMAGE_MIME_TYPE"


@pytest.mark.anyio
async def test_mark_attendance_unknown_student_returns_404(async_client):
    now = datetime.datetime.now(datetime.timezone.utc)
    resp = await async_client.post(
        "/api/v1/mark-attendance",
        json={"student_id": "DOES_NOT_EXIST", "marked_at": now.isoformat()},
    )
    assert resp.status_code == 404
    body = resp.json()
    assert body["success"] is False
    assert body["code"] == "STUDENT_NOT_FOUND"


@pytest.mark.anyio
async def test_mark_attendance_dedupe(async_client):
    img_bytes = VALID_PNG_BYTES
    register = await async_client.post(
        "/api/v1/register",
        data={"student_id": "S102", "name": "Carol"},
        files={"image": ("face.png", img_bytes, "image/png")},
    )
    assert register.status_code == 201

    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {"student_id": "S102", "marked_at": now.isoformat()}

    first = await async_client.post("/api/v1/mark-attendance", json=payload)
    assert first.status_code == 200
    assert first.json()["data"]["already_marked"] is False

    second = await async_client.post("/api/v1/mark-attendance", json=payload)
    assert second.status_code == 200
    assert second.json()["data"]["already_marked"] is True


@pytest.mark.anyio
async def test_attendance_today_shape(async_client):
    img_bytes = VALID_PNG_BYTES
    await async_client.post(
        "/api/v1/register",
        data={"student_id": "S103", "name": "Dave"},
        files={"image": ("face.png", img_bytes, "image/png")},
    )
    now = datetime.datetime.now(datetime.timezone.utc)
    await async_client.post(
        "/api/v1/mark-attendance",
        json={"student_id": "S103", "marked_at": now.isoformat()},
    )

    resp = await async_client.get("/api/v1/attendance/today")
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert "items" in body["data"]
    assert any(item["student_id"] == "S103" for item in body["data"]["items"])
