from datetime import datetime, timedelta, timezone
from typing import Optional
import secrets

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Simple in-process token blacklist (reset tokens only; for production use Redis)
_reset_tokens: dict[str, str] = {}  # token -> email
_blacklisted_jwt: set[str] = set()


# ── Password helpers ──────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT ───────────────────────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode a JWT. Raises JWTError on failure."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def blacklist_token(token: str) -> None:
    """Add a token to the in-memory blacklist (logout)."""
    _blacklisted_jwt.add(token)


def is_token_blacklisted(token: str) -> bool:
    return token in _blacklisted_jwt


# ── Password reset ────────────────────────────────────────────────────────────

def generate_reset_token(email: str) -> str:
    """Generate a secure 24-hour password-reset token."""
    token = secrets.token_urlsafe(32)
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    # Encode expiry alongside email
    payload = {"email": email, "exp": expire.isoformat()}
    signed = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    _reset_tokens[signed] = email
    return signed


def verify_reset_token(token: str) -> Optional[str]:
    """Return the email address if the token is valid, else None."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("email")
        return email
    except JWTError:
        return None


def consume_reset_token(token: str) -> None:
    """Invalidate a used reset token."""
    _reset_tokens.pop(token, None)


# ── DB helpers ────────────────────────────────────────────────────────────────

async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[User]:
    user = await get_user_by_email(db, email)
    if not user or not verify_password(password, user.password_hash):
        return None
    if not user.is_active:
        return None
    return user


# ── Email ─────────────────────────────────────────────────────────────────────

async def send_reset_email(email: str, token: str) -> None:
    """
    Send a password-reset email.
    If MAIL_USERNAME is not configured, log the link instead (dev mode).
    """
    reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"

    if not settings.MAIL_USERNAME:
        # Dev fallback — print to console
        print(f"\n[AUTH] Password reset link for {email}:\n  {reset_url}\n")
        return

    try:
        from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
        conf = ConnectionConfig(
            MAIL_USERNAME=settings.MAIL_USERNAME,
            MAIL_PASSWORD=settings.MAIL_PASSWORD,
            MAIL_FROM=settings.MAIL_FROM,
            MAIL_PORT=settings.MAIL_PORT,
            MAIL_SERVER=settings.MAIL_SERVER,
            MAIL_STARTTLS=settings.MAIL_TLS,
            MAIL_SSL_TLS=settings.MAIL_SSL,
            USE_CREDENTIALS=True,
        )
        message = MessageSchema(
            subject="Reset your Smart Attendance System password",
            recipients=[email],
            body=(
                f"<p>Click the link below to reset your password. "
                f"This link expires in 24 hours.</p>"
                f'<p><a href="{reset_url}">{reset_url}</a></p>'
            ),
            subtype="html",
        )
        fm = FastMail(conf)
        await fm.send_message(message)
    except Exception as exc:
        # Non-fatal: log the link so dev can still test the flow
        print(f"[AUTH] Email send failed ({exc}). Reset link: {reset_url}")
