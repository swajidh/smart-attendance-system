from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


# Import all models so SQLAlchemy relationship strings resolve at mapper configure time.
from app.models.user import User  # noqa: E402, F401
from app.models.student import Student  # noqa: E402, F401
from app.models.course import Course  # noqa: E402, F401
from app.models.course_student import CourseStudent  # noqa: E402, F401
from app.models.session import Session  # noqa: E402, F401
from app.models.attendance import Attendance  # noqa: E402, F401
from app.models.attention_log import AttentionLog  # noqa: E402, F401
from app.models.alert import Alert  # noqa: E402, F401
from app.models.audit_log import AuditLog  # noqa: E402, F401
from app.models.counselor_batch import CounselorBatch  # noqa: E402, F401
from app.models.exam_session import ExamSession  # noqa: E402, F401
from app.models.exam_violation import ExamViolation  # noqa: E402, F401
from app.models.exam_calibration import ExamCalibration  # noqa: E402, F401


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
