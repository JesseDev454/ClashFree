from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.academic import AcademicSession, CourseAssignment, Room
from app.models.constraints import ConstraintWeightProfile
from app.models.identity import User

RUN_STATUSES = ("running", "feasible", "infeasible", "failed")
CONFLICT_KINDS = (
    "lecturer",
    "room",
    "cohort",
    "capacity",
    "availability",
    "incomplete",
    "preference",
    "idle_gap",
    "balance",
    "movement",
    "utilization",
)
CONFLICT_SEVERITIES = ("high", "medium", "soft")


class TimetableRun(Base):
    __tablename__ = "timetable_runs"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("academic_sessions.id"),
        index=True,
        nullable=False,
    )
    weight_profile_id: Mapped[int] = mapped_column(
        ForeignKey("constraint_weight_profiles.id"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    time_limit_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    alternative_count: Mapped[int] = mapped_column(Integer, nullable=False)
    random_seed: Mapped[int | None] = mapped_column(Integer)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    solve_time_ms: Mapped[int | None] = mapped_column(Integer)
    message: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    session: Mapped[AcademicSession] = relationship()
    weight_profile: Mapped[ConstraintWeightProfile] = relationship()
    creator: Mapped[User] = relationship()
    solutions: Mapped[list["TimetableSolution"]] = relationship(
        back_populates="run",
        cascade="all, delete-orphan",
    )


class TimetableSolution(Base):
    __tablename__ = "timetable_solutions"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("timetable_runs.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    label: Mapped[str] = mapped_column(String(8), nullable=False)
    objective: Mapped[int] = mapped_column(Integer, nullable=False)
    hard_violations: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    soft_penalty: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    room_utilization_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    student_gap_hours: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    is_selected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)

    run: Mapped[TimetableRun] = relationship(back_populates="solutions")
    slots: Mapped[list["TimetableSlot"]] = relationship(
        back_populates="solution",
        cascade="all, delete-orphan",
    )
    conflicts: Mapped[list["TimetableConflict"]] = relationship(
        back_populates="solution",
        cascade="all, delete-orphan",
    )


class TimetableSlot(Base):
    __tablename__ = "timetable_slots"
    __table_args__ = (
        UniqueConstraint(
            "solution_id",
            "weekday",
            "start_period",
            "room_id",
            name="uq_timetable_slot_room_period",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    solution_id: Mapped[int] = mapped_column(
        ForeignKey("timetable_solutions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    assignment_id: Mapped[int] = mapped_column(
        ForeignKey("course_assignments.id"),
        index=True,
        nullable=False,
    )
    meeting_index: Mapped[int] = mapped_column(Integer, nullable=False)
    weekday: Mapped[str] = mapped_column(String(8), nullable=False)
    start_period: Mapped[str] = mapped_column(String(8), nullable=False)
    end_period: Mapped[str] = mapped_column(String(8), nullable=False)
    room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), nullable=False)

    solution: Mapped[TimetableSolution] = relationship(back_populates="slots")
    assignment: Mapped[CourseAssignment] = relationship()
    room: Mapped[Room] = relationship()


class TimetableConflict(Base):
    __tablename__ = "timetable_conflicts"

    id: Mapped[int] = mapped_column(primary_key=True)
    solution_id: Mapped[int] = mapped_column(
        ForeignKey("timetable_solutions.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False)
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    detail: Mapped[str] = mapped_column(Text, nullable=False)
    weekday: Mapped[str | None] = mapped_column(String(8))
    period: Mapped[str | None] = mapped_column(String(8))
    assignment_ids: Mapped[list[int]] = mapped_column(JSONB, nullable=False, default=list)

    solution: Mapped[TimetableSolution] = relationship(back_populates="conflicts")
