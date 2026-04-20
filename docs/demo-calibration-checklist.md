# Demo Calibration Checklist (Camera + Recognition)

Use this checklist before every live run.

---

## 1) Camera Setup

- [ ] Webcam selected correctly (`camera_index` verified).
- [ ] Lens is clean and unobstructed.
- [ ] Subject face occupies at least 20-30% of frame height.
- [ ] Background is stable and not overly cluttered.

## 2) Lighting Setup

- [ ] Front lighting is present (avoid strong backlight).
- [ ] No harsh shadows across the face.
- [ ] No rapid light flicker in the environment.
- [ ] White balance appears natural (skin tones not overly tinted).

## 3) Pose and Distance

- [ ] Subject faces camera with minimal head tilt.
- [ ] Enrollment pose and demo pose are reasonably similar.
- [ ] Distance is consistent with baseline image capture distance.
- [ ] Eyewear/cap changes are noted if different from baseline.

## 4) Recognition Threshold Tuning

- [ ] Similarity threshold confirmed for current environment.
- [ ] Similarity gap threshold confirmed to prevent ambiguous matches.
- [ ] Unknown test person remains `Unknown`.
- [ ] Known subject recognized consistently for at least 10 seconds.

## 5) Attendance Validation

- [ ] Recognized subject creates attendance record.
- [ ] Duplicate recognition within cooldown does not create duplicates.
- [ ] `attendance/today` endpoint reflects latest expected state.
