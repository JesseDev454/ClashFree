from sqlalchemy.orm import Session

from app.services.disruption_seed import seed_phase7


def seed_phase8(session: Session) -> None:
    """Phase 8 adds repair runs at request time, not in the seed."""
    seed_phase7(session)
