from datetime import date

from sqlalchemy import (
    Boolean,
    Date,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.academic import Lecturer, Room


class SchedulingConstraint(Base):
    __tablename__ = "scheduling_constraints"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    locked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class ConstraintWeightProfile(Base):
    __tablename__ = "constraint_weight_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    schedule_stability: Mapped[int] = mapped_column(Integer, nullable=False)
    student_idle_gaps: Mapped[int] = mapped_column(Integer, nullable=False)
    room_utilization: Mapped[int] = mapped_column(Integer, nullable=False)
    lecturer_preferences: Mapped[int] = mapped_column(Integer, nullable=False)
    daily_balance: Mapped[int] = mapped_column(Integer, nullable=False)
    building_movement: Mapped[int] = mapped_column(Integer, nullable=False)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class LecturerAvailabilitySlot(Base):
    __tablename__ = "lecturer_availability_slots"
    __table_args__ = (
        UniqueConstraint(
            "lecturer_id",
            "weekday",
            "period",
            name="uq_lecturer_availability_slot",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    lecturer_id: Mapped[int] = mapped_column(
        ForeignKey("lecturers.id", ondelete="CASCADE"),
        index=True,
    )
    weekday: Mapped[str] = mapped_column(String(8), nullable=False)
    period: Mapped[str] = mapped_column(String(8), nullable=False)
    state: Mapped[str] = mapped_column(String(16), nullable=False)

    lecturer: Mapped[Lecturer] = relationship()


class LecturerAvailabilityException(Base):
    __tablename__ = "lecturer_availability_exceptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    lecturer_id: Mapped[int] = mapped_column(
        ForeignKey("lecturers.id", ondelete="CASCADE"),
        index=True,
    )
    starts_on: Mapped[date] = mapped_column(Date, nullable=False)
    ends_on: Mapped[date] = mapped_column(Date, nullable=False)
    start_period: Mapped[str | None] = mapped_column(String(8))
    end_period: Mapped[str | None] = mapped_column(String(8))
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False, default="unavailable")

    lecturer: Mapped[Lecturer] = relationship()


class LecturerPreference(Base):
    __tablename__ = "lecturer_preferences"

    id: Mapped[int] = mapped_column(primary_key=True)
    lecturer_id: Mapped[int] = mapped_column(
        ForeignKey("lecturers.id", ondelete="CASCADE"),
        unique=True,
    )
    prefer_morning: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    avoid_friday_afternoon: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    no_early_after_late: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    max_classes_per_day: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    max_consecutive_hours: Mapped[int] = mapped_column(Integer, nullable=False, default=4)
    min_break_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    preferred_days: Mapped[list[str]] = mapped_column(JSONB, nullable=False)

    lecturer: Mapped[Lecturer] = relationship()


class RoomAvailabilitySlot(Base):
    __tablename__ = "room_availability_slots"
    __table_args__ = (
        UniqueConstraint("room_id", "weekday", "period", name="uq_room_availability_slot"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(
        ForeignKey("rooms.id", ondelete="CASCADE"),
        index=True,
    )
    weekday: Mapped[str] = mapped_column(String(8), nullable=False)
    period: Mapped[str] = mapped_column(String(8), nullable=False)
    state: Mapped[str] = mapped_column(String(16), nullable=False)

    room: Mapped[Room] = relationship()


class RoomAvailabilityBlock(Base):
    __tablename__ = "room_availability_blocks"

    id: Mapped[int] = mapped_column(primary_key=True)
    room_id: Mapped[int] = mapped_column(
        ForeignKey("rooms.id", ondelete="CASCADE"),
        index=True,
    )
    starts_on: Mapped[date] = mapped_column(Date, nullable=False)
    ends_on: Mapped[date] = mapped_column(Date, nullable=False)
    start_period: Mapped[str | None] = mapped_column(String(8))
    end_period: Mapped[str | None] = mapped_column(String(8))
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)
    recurring: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    room: Mapped[Room] = relationship()
