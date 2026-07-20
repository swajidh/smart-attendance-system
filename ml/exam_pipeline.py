"""
Exam monitoring pipeline — hall/CCTV multi-student frame processing.

Focus: enrolled-student gaze away, phones, cheat sheets (books), smartwatch heuristic.
Does NOT flag unknown faces or multiple faces — exam halls always have staff and
other people not in the roster.

Does NOT write attendance or attention scores.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def process_exam_frame(
    img_bgr,
    exam_id: str,
    embeddings: dict,
    meta: dict,
    matcher,
    baseline_yaw: float = 0.0,
    baseline_pitch: float = 25.0,
    yaw_threshold: float = 28.0,
    pitch_up_delta: float = 15.0,
    phone_confidence: float = 0.35,
    calibrating: bool = False,
) -> dict:
    """
    Process one BGR frame for exam hall monitoring.

    Returns:
        faces, objects, calibration_samples, violation_events, stats
    """
    from ml.face_detector import detect_faces_bgr
    from ml.head_pose import estimate_all_faces_with_meta, match_pose_to_bbox
    from ml.face_encoder import compute_live_probe_embedding
    from ml import exam_gaze, exam_object_detector, exam_hands, exam_violation_engine

    raw_faces = detect_faces_bgr(img_bgr) if img_bgr is not None else []
    poses_meta = estimate_all_faces_with_meta(img_bgr) if img_bgr is not None else []

    calibration_samples = []
    face_outputs = []
    violation_events = []
    matched_student_ids = set()

    single_face = len(raw_faces) == 1

    for face in raw_faces:
        pose = match_pose_to_bbox(
            face["x"], face["y"], face["width"], face["height"], poses_meta
        )
        out = {
            **face,
            "studentId": None,
            "studentName": None,
            "studentUuid": None,
            "recognitionConfidence": 0.0,
            "gazeStatus": "unknown",
            "headPose": pose,
        }

        matched_uuid = None
        if embeddings:
            embedding = compute_live_probe_embedding(
                _bgr_to_b64(img_bgr),
                face["x"],
                face["y"],
                face["width"],
                face["height"],
                single_face_in_frame=single_face,
            )
            if embedding is not None:
                matched_uuid, conf = matcher.match(embedding, embeddings)
                out["recognitionConfidence"] = conf
                if matched_uuid:
                    info = meta.get(matched_uuid, {})
                    out["studentId"] = info.get("student_code")
                    out["studentName"] = info.get("name")
                    out["studentUuid"] = matched_uuid
                    matched_student_ids.add(matched_uuid)

        if calibrating and pose and matched_uuid:
            calibration_samples.append(
                {"student_id": matched_uuid, "yaw": pose["yaw"], "pitch": pose["pitch"]}
            )

        if not calibrating and pose and matched_uuid:
            gaze = exam_gaze.evaluate_gaze(
                pose,
                baseline_yaw=baseline_yaw,
                baseline_pitch=baseline_pitch,
                yaw_threshold=yaw_threshold,
                pitch_up_delta=pitch_up_delta,
            )
            out["gazeStatus"] = gaze["status"]
            if gaze.get("violating"):
                evt = exam_violation_engine.update(exam_id, matched_uuid, "gaze_away", True)
                if evt:
                    evt["student_id"] = matched_uuid
                    evt["student_name"] = out.get("studentName")
                    evt["severity"] = "high"
                    evt["confidence"] = 0.85
                    evt["message"] = f"{out.get('studentName', 'Student')} looking away from paper"
                    evt["bbox"] = face
                    evt["metadata"] = gaze
                    violation_events.append(evt)
            else:
                exam_violation_engine.update(exam_id, matched_uuid, "gaze_away", False)
        elif not calibrating and matched_uuid:
            exam_violation_engine.update(exam_id, matched_uuid, "gaze_away", False)

        face_outputs.append(out)

    objects = []
    if not calibrating:
        objects, yolo_ran = exam_object_detector.detect_objects_bgr(
            img_bgr, min_confidence=phone_confidence
        )
        phone_active: set[str] = set()
        book_active: set[str] = set()

        if yolo_ran:
            for obj in objects:
                is_phone = obj["label"] == "cell phone"
                vtype = "phone_detected" if is_phone else "unauthorized_object"
                linked_sid = exam_object_detector.nearest_enrolled_face(obj, face_outputs)
                target_id = linked_sid or "hall"

                if is_phone:
                    phone_active.add(target_id)
                else:
                    book_active.add(target_id)

                evt = exam_violation_engine.update(exam_id, target_id, vtype, True)
                if evt:
                    name = meta.get(linked_sid, {}).get("name") if linked_sid else None
                    evt["student_id"] = linked_sid
                    evt["student_name"] = name
                    evt["severity"] = "critical" if is_phone else "high"
                    evt["confidence"] = obj["confidence"]
                    if is_phone:
                        evt["message"] = (
                            f"Cell phone detected near {name}"
                            if name
                            else "Cell phone detected in exam hall"
                        )
                    else:
                        evt["message"] = (
                            f"Unauthorized material (book/notes) near {name}"
                            if name
                            else "Unauthorized material detected in exam hall"
                        )
                    evt["bbox"] = obj
                    evt["metadata"] = {"object": obj["label"]}
                    violation_events.append(evt)

            exam_violation_engine.sync_active(exam_id, "phone_detected", phone_active)
            exam_violation_engine.sync_active(exam_id, "unauthorized_object", book_active)

        if exam_hands.is_ready():
            watch_active: set[str] = set()
            for suspect in exam_hands.detect_watch_suspect(img_bgr):
                linked_sid = exam_object_detector.nearest_enrolled_face(suspect, face_outputs)
                if not linked_sid:
                    continue
                watch_active.add(linked_sid)
                evt = exam_violation_engine.update(
                    exam_id, linked_sid, "smartwatch_suspected", True
                )
                if evt:
                    info = meta.get(linked_sid, {})
                    evt["student_id"] = linked_sid
                    evt["student_name"] = info.get("name")
                    evt["severity"] = "medium"
                    evt["confidence"] = 0.5
                    evt["message"] = f"Possible smartwatch near {info.get('name', 'student')} (suspected)"
                    evt["bbox"] = suspect
                    violation_events.append(evt)
            exam_violation_engine.sync_active(exam_id, "smartwatch_suspected", watch_active)

    return {
        "faces": face_outputs,
        "objects": objects,
        "calibration_samples": calibration_samples,
        "violations_new": violation_events,
        "stats": {
            "faces_detected": len(face_outputs),
            "students_recognized": len(matched_student_ids),
            "objects_detected": len(objects),
            "violations_this_frame": len(violation_events),
        },
    }


def _bgr_to_b64(img_bgr) -> str:
    import base64
    import cv2

    ok, buf = cv2.imencode(".jpg", img_bgr)
    if not ok:
        return ""
    return base64.b64encode(buf.tobytes()).decode("ascii")


def clear_exam_state(exam_id: str) -> None:
    from ml import exam_violation_engine

    exam_violation_engine.clear_exam(exam_id)
