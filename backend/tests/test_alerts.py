"""
Alert & intervention tests — WBS 14.1.6

Covers: alert logging (unit), threshold configuration (unit),
        low-engagement tracker (unit), risk-list endpoint,
        resolve endpoint, portal own-data scoping (Phase 9 security).
"""

import time
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import auth
from app.services.alert_service import (
    check_low_engagement,
    set_threshold,
    get_threshold,
    get_notification_prefs,
    set_notification_prefs,
    reset_engagement_tracker,
    DEFAULT_ATTENTION_THRESHOLD,
    _LOW_ENGAGEMENT_HOLD,
    _eng_tracker,
)

pytestmark = pytest.mark.asyncio


# ── Unit tests — alert_service (no DB needed) ─────────────────────────────────

def test_default_threshold():
    t = get_threshold("nonexistent-course")
    assert t["attention_threshold"] == DEFAULT_ATTENTION_THRESHOLD
    assert t["attendance_threshold"] == 75.0


def test_set_threshold():
    t = set_threshold("course-unit-1", attention=35.0, attendance=70.0)
    assert t["attention_threshold"] == 35.0
    assert t["attendance_threshold"] == 70.0
    # Fetch separately
    assert get_threshold("course-unit-1")["attention_threshold"] == 35.0


def test_check_low_engagement_no_immediate_fire():
    """Alert should not fire immediately; only after sustained low engagement."""
    reset_engagement_tracker("unit-sess")
    fired = check_low_engagement("unit-sess", "unit-stu", 20.0)
    assert not fired


def test_check_low_engagement_fires_after_hold(monkeypatch):
    """Simulate time passing beyond LOW_ENGAGEMENT_HOLD."""
    reset_engagement_tracker("time-sess")
    # First call — records the start time
    check_low_engagement("time-sess", "time-stu", 10.0)

    # Manually backdate the tracker entry to simulate elapsed time
    key = ("time-sess", "time-stu")
    _eng_tracker[key]["below_since"] = time.time() - (_LOW_ENGAGEMENT_HOLD + 1)

    fired = check_low_engagement("time-sess", "time-stu", 10.0)
    assert fired

    # Should not fire a second time without reset
    fired2 = check_low_engagement("time-sess", "time-stu", 10.0)
    assert not fired2


def test_check_low_engagement_clears_on_recovery():
    reset_engagement_tracker("rec-sess")
    check_low_engagement("rec-sess", "rec-stu", 20.0)
    assert ("rec-sess", "rec-stu") in _eng_tracker

    # Score goes above threshold — tracker should clear
    check_low_engagement("rec-sess", "rec-stu", 80.0)
    assert ("rec-sess", "rec-stu") not in _eng_tracker


def test_notification_prefs_default():
    prefs = get_notification_prefs("new-user-xyz")
    assert prefs["dashboard"] is True
    assert prefs["email"] is False
    assert prefs["frequency"] == "immediate"


def test_notification_prefs_update():
    set_notification_prefs("user-abc", {"email": True, "frequency": "daily"})
    p = get_notification_prefs("user-abc")
    assert p["email"] is True
    assert p["frequency"] == "daily"
    assert p["dashboard"] is True  # default unchanged


# ── API tests ────────────────────────────────────────────────────────────────

async def test_list_alerts_empty(client: AsyncClient, teacher_token: str):
    r = await client.get("/api/v1/alerts", headers=auth(teacher_token))
    assert r.status_code == 200
    assert isinstance(r.json(), list)


async def test_list_alerts_requires_staff(client: AsyncClient, student_token: str):
    r = await client.get("/api/v1/alerts", headers=auth(student_token))
    assert r.status_code == 403


async def test_set_threshold_api(client: AsyncClient, teacher_token: str):
    r = await client.post(
        "/api/v1/alerts/thresholds",
        json={"course_id": "api-course-1", "attention_threshold": 38.0},
        headers=auth(teacher_token),
    )
    assert r.status_code == 200
    assert r.json()["attention_threshold"] == 38.0


async def test_get_threshold_api(client: AsyncClient, teacher_token: str):
    await client.post(
        "/api/v1/alerts/thresholds",
        json={"course_id": "api-course-get", "attention_threshold": 42.0},
        headers=auth(teacher_token),
    )
    r = await client.get(
        "/api/v1/alerts/thresholds?course_id=api-course-get",
        headers=auth(teacher_token),
    )
    assert r.status_code == 200
    assert r.json()["attention_threshold"] == 42.0


async def test_risk_list_returns_list(client: AsyncClient, teacher_token: str):
    r = await client.get("/api/v1/alerts/risk-list", headers=auth(teacher_token))
    assert r.status_code == 200
    assert isinstance(r.json(), list)


async def test_resolve_nonexistent_alert(client: AsyncClient, teacher_token: str):
    fake_id = "00000000-0000-0000-0000-000000000000"
    r = await client.put(
        f"/api/v1/alerts/{fake_id}/resolve",
        headers=auth(teacher_token),
    )
    assert r.status_code == 404


async def test_notification_prefs_api(client: AsyncClient, teacher_token: str):
    r = await client.get("/api/v1/alerts/notifications",
                         headers=auth(teacher_token))
    assert r.status_code == 200

    r2 = await client.put(
        "/api/v1/alerts/notifications",
        json={"email": True, "frequency": "hourly"},
        headers=auth(teacher_token),
    )
    assert r2.status_code == 200
    assert r2.json()["email"] is True
    assert r2.json()["frequency"] == "hourly"


# ── Phase 9 security — portal own-data scoping ────────────────────────────────

async def test_portal_requires_student_role(client: AsyncClient, teacher_token: str):
    """Teachers must not access the student portal."""
    r = await client.get("/api/v1/portal/me", headers=auth(teacher_token))
    assert r.status_code == 403


async def test_portal_me_no_linked_student(client: AsyncClient, student_token: str):
    """Student with no linked Student record should get 404 not 500."""
    r = await client.get("/api/v1/portal/me", headers=auth(student_token))
    assert r.status_code == 404
    assert "linked" in r.json()["detail"].lower()
