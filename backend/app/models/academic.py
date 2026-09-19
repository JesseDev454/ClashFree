from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.identity import Department, User

ROOM_TYPES = (
    "lecture_hall",
    "lab",
    "computer_lab",
    "auditorium",
    "seminar",
)
SEMESTERS = ("first", "second")
SESSION_STATUSES = ("draft", "active", "archived")
COURSE_STATUSES = ("draft", "ready")
COHORT_STATUSES = ("complete", "needs_review")
LECTURER_STATUSES = ("available", "limited", "overloaded")
ROOM_STATUSES = ("available", "unavailable", "maintenance")
COURSE_LEVELS = (100, 200, 300, 400, 500)


class Faculty(Base):
    __tablename__ = "faculties"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)

    departments: Mapped[list[Department]] = relationship(back_populates="faculty")


class AcademicSession(Base):
    __tablename__ = "academic_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    label: Mapped[str] = mapped_column(String(32), nullable=False)
    semester: Mapped[str] = mapped_column(String(16), nullable=False)
    starts_on: Mapped[date] = mapped_column(Date, nullable=False)
    ends_on: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    draft_opens_on: Mapped[date | None] = mapped_column(Date)
    publish_deadline_on: Mapped[date | None] = mapped_column(Date)


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), index=True)
    level: Mapped[int] = mapped_column(Integer, nullable=False)
    units: Mapped[int] = mapped_column(Integer, nullable=False)
    expected_size: Mapped[int] = mapped_column(Integer, nullable=False)
    room_type: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)

    department: Mapped[Department] = relationship(back_populates="courses")
    assignments: Mapped[list["CourseAssignment"]] = relationship(back_populates="course")


class Cohort(Base):
    __tablename__ = "cohorts"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), index=True)
    level: Mapped[int] = mapped_column(Integer, nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)

    department: Mapped[Department] = relationship(back_populates="cohorts")
    assignments: Mapped[list["CourseAssignment"]] = relationship(back_populates="cohort")


class Lecturer(Base):
    __tablename__ = "lecturers"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), unique=True)
    max_weekly_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=24)
    status: Mapped[str] = mapped_column(String(16), nullable=False)

    department: Mapped[Department] = relationship(back_populates="lecturers")
    user: Mapped[User | None] = relationship()
    assignments: Mapped[list["CourseAssignment"]] = relationship(back_populates="lecturer")


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    building: Mapped[str] = mapped_column(String(128), nullable=False)
    room_type: Mapped[str] = mapped_column(String(32), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    equipment: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), nullable=False)


class CourseAssignment(Base):
    __tablename__ = "course_assignments"
    __table_args__ = (
        UniqueConstraint("course_id", "cohort_id", name="uq_assignment_course_cohort"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), index=True)
    cohort_id: Mapped[int] = mapped_column(ForeignKey("cohorts.id"), index=True)
    lecturer_id: Mapped[int | None] = mapped_column(ForeignKey("lecturers.id"))
    contact_pattern: Mapped[str] = mapped_column(String(64), nullable=False)

    course: Mapped[Course] = relationship(back_populates="assignments")
    cohort: Mapped[Cohort] = relationship(back_populates="assignments")
    lecturer: Mapped[Lecturer | None] = relationship(back_populates="assignments")
