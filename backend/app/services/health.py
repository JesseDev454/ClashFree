from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.health_probe import HealthProbe

SINGLETON_PROBE_ID = 1


def write_and_read_probe(session: Session, *, source: str = "health-endpoint") -> HealthProbe:
    """Upsert the singleton health row, then read it back from PostgreSQL."""
    now = datetime.now(UTC)
    probe = session.get(HealthProbe, SINGLETON_PROBE_ID)
    if probe is None:
        probe = HealthProbe(
            id=SINGLETON_PROBE_ID,
            last_seen_at=now,
            source=source,
            detail="phase-1-health-check",
        )
        session.add(probe)
    else:
        probe.last_seen_at = now
        probe.source = source
        probe.detail = "phase-1-health-check"
    session.flush()
    session.refresh(probe)
    return probe
