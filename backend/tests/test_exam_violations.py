"""
Exam violation sustain engine and review workflow tests.
"""

import time

import pytest
from httpx import AsyncClient

from tests.conftest import auth


async def _setup_active_exam(client: AsyncClient, token: str, code: str = "EXV-101"):
    cr = await client.post(
        "/api/v1/courses",
        json={"code": code, "name": f"Violations {code}"},
        headers=auth(token),
    )
    assert cr.status_code in (200, 201), cr.text
    course = cr.json()
    er = await client.post(
        "/api/v1/exams",
        json={"course_id": course["id"], "room_name": "Hall B"},
        headers=auth(token),
    )
    assert er.status_code == 201, er.text
    exam = er.json()
    await client.post(f"/api/v1/exams/{exam['id']}/start", headers=auth(token))
    await client.post(f"/api/v1/exams/{exam['id']}/calibrate", headers=auth(token))
    return exam


def test_violation_engine_sustain_and_reset():
    from ml.exam_violation_engine import clear_exam, update

    clear_exam("exam-1")
    assert update("exam-1", "stu-1", "gaze_away", active=True, sustain_sec=0.1) is None
    time.sleep(0.15)
    evt = update("exam-1", "stu-1", "gaze_away", active=True, sustain_sec=0.1)
    assert evt is not None
    assert evt["violation_type"] == "gaze_away"
    assert evt["student_id"] == "stu-1"

    assert update("exam-1", "stu-1", "gaze_away", active=True, sustain_sec=0.1) is None

    update("exam-1", "stu-1", "gaze_away", active=False)
    time.sleep(2.1)
    clear_exam("exam-1")


@pytest.mark.asyncio
async def test_review_violation_not_found(client: AsyncClient, teacher_token: str):
    exam = await _setup_active_exam(client, teacher_token, "EXV-REVIEW")
    fake_id = "00000000-0000-0000-0000-000000000099"
    r = await client.put(
        f"/api/v1/exams/{exam['id']}/violations/{fake_id}/review",
        json={"review_status": "confirmed"},
        headers=auth(teacher_token),
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_list_violations_empty(client: AsyncClient, teacher_token: str):
    exam = await _setup_active_exam(client, teacher_token, "EXV-EMPTY")
    r = await client.get(
        f"/api/v1/exams/{exam['id']}/violations",
        headers=auth(teacher_token),
    )
    assert r.status_code == 200
    assert r.json() == []
