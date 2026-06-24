"""
Authentication & user-management tests — WBS 14.1.2

Covers: register, login, JWT validation, /auth/me, role enforcement,
        duplicate email, admin user-management endpoints.
"""

import pytest
from httpx import AsyncClient

from tests.conftest import auth

pytestmark = pytest.mark.asyncio


# ── Registration ──────────────────────────────────────────────────────────────

async def test_register_success(client: AsyncClient):
    r = await client.post("/api/v1/auth/register", json={
        "email": "new_user@test.local",
        "password": "Secure123!",
        "full_name": "New User",
    })
    assert r.status_code == 201
    data = r.json()
    assert data["email"] == "new_user@test.local"
    assert "password" not in data


async def test_register_duplicate_email(client: AsyncClient):
    payload = {"email": "dup@test.local", "password": "Pass1!", "full_name": "Dup"}
    await client.post("/api/v1/auth/register", json=payload)
    r2 = await client.post("/api/v1/auth/register", json=payload)
    assert r2.status_code == 409


async def test_register_invalid_email(client: AsyncClient):
    r = await client.post("/api/v1/auth/register", json={
        "email": "not-an-email",
        "password": "Pass1!",
        "full_name": "Bad Email",
    })
    assert r.status_code == 422


# ── Login ─────────────────────────────────────────────────────────────────────

async def test_login_success(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "login_ok@test.local",
        "password": "Login123!",
        "full_name": "Login Ok",
    })
    r = await client.post("/api/v1/auth/login", json={
        "email": "login_ok@test.local",
        "password": "Login123!",
    })
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "wrongpw@test.local",
        "password": "Correct1!",
        "full_name": "Wrong PW",
    })
    r = await client.post("/api/v1/auth/login", json={
        "email": "wrongpw@test.local",
        "password": "WrongPW99!",
    })
    assert r.status_code == 401


async def test_login_nonexistent_user(client: AsyncClient):
    r = await client.post("/api/v1/auth/login", json={
        "email": "ghost@test.local",
        "password": "NoSuchUser1!",
    })
    assert r.status_code == 401


# ── /auth/me ──────────────────────────────────────────────────────────────────

async def test_me_authenticated(client: AsyncClient, admin_token: str):
    r = await client.get("/api/v1/auth/me", headers=auth(admin_token))
    assert r.status_code == 200
    assert r.json()["email"] == "admin@test.local"


async def test_me_no_token(client: AsyncClient):
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401


async def test_me_invalid_token(client: AsyncClient):
    r = await client.get("/api/v1/auth/me",
                         headers={"Authorization": "Bearer invalid.jwt.token"})
    assert r.status_code == 401


# ── Role enforcement ──────────────────────────────────────────────────────────

async def test_admin_only_route_rejects_teacher(
    client: AsyncClient, teacher_token: str
):
    r = await client.get("/api/v1/auth/admin/users",
                         headers=auth(teacher_token))
    assert r.status_code == 403


async def test_admin_list_users(client: AsyncClient, admin_token: str):
    r = await client.get("/api/v1/auth/admin/users",
                         headers=auth(admin_token))
    assert r.status_code == 200
    assert isinstance(r.json(), list)


async def test_admin_update_role(client: AsyncClient, admin_token: str):
    # Create a user to update
    reg = await client.post("/api/v1/auth/register", json={
        "email": "rolechange@test.local",
        "password": "Role123!",
        "full_name": "Role Change",
    })
    user_id = reg.json()["id"]

    r = await client.put(
        f"/api/v1/auth/admin/users/{user_id}/role",
        json={"role": "teacher"},
        headers=auth(admin_token),
    )
    assert r.status_code == 200
    assert r.json()["role"] == "teacher"


# ── Logout ────────────────────────────────────────────────────────────────────

async def test_logout_blacklists_token(client: AsyncClient, teacher_token: str):
    # Logout
    r_out = await client.post("/api/v1/auth/logout",
                              headers=auth(teacher_token))
    assert r_out.status_code == 200

    # Token should now be rejected
    r_me = await client.get("/api/v1/auth/me",
                            headers=auth(teacher_token))
    assert r_me.status_code == 401
