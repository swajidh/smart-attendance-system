"""
Attention tracking endpoints.
All routes require authentication.
"""

from __future__ import annotations
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db_session, get_current_user
from app.models.user import User
from app.services import attention_service

router = APIRouter(prefix="/attention", tags=["attention"])

_AUTH = [Depends(get_current_user)]


@router.get("/live", dependencies=_AUTH)
async def live_scores(session_id: UUID = Query(...)):
    """
    Return the current in-memory attention scores for all recognized students
    in an active session.  Updates with every WebSocket frame.
    """
    return attention_service.get_live_scores(str(session_id))


@router.get("/class-average", dependencies=_AUTH)
async def class_average(
    session_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Compute the average attention score per student from stored AttentionLog
    rows for the given session.
    """
    return await attention_service.get_class_engagement(db, session_id)


@router.get("/student/{student_id}/history", dependencies=_AUTH)
async def student_history(
    student_id: UUID,
    weeks: int = Query(4, ge=1, le=52),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Return a student's attention history over the last N weeks,
    with weekly averages and persistent-low-engagement flags.
    """
    return await attention_service.get_disengagement_history(db, student_id, weeks)


@router.get("/timeline", dependencies=_AUTH)
async def session_timeline(
    session_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Return a time-bucketed (2-min intervals) attention score timeline for a
    session — suitable for a Recharts LineChart.
    """
    return await attention_service.get_session_timeline(db, session_id)
