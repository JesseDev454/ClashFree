from datetime import UTC, date, datetime

from app.core.database import get_session_factory
from app.models.disruption import Disruption
from app.models.identity import User
from app.models.timetable import TimetableRun
from app.services.publish import mark_repaired_disruptions
from app.services.repair import locked_meetings
from app.services.timetable import active_session, current_profile
from fastapi.testclient import TestClient


def login(client: TestClient, email: str, password: str = "ClashFree!dev"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def test_lecturer_cannot_generate(client: TestClient) -> None:
    login(client, "lecturer@clashfree.test")
    response = client.post(
        "/api/timetables/generate",
        json={"time_limit_seconds": 8, "alternative_count": 1, "random_seed": 1},
    )
    assert response.status_code == 403


def test_coordinator_cannot_generate_another_department(client: TestClient) -> None:
    login(client, "coordinator@clashfree.test")
    response = client.post(
        "/api/timetables/generate",
        json={
            "time_limit_seconds": 8,
            "alternative_count": 1,
            "random_seed": 1,
            "department_id": 9_999_999,
        },
    )
    assert response.status_code == 403


def test_unaffected_meetings_are_hard_pinned() -> None:
    published = {
        (1, 0): ("mon", "08-10", 3),
        (2, 0): ("tue", "10-12", 4),
    }
    locked = locked_meetings(published, {(1, 0)})
    assert (2, 0) in locked
    assert (1, 0) not in locked
    assert locked[(2, 0)] == ("tue", "10-12", 4)


def test_batch_repair_marks_every_disruption(client: TestClient) -> None:
    db = get_session_factory()()
    try:
        academic = active_session(db)
        profile = current_profile(db)
        admin = db.query(User).filter(User.email == "admin@clashfree.test").one()
        assert academic is not None and profile is not None
        now = datetime.now(UTC)
        rows = []
        for index in range(2):
            row = Disruption(
                session_id=academic.id,
                kind="room",
                reason=f"Phase 14 batch {index}",
                severity="medium",
                starts_on=date(2026, 9, 22),
                ends_on=date(2026, 9, 23),
                status="open",
                reported_by=admin.id,
                created_at=now,
                updated_at=now,
            )
            db.add(row)
            rows.append(row)
        db.flush()
        run = TimetableRun(
            session_id=academic.id,
            weight_profile_id=profile.id,
            status="feasible",
            time_limit_seconds=1,
            alternative_count=1,
            random_seed=14,
            started_at=now,
            finished_at=now,
            created_by=admin.id,
            purpose="repair",
            disruption_id=rows[0].id,
            disruption_ids=[row.id for row in rows],
        )
        db.add(run)
        db.flush()
        repaired = mark_repaired_disruptions(db, run)
        db.commit()
        assert {row.id for row in repaired} == {row.id for row in rows}
        assert all(row.status == "repaired" for row in rows)
    finally:
        db.close()
    assert client.get("/health").status_code == 200
