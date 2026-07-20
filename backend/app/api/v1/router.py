from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.students import router as students_router
from app.api.v1.sessions import router as sessions_router
from app.api.v1.courses import router as courses_router
from app.api.v1.reports import router as reports_router
from app.api.v1.attention import router as attention_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.system import router as system_router
from app.api.v1.portal import router as portal_router
from app.api.v1.batches import router as batches_router
from app.api.v1.exams import router as exams_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_router.include_router(students_router)           # prefix: /students
api_router.include_router(courses_router)            # prefix: /courses
api_router.include_router(sessions_router, tags=["Sessions & Attendance"])
api_router.include_router(reports_router)            # prefix: /reports
api_router.include_router(attention_router)          # prefix: /attention
api_router.include_router(alerts_router)             # prefix: /alerts
api_router.include_router(system_router)             # prefix: /system
api_router.include_router(portal_router)             # prefix: /portal
api_router.include_router(batches_router)            # prefix: /batches
api_router.include_router(exams_router, prefix="/exams", tags=["Exam Monitoring"])
