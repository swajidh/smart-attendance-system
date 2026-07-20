"""
Exam WebSocket monitor — auth and payload shape smoke tests.
"""

import pytest
from httpx import AsyncClient
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.main import app
from tests.conftest import auth

pytestmark = pytest.mark.asyncio


async def _create_started_exam(client: AsyncClient, token: str, code: str = "EXWS-101") -> dict:
    cr = await client.post(
        "/api/v1/courses",
        json={"code": code, "name": "WS Course"},
        headers=auth(token),
    )
    assert cr.status_code in (200, 201), cr.text
    course = cr.json()
    er = await client.post(
        "/api/v1/exams",
        json={"course_id": course["id"], "room_name": "Hall WS"},
        headers=auth(token),
    )
    assert er.status_code == 201, er.text
    exam = er.json()
    await client.post(f"/api/v1/exams/{exam['id']}/start", headers=auth(token))
    return exam


async def test_exam_ws_rejects_missing_token(client: AsyncClient, teacher_token: str):
    exam = await _create_started_exam(client, teacher_token, "EXWS-NOAUTH")
    with TestClient(app) as tc:
        with pytest.raises(WebSocketDisconnect):
            with tc.websocket_connect(f"/api/v1/exams/{exam['id']}/monitor") as ws:
                ws.receive_json()


async def test_exam_ws_connected_payload(client: AsyncClient, teacher_token: str):
    exam = await _create_started_exam(client, teacher_token, "EXWS-OK")
    with TestClient(app) as tc:
        with tc.websocket_connect(
            f"/api/v1/exams/{exam['id']}/monitor?token={teacher_token}"
        ) as ws:
            msg = ws.receive_json()
            assert msg["type"] == "connected"
            assert msg["exam_code"] == exam["exam_code"]
            assert "roster_size" in msg
            assert "pipeline_ready" in msg
            ws.send_json({"type": "ping"})
            pong = ws.receive_json()
            assert pong["type"] == "pong"
