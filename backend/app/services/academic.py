from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.academic import AcademicSession, Course, CourseAssignment


def activate_session(db: Session, target: AcademicSession) -> AcademicSession:
    for row in db.query(AcademicSession).filter(AcademicSession.status == "active"):
        if row.id != target.id:
            row.status = "archived"
    target.status = "active"
    return target


def refresh_course_status(db: Session, course: Course) -> Course:
    assignments = db.query(CourseAssignment).filter(CourseAssignment.course_id == course.id).all()
    has_lecturer = any(item.lecturer_id is not None for item in assignments)
    course.status = "ready" if assignments and has_lecturer else "draft"
    return course


def refresh_all_course_statuses(db: Session) -> None:
    for course in db.query(Course).all():
        refresh_course_status(db, course)


def commit_or_conflict(db: Session, message: str) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError(message) from exc


class ConflictError(Exception):
    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)
