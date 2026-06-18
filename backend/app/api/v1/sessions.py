"""
Session REST API + Real-Time Detection WebSocket

REST:
  POST   /sessions                    create session (pre-populates roster)
  GET    /sessions                    list sessions (filter by course/date)
  GET    /sessions/{id}               session details + roster
  PUT    /sessions/{id}/close         finalize session
  GET    /sessions/{id}/unknowns      unknown-face count for this session
  PUT    /attendance/{record_id}      manual attendance override

WebSocket:
  WS     /sessions/{id}/detect?token= real-time face recognition
         Frame payload:   { "type": "frame", "image": "<base64>" }
         Response:        { "faces": [...], "stats": {...} }
"""

from __future__ import annotations
import json
import logging
import sys
import os
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_db_session, get_current_user, require_role
from app.models.user import User, UserRole
from app.models.session import SessionStatus
from app.models.attendance import AttendanceStatus
from app.schemas.session import (
    SessionCreate,
    SessionResponse,
    SessionWithRosterResponse,
    AttendanceRecordResponse,
    SessionStats,
    ManualOverrideRequest,
    UnknownsResponse,
)
from app.services import session_service

logger = logging.getLogger(__name__)

router = APIRouter()

_require_teacher_or_admin = require_role(UserRole.teacher, UserRole.admin)

# Ensure ml/ is importable
_project_root = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..")
)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

try:
    from ml.face_encoder import get_embedding_from_base64
    from ml.face_matcher import FaceMatcher
    from ml.quality_validator import validate_base64

    _matcher = FaceMatcher(threshold=0.55)
    _ml_ready = True
    logger.info("Session WS: ML pipeline loaded OK")
except Exception as exc:
    _ml_ready = False
    _matcher = None
    logger.warning("Session WS: ML pipeline unavailable (%s)", exc)

# Alert service (always available — pure Python)
try:
    from app.services import alert_service as _alert_svc
    _alert_svc_ready = True
except Exception:
    _alert_svc = None
    _alert_svc_ready = False

# Attention pipeline (optional — degrades gracefully)
try:
    from ml import head_pose as _head_pose_mod
    from ml import attention_scorer as _attention_scorer
    from ml import posture_detector as _posture_detector
    _attention_ready = _head_pose_mod.HEAD_POSE_READY
    logger.info("Session WS: Attention pipeline loaded OK (head_pose=%s)", _attention_ready)
except Exception as _att_exc:
    _attention_ready = False
    _head_pose_mod = None
    _attention_scorer = None
    _posture_detector = None
    logger.warning("Session WS: Attention pipeline unavailable (%s)", _att_exc)


# ── Helper: build response objects ───────────────────────────────────────────

def _build_session_response(session, course=None) -> dict:
    return {
        "id": session.id,
        "session_id": session.session_id,
        "course_id": session.course_id,
        "course_name": course.name if course else None,
        "course_code": course.code if course else None,
        "status": session.status,
        "start_time": session.start_time,
        "end_time": session.end_time,
        "stats": {
            "total_enrolled": session.total_enrolled,
            "total_present": session.total_present,
            "total_absent": session.total_absent,
            "total_unknown": session.total_unknown,
        },
    }


def _build_roster_record(attendance, student) -> dict:
    return {
        "id": attendance.id,
        "session_id": attendance.session_id,
        "student_id": attendance.student_id,
        "student_name": student.name if student else None,
        "student_code": student.student_id if student else None,
        "roll_no": student.roll_no if student else None,
        "status": attendance.status,
        "confidence": attendance.confidence,
        "first_seen": attendance.first_seen,
        "marked_by": attendance.marked_by,
        "modified_at": attendance.modified_at,
        "override_reason": attendance.override_reason,
    }


# ── REST endpoints ────────────────────────────────────────────────────────────

@router.post("/sessions", response_model=SessionWithRosterResponse, status_code=201)
async def create_session(
    data: SessionCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(_require_teacher_or_admin),
):
    try:
        session = await session_service.create_session(db, data.course_id, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    roster_rows = await session_service.get_session_roster(db, session.id)

    # Eagerly load course for response
    from sqlalchemy import select
    from app.models.course import Course
    course_res = await db.execute(select(Course).where(Course.id == session.course_id))
    course = course_res.scalar_one_or_none()

    roster = [_build_roster_record(a, s) for a, s in roster_rows]

    return {
        **_build_session_response(session, course),
        "roster": roster,
    }


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(
    course_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import select
    from app.models.course import Course

    sessions = await session_service.get_sessions(db, course_id=course_id, skip=skip, limit=limit)
    result = []
    for session in sessions:
        course_res = await db.execute(select(Course).where(Course.id == session.course_id))
        course = course_res.scalar_one_or_none()
        result.append(_build_session_response(session, course))
    return result


@router.get("/sessions/{session_id}", response_model=SessionWithRosterResponse)
async def get_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import select
    from app.models.course import Course

    session = await session_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    course_res = await db.execute(select(Course).where(Course.id == session.course_id))
    course = course_res.scalar_one_or_none()

    roster_rows = await session_service.get_session_roster(db, session_id)
    roster = [_build_roster_record(a, s) for a, s in roster_rows]

    return {**_build_session_response(session, course), "roster": roster}


@router.put("/sessions/{session_id}/close", response_model=SessionResponse)
async def close_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(_require_teacher_or_admin),
):
    from sqlalchemy import select
    from app.models.course import Course

    try:
        session = await session_service.close_session(db, session_id, current_user)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    course_res = await db.execute(select(Course).where(Course.id == session.course_id))
    course = course_res.scalar_one_or_none()
    return _build_session_response(session, course)


@router.get("/sessions/{session_id}/unknowns", response_model=UnknownsResponse)
async def get_session_unknowns(
    session_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    session = await session_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return UnknownsResponse(
        session_id=session.id,
        total_unknown_detections=session.total_unknown,
        message=f"{session.total_unknown} unrecognized face(s) detected during this session.",
    )


@router.put("/attendance/{record_id}", response_model=AttendanceRecordResponse)
async def manual_override(
    record_id: UUID,
    body: ManualOverrideRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(_require_teacher_or_admin),
):
    from sqlalchemy import select
    from app.models.attendance import Attendance
    from app.models.student import Student

    try:
        record = await session_service.manual_override(
            db, record_id, body.status, body.reason, current_user
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    student_res = await db.execute(select(Student).where(Student.id == record.student_id))
    student = student_res.scalar_one_or_none()
    return _build_roster_record(record, student)


# ── WebSocket — Real-time recognition ────────────────────────────────────────

async def _ws_authenticate(token: Optional[str], db: AsyncSession) -> Optional[User]:
    """Validate a JWT token string (from WS query param) and return User or None."""
    if not token:
        return None
    from app.services.auth_service import is_token_blacklisted
    from app.config import settings
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


@router.websocket("/sessions/{session_id}/detect")
async def detect_websocket(
    websocket: WebSocket,
    session_id: UUID,
    token: Optional[str] = Query(None),
):
    """
    Real-time face detection + recognition WebSocket.

    Expected frame message:
        { "type": "frame", "image": "<base64 JPEG>" }

    Response per frame:
        {
          "faces": [
            {
              "x": float, "y": float, "width": float, "height": float,
              "confidence": float,
              "status": "Present" | "Unknown",
              "studentId": str | null,
              "studentName": str | null,
              "attendanceRecordId": str | null
            }
          ],
          "stats": { "present": int, "unknown": int }
        }
    """
    await websocket.accept()

    # --- Auth ---
    from app.models import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        user = await _ws_authenticate(token, db)
        if user is None:
            await websocket.send_text(json.dumps({"error": "Unauthorized"}))
            await websocket.close(code=4001)
            return

        session = await session_service.get_session(db, session_id)
        if session is None:
            await websocket.send_text(json.dumps({"error": "Session not found"}))
            await websocket.close(code=4004)
            return
        if session.status != SessionStatus.active:
            await websocket.send_text(json.dumps({"error": "Session is not active"}))
            await websocket.close(code=4000)
            return

        # Load roster embeddings into cache
        embeddings, meta = session_service.get_cached_roster(session_id)
        if not embeddings:
            await session_service.load_roster_cache(db, session)
            embeddings, meta = session_service.get_cached_roster(session_id)

    logger.info(
        "WS connected for session %s | %d enrolled embeddings | user=%s",
        session_id,
        len(embeddings),
        user.email,
    )

    unknown_batch_counter = 0  # debounce DB writes for unknowns

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            if msg.get("type") != "frame":
                continue

            b64_image = msg.get("image", "")
            if not b64_image:
                continue

            # ── Face detection (MediaPipe, fast) ──────────────────────────
            from app.services.ml_service import ml_service as _ml_svc
            raw_faces = _ml_svc.process_frame(b64_image)

            if not raw_faces:
                await websocket.send_text(json.dumps({"faces": [], "stats": {"present": 0, "unknown": 0}}))
                continue

            # ── Face recognition (FaceEncoder + FaceMatcher) ──────────────
            response_faces = []
            unknown_count = 0
            frame_alerts = []

            for face in raw_faces:
                face_result = {
                    "x": face["x"],
                    "y": face["y"],
                    "width": face["width"],
                    "height": face["height"],
                    "confidence": face["confidence"],
                    "status": "Unknown",
                    "studentId": None,
                    "studentName": None,
                    "attendanceRecordId": None,
                }

                if _ml_ready and embeddings:
                    embedding = get_embedding_from_base64(b64_image)
                    if embedding is not None:
                        matched_id, match_conf = _matcher.match(embedding, embeddings)
                        if matched_id:
                            info = meta.get(matched_id, {})
                            face_result["status"] = "Present"
                            face_result["studentId"] = info.get("student_code")
                            face_result["studentName"] = info.get("name")
                            face_result["recognitionConfidence"] = match_conf

                            # ── Attention scoring ──────────────────────────
                            attn_score = None
                            pose_result = None
                            posture_result = None
                            if _attention_ready and _head_pose_mod and _attention_scorer and _posture_detector:
                                pose_result = _head_pose_mod.estimate_from_base64(b64_image)
                                sid_str = str(session_id)
                                mid_str = matched_id
                                attn_score = _attention_scorer.update(sid_str, mid_str, pose_result)
                                posture_result = _posture_detector.detect(sid_str, mid_str, pose_result)

                                face_result["attentionScore"] = attn_score
                                face_result["headPose"] = pose_result
                                face_result["posture"] = posture_result.get("posture") if posture_result else None
                                face_result["postureFlagged"] = posture_result.get("flagged", False) if posture_result else False

                                # Throttled DB persist (every 30 recognised frames per student)
                                if _attention_scorer.should_persist(sid_str, mid_str):
                                    async with AsyncSessionLocal() as db_att:
                                        from app.services.attention_service import store_attention_log
                                        await store_attention_log(
                                            db_att,
                                            session_id,
                                            UUID(matched_id),
                                            attn_score,
                                            pose_result,
                                            posture_result.get("posture") if posture_result else None,
                                        )

                            # Idempotent mark present
                            async with AsyncSessionLocal() as db2:
                                await session_service.mark_present(
                                    db2,
                                    session_id,
                                    UUID(matched_id),
                                    match_conf,
                                )
                                # Get attendance record ID for manual override
                                from sqlalchemy import select
                                from app.models.attendance import Attendance
                                rec = await db2.execute(
                                    select(Attendance).where(
                                        Attendance.session_id == session_id,
                                        Attendance.student_id == UUID(matched_id),
                                    )
                                )
                                att = rec.scalar_one_or_none()
                                if att:
                                    face_result["attendanceRecordId"] = str(att.id)
                        else:
                            unknown_count += 1
                    else:
                        unknown_count += 1
                else:
                    unknown_count += 1

                response_faces.append(face_result)

            # Debounce unknown DB writes (every 10 unknowns)
            if unknown_count > 0:
                unknown_batch_counter += unknown_count
                if unknown_batch_counter >= 10:
                    async with AsyncSessionLocal() as db3:
                        for _ in range(unknown_batch_counter):
                            await session_service.increment_unknown(db3, session_id)
                    unknown_batch_counter = 0

            present_count = sum(1 for f in response_faces if f["status"] == "Present")

            # Class-level attention stats
            class_attention = 0.0
            if _attention_ready and _attention_scorer:
                class_attention = _attention_scorer.get_class_average(str(session_id))

            # ── Real-time low-engagement alerts ────────────────────────────
            frame_alerts = []
            if _alert_svc_ready and _alert_svc:
                for face in response_faces:
                    if face.get("status") != "Present":
                        continue
                    att_score = face.get("attentionScore")
                    if att_score is None:
                        continue
                    mid_str = None
                    # Reverse-lookup UUID from student_code
                    for student_uuid, m in meta.items():
                        if m.get("student_code") == face.get("studentId"):
                            mid_str = student_uuid
                            break
                    if not mid_str:
                        continue
                    should_alert = _alert_svc.check_low_engagement(
                        str(session_id), mid_str, att_score
                    )
                    if should_alert:
                        frame_alerts.append({
                            "student_name": face.get("studentName", "Unknown"),
                            "student_id": face.get("studentId"),
                            "attention_score": att_score,
                            "message": (
                                f"{face.get('studentName', 'A student')} has been disengaged "
                                f"for >5 minutes (score {att_score:.0f}/100)"
                            ),
                        })
                        # Log to DB
                        async with AsyncSessionLocal() as db_alert:
                            try:
                                await _alert_svc.log_low_engagement_alert(
                                    db_alert,
                                    UUID(mid_str),
                                    face.get("studentName", "Unknown"),
                                    att_score,
                                    str(session_id),
                                )
                            except Exception as _ae:
                                logger.warning("Alert log failed: %s", _ae)

            payload: dict = {
                "faces": response_faces,
                "stats": {
                    "present": present_count,
                    "unknown": unknown_count,
                    "class_attention": class_attention,
                },
            }
            if frame_alerts:
                payload["alerts"] = frame_alerts

            await websocket.send_text(json.dumps(payload))

    except WebSocketDisconnect:
        logger.info("WS disconnected for session %s", session_id)
    except Exception as exc:
        logger.error("WS error for session %s: %s", session_id, exc)
        try:
            await websocket.close()
        except Exception:
            pass
    finally:
        # Clear in-memory attention + posture + alert state for this session
        if _attention_scorer:
            _attention_scorer.clear_session(str(session_id))
        if _posture_detector:
            _posture_detector.clear_session(str(session_id))
        if _alert_svc_ready and _alert_svc:
            _alert_svc.reset_engagement_tracker(str(session_id))
