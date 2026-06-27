"""WebSocket smoke test for attention availability in live session detect."""

from __future__ import annotations

import pytest
from starlette.testclient import TestClient

from app.main import app
from conftest import auth


@pytest.mark.asyncio
async def test_ws_connected_includes_attention_available(
    client,
    admin_token: str,
    teacher_token: str,
):
    course_r = await client.post("/api/v1/courses", json={
        "code": "WS-ATT-101",
        "name": "WS Attention Test",
    }, headers=auth(admin_token))
    assert course_r.status_code == 201
    course_id = course_r.json()["id"]

    session_r = await client.post("/api/v1/sessions", json={
        "course_id": course_id,
    }, headers=auth(teacher_token))
    assert session_r.status_code == 201
    session_id = session_r.json()["id"]

    with TestClient(app) as tc:
        with tc.websocket_connect(
            f"/api/v1/sessions/{session_id}/detect?token={teacher_token}"
        ) as ws:
            msg = ws.receive_json()
            assert msg.get("type") == "connected"
            assert "attention_available" in msg

    await client.put(f"/api/v1/sessions/{session_id}/close", headers=auth(teacher_token))
