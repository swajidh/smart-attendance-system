from __future__ import annotations

from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_ENV: Literal["development", "staging", "production"] = Field(default="development")
    LOG_LEVEL: str = Field(default="INFO")
    DATABASE_URL: str = Field(default="sqlite+aiosqlite:///./attendance.db")
    ALLOWED_ORIGINS: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    ATTENDANCE_DEDUPE_MINUTES: int = Field(default=5, ge=1)
    LIVENESS_ENABLED: bool = Field(default=False)

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
