"""
Course management API.

GET    /courses                         list all courses
POST   /courses                         create a course (admin/teacher)
GET    /courses/{id}                    get course details
PUT    /courses/{id}                    update course (admin/teacher)
DELETE /courses/{id}                    delete course (admin only)
GET    /courses/{id}/detail             detail + enrolled students + attendance stats
POST   /courses/{id}/enroll             enroll a student in a course
DELETE /courses/{id}/enroll/{sid}       remove a student from a course
"""

from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.dependencies import (
    get_db_session,
    require_manage_courses,
    require_courses_read,
    require_admin,
)
from app.models.user import User
from app.models.course import Course
from app.models.course_student import CourseStudent
from app.models.student import Student
from app.models.attendance import Attendance, AttendanceStatus
from app.models.session import Session, SessionStatus
from app.schemas.course import CourseCreate, CourseUpdate, CourseResponse, CourseEnrollRequest

router = APIRouter(prefix="/courses", tags=["courses"])


@router.get("", response_model=list[CourseResponse])
async def list_courses(
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_courses_read),
):
    result = await db.execute(select(Course).order_by(Course.code))
    return result.scalars().all()


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    data: CourseCreate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_manage_courses),
):
    # Check for duplicate code
    dup = await db.execute(select(Course).where(Course.code == data.code))
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Course code '{data.code}' already exists")

    course = Course(**data.model_dump(), instructor_id=current_user.id)
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course


@router.get("/{course_id}", response_model=CourseResponse)
async def get_course(
    course_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_courses_read),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.put("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: UUID,
    data: CourseUpdate,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_manage_courses),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(course, field, value)
    await db.commit()
    await db.refresh(course)
    return course


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_admin),
):
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    await db.delete(course)
    await db.commit()


@router.get("/{course_id}/detail")
async def get_course_detail(
    course_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_courses_read),
):
    """Full course detail: course info + enrolled students + per-student attendance stats."""
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Enrolled students
    enrollments = await db.execute(
        select(Student)
        .join(CourseStudent, Student.id == CourseStudent.student_id)
        .where(CourseStudent.course_id == course_id)
        .order_by(Student.name)
    )
    students = enrollments.scalars().all()

    # Attendance stats per student for this course
    total_sessions_q = await db.execute(
        select(func.count(Session.id))
        .where(Session.course_id == course_id, Session.status == SessionStatus.closed)
    )
    total_sessions = total_sessions_q.scalar() or 0

    student_stats = []
    for s in students:
        present_q = await db.execute(
            select(func.count(Attendance.id))
            .join(Session, Attendance.session_id == Session.id)
            .where(
                Attendance.student_id == s.id,
                Session.course_id == course_id,
                Attendance.status == AttendanceStatus.present,
                Session.status == SessionStatus.closed,
            )
        )
        present_count = present_q.scalar() or 0
        att_pct = round(present_count / total_sessions * 100, 1) if total_sessions else 0.0
        student_stats.append({
            "id": str(s.id),
            "name": s.name,
            "roll_no": s.roll_no,
            "department": s.department,
            "present": present_count,
            "absent": total_sessions - present_count,
            "attendance_pct": att_pct,
        })

    # Overall course attendance average
    avg_pct = (
        round(sum(s["attendance_pct"] for s in student_stats) / len(student_stats), 1)
        if student_stats else 0.0
    )

    return {
        "id": str(course.id),
        "code": course.code,
        "name": course.name,
        "description": course.description,
        "slots": course.slots or [],
        "instructor_id": str(course.instructor_id) if course.instructor_id else None,
        "total_students": len(student_stats),
        "total_sessions": total_sessions,
        "avg_attendance": avg_pct,
        "students": student_stats,
        "created_at": course.created_at.isoformat(),
    }


@router.post("/{course_id}/enroll", status_code=status.HTTP_201_CREATED)
async def enroll_student(
    course_id: UUID,
    body: CourseEnrollRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_manage_courses),
):
    """Enroll an existing student in a course."""
    course = (await db.execute(select(Course).where(Course.id == course_id))).scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    student = (await db.execute(select(Student).where(Student.id == body.student_id))).scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Check if already enrolled
    dup = await db.execute(
        select(CourseStudent).where(
            CourseStudent.course_id == course_id,
            CourseStudent.student_id == body.student_id,
        )
    )
    if dup.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Student already enrolled in this course")

    enrollment = CourseStudent(course_id=course_id, student_id=body.student_id)
    db.add(enrollment)
    await db.commit()
    return {"message": f"Student enrolled in {course.code}"}


@router.delete("/{course_id}/enroll/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unenroll_student(
    course_id: UUID,
    student_id: UUID,
    db: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_manage_courses),
):
    result = await db.execute(
        select(CourseStudent).where(
            CourseStudent.course_id == course_id,
            CourseStudent.student_id == student_id,
        )
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    await db.delete(enrollment)
    await db.commit()
