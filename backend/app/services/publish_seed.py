from sqlalchemy.orm import Session

from app.services.timetable_seed import seed_phase5


def seed_phase6(session: Session) -> None:
    seed_phase5(session)
