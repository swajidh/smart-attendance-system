from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/smart_attendance_db"

    # JWT
    SECRET_KEY: str = "change-me-to-a-random-64-char-string-before-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # File uploads
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Email
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "noreply@yourdomain.com"
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_PORT: int = 587
    MAIL_TLS: bool = True
    MAIL_SSL: bool = False

    FRONTEND_URL: str = "http://localhost:5173"

    # Staff self-registration (admin / teacher / counselor portal)
    STAFF_REGISTRATION_KEY: str = "AttendAI-Staff-2026"

    # Exam monitoring thresholds
    EXAM_GAZE_YAW_THRESHOLD: float = 28.0
    EXAM_GAZE_PITCH_UP_DELTA: float = 15.0
    EXAM_PHONE_CONFIDENCE: float = 0.30
    EXAM_SNAPSHOT_RETENTION_DAYS: int = 30

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


settings = Settings()
