from datetime import UTC, datetime

from app.core.database import get_session_factory
from app.models.academic import Cohort, Course, CourseAssignment, Room
from app.models.identity import User
from app.models.timetable import (
    TimetableRun,
    TimetableSlot,
    TimetableSolution,
    TimetableVersion,
    TimetableVersionSlot,
)
from app.services.timetable import active_session, current_profile
from fastapi.testclient import TestClient


def login(client: TestClient, email: str, password: str = "ClashFree!dev"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def publish_owned_draft(client: TestClient) -> dict:
    db = get_session_factory()()
    try:
        db.query(TimetableVersionSlot).delete()
        db.query(TimetableVersion).delete()
        db.query(TimetableSolution).update(
            {TimetableSolution.is_selected: False},
            synchronize_session=False,
        )
        academic = active_session(db)
        profile = current_profile(db)
        admin = db.query(User).filter(User.email == "admin@clashfree.test").one()
        assignment = (
            db.query(CourseAssignment)
            .join(Course, CourseAssignment.course_id == Course.id)
            .join(Cohort, CourseAssignment.cohort_id == Cohort.id)
            .filter(Course.code == "SWE 301", Cohort.code == "SWE-300-A")
            .one()
        )
        room = db.query(Room).order_by(Room.id).first()
        assert academic is not None and profile is not None and room is not None
        now = datetime.now(UTC)
        run = TimetableRun(
            session_id=academic.id,
            weight_profile_id=profile.id,
            status="feasible",
            time_limit_seconds=1,
            alternative_count=1,
            random_seed=12,
            started_at=now,
            finished_at=now,
            solve_time_ms=0,
            message="Phase 12 draft",
            created_by=admin.id,
            purpose="generate",
        )
        db.add(run)
        db.flush()
        solution = TimetableSolution(
            run_id=run.id,
            label="A",
            objective=0,
            hard_violations=0,
            soft_penalty=0,
            room_utilization_percent=0,
            student_gap_hours=0,
            is_selected=True,
        )
        db.add(solution)
        db.flush()
        db.add(
            TimetableSlot(
                solution_id=solution.id,
                assignment_id=assignment.id,
                meeting_index=0,
                weekday="mon",
                start_period="08-10",
                end_period="08-10",
                room_id=room.id,
            )
        )
        db.commit()
    finally:
        db.close()
    login(client, "admin@clashfree.test")
    published = client.post("/api/timetables/publish", json={"notes": "Phase 12"})
    assert published.status_code == 200, published.text
    return published.json()


def test_export_unpublish_restore_and_republish(client: TestClient) -> None:
    current = publish_owned_draft(client)
    exported = client.get(f"/api/timetables/versions/{current['id']}/export")
    assert exported.status_code == 200
    assert "text/csv" in exported.headers["content-type"]
    assert "SWE 301" in exported.text
    unpublished = client.post(f"/api/timetables/versions/{current['id']}/unpublish")
    assert unpublished.status_code == 200
    assert unpublished.json()["status"] == "unpublished"
    assert client.get("/api/timetables/published").status_code == 404
    restored = client.post(f"/api/timetables/versions/{current['id']}/restore")
    assert restored.status_code == 200
    assert restored.json()["is_selected"] is True
    again = client.post("/api/timetables/publish", json={"notes": "Phase 12 again"})
    assert again.status_code == 200, again.text
    assert again.json()["version_number"] == current["version_number"] + 1


def test_student_cannot_unpublish_or_restore(client: TestClient) -> None:
    current = publish_owned_draft(client)
    client.post("/api/auth/logout")
    login(client, "student@clashfree.test")
    assert client.post(f"/api/timetables/versions/{current['id']}/unpublish").status_code == 403
    assert client.post(f"/api/timetables/versions/{current['id']}/restore").status_code == 403
