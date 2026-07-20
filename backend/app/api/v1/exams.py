"""
Exam monitoring REST API + WebSocket (hall/CCTV mode).
Separate from attendance sessions.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    get_db_session,
    require_exam_monitor,
    require_exam_reports_export,
    require_exam_sessions,
    require_exam_violations_read,
    require_exam_violations_review,
)
from app.config import settings
from app.core.permissions import Permission, user_has_permission
from app.models import AsyncSessionLocal
from app.models.exam_session import ExamSessionStatus
from app.models.user import User
from app.schemas.exam import (
    ExamCreateRequest,
    ExamDashboardResponse,
    ExamSessionResponse,
    ExamViolationReviewRequest,
)
from app.services import exam_service
from app.services.export_service import export_exam_pdf

logger = logging.getLogger(__name__)
router = APIRouter()

try:
    from ml.face_matcher import FaceMatcher
    from ml import exam_pipeline, exam_object_detector
    from ml.head_pose import HEAD_POSE_READY, decode_bgr_from_base64

    _matcher = FaceMatcher(threshold=0.45)
    _exam_ml_ready = True
except Exception as exc:
    _matcher = None
    _exam_ml_ready = False
    HEAD_POSE_READY = False
    exam_pipeline = None
    exam_object_detector = None
    decode_bgr_from_base64 = None
    logger.warning("Exam ML pipeline unavailable: %s", exc)


async def _ws_authenticate(token: Optional[str], db: AsyncSession) -> Optional[User]:
    if not token:
        return None
    from app.services.auth_service import is_token_blacklisted
    from jose import JWTError, jwt
    from sqlalchemy import select

    if is_token_blacklisted(token):
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
    except JWTError:
        return None
    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    return user if (user and user.is_active) else None


def _exam_response(exam) -> dict:
    return ExamSessionResponse.model_validate(exam).model_dump()


@router.get("/dashboard", response_model=ExamDashboardResponse)
async def exam_dashboard(
    batch_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_exam_violations_read),
):
    from app.services import batch_service

    scope = await batch_service.scope_for_user(db, current_user, batch_id)
    data = await exam_service.get_exam_dashboard(db, student_scope=scope)
    return ExamDashboardResponse(**data)


@router.post("", response_model=ExamSessionResponse, status_code=201)
async def create_exam(
    body: ExamCreateRequest,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_exam_sessions),
):
    try:
        exam = await exam_service.create_exam_session(db, body.course_id, body.room_name, user)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return _exam_response(exam)


@router.get("")
async def list_exams(
    course_id: Optional[UUID] = None,
    batch_id: Optional[UUID] = Query(None),
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_exam_violations_read),
):
    from app.services import batch_service

    scope = await batch_service.scope_for_user(db, current_user, batch_id)
    exams = await exam_service.list_exams(db, course_id, skip, limit, student_scope=scope)
    return [_exam_response(e) for e in exams]


@router.get("/{exam_id}", response_model=ExamSessionResponse)
async def get_exam_detail(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_exam_violations_read),
):
    from app.services import batch_service

    scope = await batch_service.scope_for_user(db, current_user)
    exam = await exam_service.get_exam(db, exam_id)
    if not exam or not await exam_service.exam_in_scope(db, exam, scope):
        raise HTTPException(status_code=404, detail="Exam not found")
    return _exam_response(exam)


@router.post("/{exam_id}/start", response_model=ExamSessionResponse)
async def start_exam(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    _: User = Depends(require_exam_sessions),
):
    try:
        exam = await exam_service.start_exam(db, exam_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _exam_response(exam)


@router.post("/{exam_id}/calibrate", response_model=ExamSessionResponse)
async def calibrate_exam(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    _: User = Depends(require_exam_sessions),
):
    try:
        exam = await exam_service.finalize_calibration(db, exam_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _exam_response(exam)


@router.put("/{exam_id}/close", response_model=ExamSessionResponse)
async def close_exam(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    _: User = Depends(require_exam_sessions),
):
    try:
        exam = await exam_service.close_exam_session(db, exam_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _exam_response(exam)


@router.get("/{exam_id}/violations")
async def list_exam_violations(
    exam_id: UUID,
    review_status: Optional[str] = None,
    batch_id: Optional[UUID] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_exam_violations_read),
):
    from app.services import batch_service

    scope = await batch_service.scope_for_user(db, current_user, batch_id)
    exam = await exam_service.get_exam(db, exam_id)
    if not exam or not await exam_service.exam_in_scope(db, exam, scope):
        raise HTTPException(status_code=404, detail="Exam not found")
    return await exam_service.list_violations(
        db, exam_id, review_status, skip, limit, student_scope=scope
    )


@router.put("/{exam_id}/violations/{violation_id}/review")
async def review_violation(
    exam_id: UUID,
    violation_id: UUID,
    body: ExamViolationReviewRequest,
    db: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_exam_violations_review),
):
    try:
        viol = await exam_service.review_violation(
            db, violation_id, body.review_status, body.review_note, user
        )
    except ValueError as e:
        raise HTTPException(status_code=400 if "Dismiss" in str(e) else 404, detail=str(e))
    if viol.exam_session_id != exam_id:
        raise HTTPException(status_code=404, detail="Violation not found for this exam")
    return {"id": viol.id, "review_status": viol.review_status.value}


@router.get("/{exam_id}/export/pdf")
async def export_exam_report_pdf(
    exam_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    _: User = Depends(require_exam_reports_export),
):
    exam = await exam_service.get_exam(db, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    pdf_bytes = await export_exam_pdf(db, exam_id)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="exam_{exam.exam_code}.pdf"'},
    )


@router.websocket("/{exam_id}/monitor")
async def exam_monitor_websocket(
    websocket: WebSocket,
    exam_id: UUID,
    token: Optional[str] = Query(None),
):
    await websocket.accept()

    async with AsyncSessionLocal() as db:
        user = await _ws_authenticate(token, db)
        if not user or not user_has_permission(user, Permission.exam_monitor):
            await websocket.close(code=4003, reason="Forbidden")
            return

        exam = await exam_service.get_exam(db, exam_id)
        if not exam:
            await websocket.close(code=4004, reason="Exam not found")
            return

        if exam.status not in (ExamSessionStatus.calibrating, ExamSessionStatus.active):
            await websocket.close(code=4000, reason="Exam not active or calibrating")
            return

        embeddings, meta = await exam_service.load_exam_roster_cache(db, exam)

    pipeline_ready = _exam_ml_ready and bool(_matcher)
    object_detection_ready = bool(
        exam_object_detector and exam_object_detector.is_ready()
    )
    pipeline_reason = None
    if not pipeline_ready:
        pipeline_reason = "ML pipeline unavailable"
    elif not object_detection_ready:
        pipeline_reason = (
            "Face/gaze ready but object detection (YOLO) unavailable — "
            "phone and cheat-sheet flags will not work. Install ultralytics and restart."
        )

    await websocket.send_json(
        {
            "type": "connected",
            "exam_code": exam.exam_code,
            "roster_size": len(meta),
            "recognition_profiles": len(embeddings),
            "calibrated": exam.calibration_complete,
            "status": exam.status.value,
            "pipeline_ready": pipeline_ready,
            "object_detection_ready": object_detection_ready,
            "pipeline_reason": pipeline_reason,
        }
    )

    frame_counter = 0
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type", "frame")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong", "monitoring": True})
                continue

            if msg_type == "refresh_roster":
                async with AsyncSessionLocal() as db:
                    exam = await exam_service.get_exam(db, exam_id)
                    if exam:
                        embeddings, meta = await exam_service.load_exam_roster_cache(db, exam)
                await websocket.send_json(
                    {"type": "roster_refreshed", "recognition_profiles": len(embeddings)}
                )
                continue

            if msg_type != "frame":
                continue

            b64_image = msg.get("image", "")
            if not pipeline_ready or not decode_bgr_from_base64:
                await websocket.send_json(
                    {
                        "type": "frame_result",
                        "faces": [],
                        "objects": [],
                        "violations_new": [],
                        "stats": {"frame": frame_counter, "monitoring": False},
                        "monitoring": False,
                    }
                )
                continue

            frame_counter += 1
            img_bgr = await asyncio.to_thread(decode_bgr_from_base64, b64_image)
            if img_bgr is None:
                continue

            async with AsyncSessionLocal() as db:
                exam = await exam_service.get_exam(db, exam_id)
                if not exam or exam.status not in (
                    ExamSessionStatus.calibrating,
                    ExamSessionStatus.active,
                ):
                    break

            calibrating = exam.status == ExamSessionStatus.calibrating
            result = await asyncio.to_thread(
                exam_pipeline.process_exam_frame,
                img_bgr,
                str(exam_id),
                embeddings,
                meta,
                _matcher,
                baseline_yaw=exam.baseline_yaw or 0.0,
                baseline_pitch=exam.baseline_pitch or 25.0,
                yaw_threshold=settings.EXAM_GAZE_YAW_THRESHOLD,
                pitch_up_delta=settings.EXAM_GAZE_PITCH_UP_DELTA,
                phone_confidence=settings.EXAM_PHONE_CONFIDENCE,
                calibrating=calibrating,
            )

            if calibrating and result.get("calibration_samples"):
                exam_service.append_calibration_samples(
                    str(exam_id), result["calibration_samples"]
                )

            violations_new = []
            if not calibrating and result.get("violations_new"):
                async with AsyncSessionLocal() as db:
                    exam = await exam_service.get_exam(db, exam_id)
                    if exam and exam.status == ExamSessionStatus.active:
                        for evt in result["violations_new"]:
                            viol = await exam_service.log_violation(db, exam, evt, img_bgr)
                            violations_new.append(
                                {
                                    "id": str(viol.id),
                                    "type": viol.violation_type.value,
                                    "student_name": evt.get("student_name"),
                                    "student_id": evt.get("student_id"),
                                    "severity": viol.severity.value,
                                    "message": viol.message,
                                    "snapshotUrl": f"/uploads/{viol.snapshot_path}"
                                    if viol.snapshot_path
                                    else None,
                                }
                            )

            await websocket.send_json(
                {
                    "type": "frame_result",
                    "faces": result.get("faces", []),
                    "objects": result.get("objects", []),
                    "violations_new": violations_new,
                    "stats": {
                        **result.get("stats", {}),
                        "frame": frame_counter,
                        "monitoring": True,
                    },
                    "monitoring": True,
                }
            )

    except WebSocketDisconnect:
        logger.info("Exam WS disconnected: %s", exam_id)
    except Exception as exc:
        logger.exception("Exam WS error: %s", exc)
    finally:
        if exam_pipeline:
            exam_pipeline.clear_exam_state(str(exam_id))
