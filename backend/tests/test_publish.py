from app.core.database import get_session_factory
from app.models.timetable import TimetableSolution, TimetableVersion, TimetableVersionSlot
from app.services.publish_seed import seed_phase6
from app.services.solver import (
    LecturerOption,
    MeetingDemand,
    Placement,
    RoomOption,
    SoftFlags,
    SolverSnapshot,
    Weights,
    score_placements,
)
from fastapi.testclient import TestClient


def login(client: TestClient, email: str, password: str = "ClashFree!dev"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def generate(client: TestClient, seed: int = 7) -> dict:
    login(client, "admin@clashfree.test")
    response = client.post(
        "/api/timetables/generate",
        json={"time_limit_seconds": 10, "alternative_count": 1, "random_seed": seed},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "feasible"
    return response.json()


def reset_versions() -> None:
    db = get_session_factory()()
    try:
        db.query(TimetableVersionSlot).delete()
        db.query(TimetableVersion).delete()
        db.commit()
    finally:
        db.close()


def test_seed_phase6_is_idempotent() -> None:
    session = get_session_factory()()
    try:
        before = session.query(TimetableVersion).count()
        seed_phase6(session)
        seed_phase6(session)
        assert session.query(TimetableVersion).count() == before
    finally:
        session.close()


def test_publish_without_draft_is_409(client: TestClient) -> None:
    db = get_session_factory()()
    try:
        db.query(TimetableSolution).update({TimetableSolution.is_selected: False})
        db.commit()
    finally:
        db.close()
    login(client, "admin@clashfree.test")
    response = client.post("/api/timetables/publish", json={"notes": "too soon"})
    assert response.status_code == 409


def test_first_publish_changes_are_added(client: TestClient) -> None:
    reset_versions()
    generate(client, seed=23)
    changes = client.get("/api/timetables/changes").json()
    assert changes
    assert all(item["kind"] == "added" for item in changes)
    assert len(changes) == 10


def test_admin_publish_creates_v1(client: TestClient) -> None:
    reset_versions()
    generate(client, seed=13)
    draft = client.get("/api/timetables/draft").json()
    response = client.post("/api/timetables/publish", json={"notes": "First release"})
    assert response.status_code == 200
    body = response.json()
    assert body["version_number"] == 1
    assert body["is_current"] is True
    assert body["status"] == "published"
    assert body["notes"] == "First release"
    assert len(body["slots"]) == len(draft["slots"])
    assert len(body["slots"]) == 10
    published = client.get("/api/timetables/published")
    assert published.status_code == 200
    assert published.json()["id"] == body["id"]


def test_second_publish_supersedes_v1(client: TestClient) -> None:
    generate(client, seed=17)
    first = client.post("/api/timetables/publish", json={"notes": "v1"}).json()
    generate(client, seed=19)
    second = client.post("/api/timetables/publish", json={"notes": "v2"})
    assert second.status_code == 200
    body = second.json()
    assert body["version_number"] == first["version_number"] + 1
    assert body["is_current"] is True
    versions = client.get("/api/timetables/versions").json()
    currents = [item for item in versions if item["is_current"]]
    assert len(currents) == 1
    assert currents[0]["id"] == body["id"]
    previous = next(item for item in versions if item["id"] == first["id"])
    assert previous["is_current"] is False
    assert previous["status"] == "superseded"


def test_republish_same_solution_is_409(client: TestClient) -> None:
    generate(client, seed=21)
    first = client.post("/api/timetables/publish", json={"notes": "once"})
    assert first.status_code == 200
    again = client.post("/api/timetables/publish", json={"notes": "twice"})
    assert again.status_code == 409


def test_lecturer_cannot_publish_or_read_versions(client: TestClient) -> None:
    login(client, "lecturer@clashfree.test")
    assert client.post("/api/timetables/publish").status_code == 403
    assert client.get("/api/timetables/published").status_code == 403
    assert client.get("/api/timetables/versions").status_code == 403
    assert client.get("/api/timetables/changes").status_code == 403


def test_student_cannot_publish(client: TestClient) -> None:
    login(client, "student@clashfree.test")
    assert client.post("/api/timetables/publish").status_code == 403


def test_unauthenticated_publish_routes_are_401(client: TestClient) -> None:
    assert client.post("/api/timetables/publish").status_code == 401
    assert client.get("/api/timetables/published").status_code == 401
    assert client.get("/api/timetables/versions").status_code == 401
    assert client.get("/api/timetables/changes").status_code == 401


def test_changes_after_second_generate_match_slot_diff(client: TestClient) -> None:
    generate(client, seed=25)
    client.post("/api/timetables/publish", json={"notes": "base"})
    generate(client, seed=29)
    published = {
        (item["assignment_id"], item["meeting_index"]): (
            item["weekday"],
            item["start_period"],
            item["room_id"],
        )
        for item in client.get("/api/timetables/published").json()["slots"]
    }
    draft = {
        (item["assignment_id"], item["meeting_index"]): (
            item["weekday"],
            item["start_period"],
            item["room_id"],
        )
        for item in client.get("/api/timetables/draft").json()["slots"]
    }
    expected = {"added": 0, "removed": 0, "moved": 0}
    for key in set(published) | set(draft):
        if key not in published:
            expected["added"] += 1
        elif key not in draft:
            expected["removed"] += 1
        elif published[key] != draft[key]:
            expected["moved"] += 1
    changes = client.get("/api/timetables/changes").json()
    counts = {"added": 0, "removed": 0, "moved": 0}
    for item in changes:
        counts[item["kind"]] += 1
    assert counts == expected


def test_preserve_published_penalty() -> None:
    snapshot = SolverSnapshot(
        meetings=[
            MeetingDemand(
                assignment_id=1,
                meeting_index=0,
                span=1,
                lecturer_id=1,
                cohort_id=1,
                expected_size=40,
                room_type="lecture_hall",
                course_code="X 101",
                cohort_code="X-1",
                lecturer_name="A",
            )
        ],
        rooms=[
            RoomOption(
                id=1,
                code="R1",
                building="A",
                room_type="lecture_hall",
                capacity=80,
                forbidden=set(),
            ),
            RoomOption(
                id=2,
                code="R2",
                building="B",
                room_type="lecture_hall",
                capacity=80,
                forbidden=set(),
            ),
        ],
        lecturers={1: LecturerOption(id=1, name="A", forbidden=set(), preferred=set())},
        incomplete=[],
        weights=Weights(schedule_stability=9),
        flags=SoftFlags(
            idle_gaps=False,
            lecturer_preferences=False,
            daily_balance=False,
            building_movement=False,
            room_utilization=False,
            preserve_published=True,
        ),
        published={(1, 0): ("mon", "08-10", 1)},
    )
    stay = score_placements(
        snapshot,
        [
            Placement(
                assignment_id=1,
                meeting_index=0,
                weekday="mon",
                start_period="08-10",
                end_period="08-10",
                room_id=1,
            )
        ],
    )
    moved = score_placements(
        snapshot,
        [
            Placement(
                assignment_id=1,
                meeting_index=0,
                weekday="tue",
                start_period="10-12",
                end_period="10-12",
                room_id=2,
            )
        ],
    )
    assert stay.soft_penalty == 0
    assert moved.soft_penalty == 9
    assert any(item.kind == "stability" for item in moved.conflicts)
