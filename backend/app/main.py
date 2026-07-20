import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.api.v1.router import api_router

logger = logging.getLogger(__name__)

# ── Rate limiter (slowapi) ────────────────────────────────────────────────────
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    limiter = Limiter(key_func=get_remote_address)
    _RATE_LIMIT_AVAILABLE = True
except ImportError:
    limiter = None
    _RATE_LIMIT_AVAILABLE = False

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle handler."""
    logger.info("Starting Smart Attendance System API…")

    # Ensure upload directories exist
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "avatars"), exist_ok=True)
    os.makedirs(os.path.join(settings.UPLOAD_DIR, "exam_violations"), exist_ok=True)

    try:
        from ml.exam_object_detector import preload

        if preload():
            logger.info("Exam object detector (YOLO) preloaded")
        else:
            logger.warning("Exam object detector (YOLO) not available — phone/cheat-sheet detection disabled")
    except Exception as exc:
        logger.warning("Exam object detector preload failed: %s", exc)

    yield

    logger.info("Shutting down Smart Attendance System API.")


app = FastAPI(
    title="Smart Attendance System API",
    description=(
        "Real-time face recognition attendance tracking and "
        "behavioural attention monitoring system."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Attach rate limiter state and exception handler
if _RATE_LIMIT_AVAILABLE:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request ID middleware ─────────────────────────────────────────────────────
import uuid as _uuid


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(_uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


# ── Security headers ──────────────────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("X-XSS-Protection", "1; mode=block")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()"
    )
    # Strict-Transport-Security only over HTTPS
    if request.url.scheme == "https":
        response.headers.setdefault(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains"
        )
    return response


# ── Global exception handler ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s: %s", request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "request_id": getattr(request.state, "request_id", None)},
    )


# ── Static files (uploaded avatars, etc.) ────────────────────────────────────
_upload_dir = os.path.join(os.path.dirname(__file__), "..", settings.UPLOAD_DIR)
os.makedirs(_upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_upload_dir), name="uploads")

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["Health"])
async def root():
    return {"message": "Smart Attendance System API", "version": "1.0.0", "status": "online"}


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}
