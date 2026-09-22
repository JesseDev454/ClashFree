from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.identity import Department, User

CONSTRAINT_KINDS = ("blocked_period", "preferred_period", "lab_need")
REQUEST_KINDS = ("scheduling", "change")
REQUEST_STATUSES = ("pending", "approved", "rejected")


class DepartmentConstraint(Base):
    __tablename__ = "department_constraints"

    id: Mapped[int] = mapped_column(primary_key=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), index=True)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    weekday: Mapped[str | None] = mapped_column(String(8))
    period: Mapped[str | None] = mapped_column(String(8))
    room_type: Mapped[str | None] = mapped_column(String(32))
    note: Mapped[str | None] = mapped_column(String(255))

    department: Mapped[Department] = relationship()


class ScheduleRequest(Base):
    __tablename__ = "schedule_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("academic_sessions.id"), nullable=False)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), index=True)
    requester_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="pending")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    detail: Mapped[str] = mapped_column(Text, nullable=False)
    assignment_id: Mapped[int | None] = mapped_column(ForeignKey("course_assignments.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decided_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))

    requester: Mapped[User] = relationship(foreign_keys=[requester_id])


class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
