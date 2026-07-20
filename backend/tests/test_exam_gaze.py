"""Unit tests for exam gaze baseline and threshold logic (no GPU)."""

from ml.exam_gaze import compute_baseline, evaluate_gaze


def test_compute_baseline_median():
    samples = [
        {"yaw": 2.0, "pitch": 30.0},
        {"yaw": 4.0, "pitch": 28.0},
        {"yaw": 0.0, "pitch": 32.0},
    ]
    base = compute_baseline(samples)
    assert base["sample_count"] == 3
    assert base["baseline_yaw"] == 2.0
    assert base["baseline_pitch"] == 30.0


def test_compute_baseline_empty_defaults():
    base = compute_baseline([])
    assert base["baseline_yaw"] == 0.0
    assert base["baseline_pitch"] == 25.0
    assert base["sample_count"] == 0


def test_evaluate_gaze_on_paper():
    pose = {"yaw": 1.0, "pitch": 28.0}
    result = evaluate_gaze(pose, baseline_yaw=0.0, baseline_pitch=25.0)
    assert result["status"] == "on_paper"
    assert result["violating"] is False


def test_evaluate_gaze_horizontal_away():
    pose = {"yaw": 35.0, "pitch": 25.0}
    result = evaluate_gaze(
        pose,
        baseline_yaw=0.0,
        baseline_pitch=25.0,
        yaw_threshold=28.0,
    )
    assert result["status"] == "away"
    assert "horizontal_away" in result["reason"]


def test_evaluate_gaze_looking_up():
    pose = {"yaw": 0.0, "pitch": 5.0}
    result = evaluate_gaze(
        pose,
        baseline_yaw=0.0,
        baseline_pitch=25.0,
        pitch_up_delta=15.0,
    )
    assert result["status"] == "away"
    assert "looking_up" in result["reason"]
