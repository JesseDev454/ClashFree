from sqlalchemy.orm import Session

from app.core.schedule import PERIODS, WEEKDAYS
from app.models.academic import Room
from app.models.constraints import RoomAvailabilitySlot
from app.services.constraints_seed import seed_phase4

SCIENCE_LAB = {
    "code": "Science Lab",
    "building": "Science Block",
    "room_type": "lab",
    "capacity": 120,
    "equipment": "Benches, fume hood",
    "status": "available",
}


def seed_phase5(session: Session) -> None:
    seed_phase4(session)

    lab = session.query(Room).filter(Room.code == SCIENCE_LAB["code"]).one_or_none()
    if lab is None:
        lab = Room(**SCIENCE_LAB)
        session.add(lab)
        session.flush()
    else:
        for key, value in SCIENCE_LAB.items():
            if key != "code":
                setattr(lab, key, value)

    ict = session.query(Room).filter(Room.code == "ICT Lab 1").one_or_none()
    if ict is not None:
        ict.capacity = 90

    existing = {
        (row.weekday, row.period)
        for row in session.query(RoomAvailabilitySlot)
        .filter(RoomAvailabilitySlot.room_id == lab.id)
        .all()
    }
    for weekday in WEEKDAYS:
        for period in PERIODS:
            if (weekday, period) in existing:
                continue
            session.add(
                RoomAvailabilitySlot(
                    room_id=lab.id,
                    weekday=weekday,
                    period=period,
                    state="available",
                )
            )
    session.commit()
