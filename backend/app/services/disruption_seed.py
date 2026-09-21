from datetime import UTC, date, datetime

from sqlalchemy.orm import Session

from app.models.academic import Lecturer, Room
from app.models.constraints import RoomAvailabilityBlock
from app.models.disruption import Disruption
from app.models.identity import User
from app.services.publish_seed import seed_phase6
from app.services.timetable import active_session

SEED_REASON_LT2 = "Electrical fault"
SEED_REASON_LECTURER = "Temporary absence"
SEED_REASON_MAINTENANCE = "Scheduled maintenance"


def _upsert_disruption(
    session: Session,
    *,
    session_id: int,
    kind: str,
    room_id: int | None,
    lecturer_id: int | None,
    reason: str,
    description: str,
    severity: str,
    starts_on: date,
    ends_on: date,
    start_period: str | None,
    end_period: str | None,
    status: str,
    reported_by: int,
    block_id: int | None,
) -> Disruption:
    query = session.query(Disruption).filter(
        Disruption.kind == kind,
        Disruption.reason == reason,
        Disruption.session_id == session_id,
    )
    if kind == "room":
        query = query.filter(Disruption.room_id == room_id)
    else:
        query = query.filter(Disruption.lecturer_id == lecturer_id)
    row = query.one_or_none()
    now = datetime.now(UTC)
    values = {
        "session_id": session_id,
        "kind": kind,
        "room_id": room_id,
        "lecturer_id": lecturer_id,
        "reason": reason,
        "description": description,
        "severity": severity,
        "starts_on": starts_on,
        "ends_on": ends_on,
        "start_period": start_period,
        "end_period": end_period,
        "status": status,
        "reported_by": reported_by,
        "block_id": block_id,
        "updated_at": now,
    }
    if row is None:
        row = Disruption(created_at=now, **values)
        session.add(row)
    else:
        for key, value in values.items():
            setattr(row, key, value)
    return row


def seed_phase7(session: Session) -> None:
    session.query(Disruption).update({Disruption.block_id: None})
    session.flush()
    seed_phase6(session)
    academic = active_session(session)
    if academic is None:
        session.commit()
        return
    lt2 = session.query(Room).filter(Room.code == "LT2").one()
    ict = session.query(Room).filter(Room.code == "ICT Lab 1").one()
    amina = session.query(Lecturer).filter(Lecturer.full_name == "Dr. Amina Yusuf").one()
    facilities = session.query(User).filter(User.email == "facilities@clashfree.test").one()
    lecturer_user = session.query(User).filter(User.email == "lecturer@clashfree.test").one()

    block = (
        session.query(RoomAvailabilityBlock)
        .filter(
            RoomAvailabilityBlock.room_id == ict.id,
            RoomAvailabilityBlock.reason == SEED_REASON_MAINTENANCE,
        )
        .one_or_none()
    )
    if block is None:
        block = RoomAvailabilityBlock(
            room_id=ict.id,
            starts_on=date(2026, 12, 5),
            ends_on=date(2026, 12, 6),
            start_period=None,
            end_period=None,
            reason=SEED_REASON_MAINTENANCE,
            kind="maintenance",
            recurring=False,
        )
        session.add(block)
        session.flush()
    else:
        block.starts_on = date(2026, 12, 5)
        block.ends_on = date(2026, 12, 6)
        block.kind = "maintenance"
        session.flush()

    _upsert_disruption(
        session,
        session_id=academic.id,
        kind="room",
        room_id=lt2.id,
        lecturer_id=None,
        reason=SEED_REASON_LT2,
        description="LT2 unavailable — electrical fault",
        severity="high",
        starts_on=date(2026, 9, 21),
        ends_on=date(2026, 9, 28),
        start_period=None,
        end_period=None,
        status="open",
        reported_by=facilities.id,
        block_id=None,
    )
    _upsert_disruption(
        session,
        session_id=academic.id,
        kind="lecturer",
        room_id=None,
        lecturer_id=amina.id,
        reason=SEED_REASON_LECTURER,
        description="Dr. Amina Yusuf unavailable",
        severity="medium",
        starts_on=date(2026, 9, 22),
        ends_on=date(2026, 9, 24),
        start_period="08-10",
        end_period="16-18",
        status="in_review",
        reported_by=lecturer_user.id,
        block_id=None,
    )
    _upsert_disruption(
        session,
        session_id=academic.id,
        kind="room",
        room_id=ict.id,
        lecturer_id=None,
        reason=SEED_REASON_MAINTENANCE,
        description="ICT Lab 1 scheduled maintenance",
        severity="low",
        starts_on=date(2026, 12, 1),
        ends_on=date(2026, 12, 3),
        start_period=None,
        end_period=None,
        status="scheduled",
        reported_by=facilities.id,
        block_id=block.id,
    )
    session.commit()
