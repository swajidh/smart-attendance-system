"""
Seed script — inserts default admin user on first run.

Usage:
    cd backend
    python -m app.seed
"""
import asyncio
import logging
import os

from sqlalchemy import select

from app.models import AsyncSessionLocal
from app.models.user import User, UserRole
from app.services.auth_service import hash_password

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(levelname)s — %(message)s")

DEFAULT_ADMIN = {
    "email": "admin@school.edu",
    "password": os.getenv("SEED_ADMIN_PASSWORD", "Admin@1234"),
    "name": "System Administrator",
    "role": UserRole.admin,
}


async def seed_admin() -> None:
    if os.getenv("SEED_ADMIN", "false").lower() not in ("1", "true", "yes"):
        logger.info("SEED_ADMIN not set — skipping default admin creation.")
        return
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == DEFAULT_ADMIN["email"]))
        existing = result.scalar_one_or_none()

        if existing:
            logger.info("Default admin already exists — skipping.")
            return

        admin = User(
            email=DEFAULT_ADMIN["email"],
            password_hash=hash_password(DEFAULT_ADMIN["password"]),
            name=DEFAULT_ADMIN["name"],
            role=DEFAULT_ADMIN["role"],
        )
        db.add(admin)
        await db.commit()
        logger.info("Default admin created: %s / %s", DEFAULT_ADMIN["email"], DEFAULT_ADMIN["password"])


if __name__ == "__main__":
    asyncio.run(seed_admin())
