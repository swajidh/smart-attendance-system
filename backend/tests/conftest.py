"""
Test harness for Smart Attendance System backend.

Strategy
--------
* Uses a dedicated PostgreSQL test database controlled by the env var
  TEST_DATABASE_URL (defaults to the dev DB with a `_test` suffix on the
  database name, so you never corrupt production data).
* Each test module gets a clean schema (all tables dropped + recreated in
  the session-scoped `test_engine` fixture).
* Each individual test runs inside a transaction that is ROLLED BACK on
  teardown — no stale data bleeds between tests.
* An `AsyncClient` (httpx) is wired to the FastAPI app with the
  `get_db_session` dependency overridden to use the test session.

Quick start
-----------
    # From backend/
    pip install -r requirements-test.txt
    TEST_DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/sas_test \
        pytest tests/ -v
"""

from __future__ import annotations

import os
import asyncio
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    AsyncEngine,
    create_async_engine,
    async_sessionmaker,
)

from app.main import app
from app.models import Base
from app.api.dependencies import get_db_session

# ─────────────────────────────────────────────────────────────────────────────
# Test database URL
# ─────────────────────────────────────────────────────────────────────────────
_DEFAULT_DEV_URL = (
    "postgresql+asyncpg://postgres:password@localhost:5432/smart_attendance_db"
)
_dev_url = os.getenv("DATABASE_URL", _DEFAULT_DEV_URL)
# Replace the DB name with sas_test by default
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    _dev_url.rsplit("/", 1)[0] + "/sas_test",
)


# ─────────────────────────────────────────────────────────────────────────────
# pytest-asyncio config (use the "auto" mode per-file via marker)
# ─────────────────────────────────────────────────────────────────────────────
pytest_plugins = ("pytest_asyncio",)


@pytest.fixture(scope="session")
def event_loop():
    """Single event loop shared across the whole test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ─────────────────────────────────────────────────────────────────────────────
# Database engine / schema
# ─────────────────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="session")
async def test_engine() -> AsyncGenerator[AsyncEngine, None]:
    """
    Create the test database schema once per session.
    Drop all tables at the end to leave the DB clean.
    """
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Teardown: drop all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine: AsyncEngine) -> AsyncGenerator[AsyncSession, None]:
    """
    Each test gets a DB session that is wrapped in a SAVEPOINT transaction.
    The transaction is rolled back at the end of each test so tests are
    completely isolated.
    """
    async with test_engine.connect() as conn:
        await conn.begin()
        nested = await conn.begin_nested()  # SAVEPOINT

        session_factory = async_sessionmaker(
            bind=conn,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
        async with session_factory() as session:
            yield session

        # Roll back to SAVEPOINT so state never persists
        await nested.rollback()
        await conn.rollback()


# ─────────────────────────────────────────────────────────────────────────────
# HTTP client
# ─────────────────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    HTTPX async client wired to the FastAPI app.
    The `get_db_session` dependency is overridden to use the test session.
    """

    async def _override_db():
        yield db_session

    app.dependency_overrides[get_db_session] = _override_db
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# ─────────────────────────────────────────────────────────────────────────────
# Convenience auth fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def admin_token(client: AsyncClient) -> str:
    """Register an admin user and return a Bearer token."""
    await client.post("/api/v1/auth/register", json={
        "email": "admin@test.local",
        "password": "Admin1234!",
        "full_name": "Test Admin",
        "role": "admin",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "admin@test.local",
        "password": "Admin1234!",
    })
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def teacher_token(client: AsyncClient) -> str:
    await client.post("/api/v1/auth/register", json={
        "email": "teacher@test.local",
        "password": "Teacher1234!",
        "full_name": "Test Teacher",
        "role": "teacher",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "teacher@test.local",
        "password": "Teacher1234!",
    })
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def student_token(client: AsyncClient) -> str:
    await client.post("/api/v1/auth/register", json={
        "email": "student@test.local",
        "password": "Student1234!",
        "full_name": "Test Student",
        "role": "student",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "student@test.local",
        "password": "Student1234!",
    })
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def auth(token: str) -> dict:
    """Return Authorization header dict for use in HTTPX requests."""
    return {"Authorization": f"Bearer {token}"}
