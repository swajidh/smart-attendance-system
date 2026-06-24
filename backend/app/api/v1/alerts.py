"""
Alert & intervention endpoints.
Role-gated to teacher / counselor / admin.
"""

from __future__ import annotations
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db_session, get_current_user, require_role
from app.models.user import User, UserRole
from app.services import alert_service

router = APIRouter(prefix="/alerts", tags=["alerts"])

# All alert routes require at least teacher role
_STAFF = [Depends(require_role(UserRole.teacher, UserRole.admin, UserRole.counselor))]


# ── Schemas ───────────────────────────────────────────────────────────────────

class ThresholdRequest(BaseModel):
    course_id: str
    attention_threshold: Optional[float] = Field(None, ge=0, le=100)
    attendance_threshold: Optional[float] = Field(None, ge=0, le=100)


class NotifPrefsRequest(BaseModel):
    dashboard: Optional[bool] = None
    email: Optional[bool] = None
    frequency: Optional[str] = Field(None, pattern="^(immediate|hourly|daily)$")


# ── Alerts ────────────────────────────────────────────────────────────────────

@router.get("", dependencies=_STAFF)
async def list_alerts(
    student_id: Optional[UUID] = Query(None),
    alert_type: Optional[str] = Query(None),
    resolved: Optional[bool] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db_session),
):
    return await alert_service.get_alerts(db, student_id, alert_type, resolved, limit)


@router.put("/{alert_id}/resolve", dependencies=_STAFF)
async def resolve_alert(
    alert_id: UUID,
    db: AsyncSession = Depends(get_db_session),
):
    result = await alert_service.resolve_alert(db, alert_id)
    if not result:
        raise HTTPException(status_code=404, detail="Alert not found")
    return result


# ── Risk list ─────────────────────────────────────────────────────────────────

@router.get("/risk-list", dependencies=_STAFF)
async def risk_list(
    weeks: int = Query(4, ge=1, le=52),
    db: AsyncSession = Depends(get_db_session),
):
    return await alert_service.generate_risk_list(db, weeks)


# ── Thresholds ────────────────────────────────────────────────────────────────

@router.post("/thresholds", dependencies=_STAFF)
async def set_threshold(body: ThresholdRequest):
    return alert_service.set_threshold(
        body.course_id,
        attention=body.attention_threshold,
        attendance=body.attendance_threshold,
    )


@router.get("/thresholds", dependencies=_STAFF)
async def get_thresholds(course_id: Optional[str] = Query(None)):
    if course_id:
        return alert_service.get_threshold(course_id)
    return alert_service.get_all_thresholds()


# ── Notification preferences ──────────────────────────────────────────────────

@router.get("/notifications")
async def get_notif_prefs(current_user: User = Depends(get_current_user)):
    return alert_service.get_notification_prefs(str(current_user.id))


@router.put("/notifications")
async def set_notif_prefs(
    body: NotifPrefsRequest,
    current_user: User = Depends(get_current_user),
):
    return alert_service.set_notification_prefs(
        str(current_user.id),
        body.model_dump(exclude_none=True),
    )
