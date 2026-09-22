from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.academic import AcademicSession, Lecturer, Room
from app.models.constraints import RoomAvailabilityBlock
from app.models.identity import User

DISRUPTION_KINDS = ("room", "lecturer")
DISRUPTION_STATUSES = ("open", "in_review", "scheduled", "repaired")
DISRUPTION_SEVERITIES = ("low", "medium", "high")


class Disruption(Base):
    __tablename__ = "disruptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("academic_sessions.id"),
        index=True,
        nullable=False,
    )
    kind: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    room_id: Mapped[int | None] = mapped_column(ForeignKey("rooms.id"), index=True)
    lecturer_id: Mapped[int | None] = mapped_column(
        ForeignKey("lecturers.id"),
        index=True,
    )
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(16), nullable=False, default="medium")
    starts_on: Mapped[date] = mapped_column(Date, nullable=False)
    ends_on: Mapped[date] = mapped_column(Date, nullable=False)
    start_period: Mapped[str | None] = mapped_column(String(8))
    end_period: Mapped[str | None] = mapped_column(String(8))
    status: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    reported_by: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    block_id: Mapped[int | None] = mapped_column(ForeignKey("room_availability_blocks.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    session: Mapped[AcademicSession] = relationship()
    room: Mapped[Room | None] = relationship()
    lecturer: Mapped[Lecturer | None] = relationship()
    reporter: Mapped[User] = relationship()
    block: Mapped[RoomAvailabilityBlock | None] = relationship()
