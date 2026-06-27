"""Unit tests for ml.attention_scorer — no GPU required."""

from __future__ import annotations

import sys
import os

# Ensure repo root on path
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from ml import attention_scorer as scorer


def test_forward_pose_scores_high():
    raw = scorer._pose_to_raw_score({"yaw": 0, "pitch": 0, "roll": 0})
    assert raw >= 95


def test_extreme_deviation_scores_low():
    raw = scorer._pose_to_raw_score({"yaw": 60, "pitch": 50, "roll": 0})
    assert raw <= 20


def test_none_pose_returns_neutral():
    assert scorer._pose_to_raw_score(None) == scorer._NEUTRAL_SCORE


def test_update_smoothing_isolates_students():
    scorer.clear_session("sess-a")
    s1 = scorer.update("sess-a", "stu-1", {"yaw": 0, "pitch": 0, "roll": 0})
    s2 = scorer.update("sess-a", "stu-2", {"yaw": 50, "pitch": 50, "roll": 0})
    assert s1 > s2
    assert scorer.get_score("sess-a", "stu-1") == s1


def test_get_score_level_thresholds():
    assert scorer.get_score_level(80) == "high"
    assert scorer.get_score_level(55) == "medium"
    assert scorer.get_score_level(20) == "low"


def test_should_persist_throttles_writes():
    scorer.clear_session("sess-b")
    scorer.update("sess-b", "stu-x", {"yaw": 0, "pitch": 0, "roll": 0})
    assert scorer.should_persist("sess-b", "stu-x") is True
    assert scorer.should_persist("sess-b", "stu-x") is False
