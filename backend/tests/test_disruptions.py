from datetime import date, timedelta

from app.core.database import get_session_factory
from app.models.constraints import RoomAvailabilityBlock
from app.models.disruption import Disruption
from app.services.disruption_seed import (
    SEED_REASON_LECTURER,
    SEED_REASON_LT2,
    SEED_REASON_MAINTENANCE,
    seed_phase7,
)
from fastapi.testclient import TestClient

ROLES_403 = (
    "coordinator@clashfree.test",
    "student@clashfree.test",
)


def login(client: TestClient, email: str, password: str = "ClashFree!dev"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def generate_and_publish(client: TestClient, seed: int = 31) -> dict:
    login(client, "admin@clashfree.test")
    generated = client.post(
        "/api/timetables/generate",
        json={"time_limit_seconds": 10, "alternative_count": 1, "random_seed": seed},
    )
    assert generated.status_code == 200, generated.text
    assert generated.json()["status"] == "feasible"
    published = client.post("/api/timetables/publish", json={"notes": "phase-7"})
    assert published.status_code in {200, 409}, published.text
    return client.get("/api/timetables/published").json()


def test_seed_phase7_is_idempotent() -> None:
    session = get_session_factory()()
    try:
        before = session.query(Disruption).count()
        seed_phase7(session)
        seed_phase7(session)
        assert session.query(Disruption).count() == before
        reasons = {SEED_REASON_LT2, SEED_REASON_LECTURER, SEED_REASON_MAINTENANCE}
        assert session.query(Disruption).filter(Disruption.reason.in_(reasons)).count() == 3
        maintenance = (
            session.query(Disruption).filter(Disruption.reason == SEED_REASON_MAINTENANCE).one()
        )
        assert maintenance.block_id is not None
        assert session.get(RoomAvailabilityBlock, maintenance.block_id) is not None
    finally:
        session.close()


def test_unauthenticated_disruption_routes_are_401(client: TestClient) -> None:
    assert client.get("/api/disruptions").status_code == 401
    assert client.get("/api/disruptions/summary").status_code == 401
    assert client.post("/api/disruptions").status_code == 401
    assert client.post("/api/disruptions/preview").status_code == 401


def test_coordinator_and_student_cannot_access_disruptions(client: TestClient) -> None:
    for email in ROLES_403:
        client.post("/api/auth/logout")
        login(client, email)
        assert client.get("/api/disruptions").status_code == 403, email
        assert (
            client.post(
                "/api/disruptions",
                json={
                    "kind": "room",
                    "room_id": 1,
                    "reason": "blocked",
                    "starts_on": "2026-09-22",
                    "ends_on": "2026-09-23",
                },
            ).status_code
            == 403
        ), email


def test_lecturer_cannot_report_room_disruption(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    rooms = client.get("/api/rooms").json()
    room_id = rooms[0]["id"]
    client.post("/api/auth/logout")
    login(client, "lecturer@clashfree.test")
    response = client.post(
        "/api/disruptions",
        json={
            "kind": "room",
            "room_id": room_id,
            "reason": "Should fail",
            "starts_on": "2026-09-22",
            "ends_on": "2026-09-23",
        },
    )
    assert response.status_code == 403


def test_facilities_cannot_report_lecturer_disruption(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    lecturers = client.get("/api/lecturers").json()
    lecturer_id = lecturers[0]["id"]
    client.post("/api/auth/logout")
    login(client, "facilities@clashfree.test")
    response = client.post(
        "/api/disruptions",
        json={
            "kind": "lecturer",
            "lecturer_id": lecturer_id,
            "reason": "Should fail",
            "starts_on": "2026-09-22",
            "ends_on": "2026-09-23",
        },
    )
    assert response.status_code == 403


def test_admin_can_register_both_kinds(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    rooms = {row["code"]: row["id"] for row in client.get("/api/rooms").json()}
    lecturers = {row["full_name"]: row["id"] for row in client.get("/api/lecturers").json()}
    room = client.post(
        "/api/disruptions",
        json={
            "kind": "room",
            "room_id": rooms["LT1"],
            "reason": "Admin room outage",
            "starts_on": "2026-09-01",
            "ends_on": "2026-09-01",
            "start_period": "08-10",
            "end_period": "10-12",
        },
    )
    lecturer = client.post(
        "/api/disruptions",
        json={
            "kind": "lecturer",
            "lecturer_id": lecturers["Dr. Amina Yusuf"],
            "reason": "Admin lecturer absence",
            "starts_on": "2026-09-01",
            "ends_on": "2026-09-01",
        },
    )
    assert room.status_code == 201, room.text
    assert lecturer.status_code == 201, lecturer.text
    assert room.json()["kind"] == "room"
    assert lecturer.json()["kind"] == "lecturer"
    assert room.json()["code"].startswith("D-")
    assert room.json()["status"] == "open"


def test_lecturer_report_binds_to_own_record(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    lecturers = {row["full_name"]: row for row in client.get("/api/lecturers").json()}
    amina = lecturers["Dr. Amina Yusuf"]
    other = next(row for row in lecturers.values() if row["id"] != amina["id"])
    client.post("/api/auth/logout")
    login(client, "lecturer@clashfree.test")
    blocked = client.post(
        "/api/disruptions",
        json={
            "kind": "lecturer",
            "lecturer_id": other["id"],
            "reason": "Wrong lecturer",
            "starts_on": "2026-09-22",
            "ends_on": "2026-09-22",
        },
    )
    assert blocked.status_code == 403
    created = client.post(
        "/api/disruptions",
        json={
            "kind": "lecturer",
            "reason": "Own unavailability",
            "starts_on": "2026-09-22",
            "ends_on": "2026-09-22",
        },
    )
    assert created.status_code == 201, created.text
    assert created.json()["lecturer_id"] == amina["id"]
    listing = client.get("/api/disruptions").json()
    assert all(item["lecturer_id"] == amina["id"] for item in listing)
    assert all(item["kind"] == "lecturer" for item in listing)


def test_room_impact_matches_published_slots(client: TestClient) -> None:
    published = generate_and_publish(client, seed=13)
    slot = next(item for item in published["slots"] if item["room_code"] == "LT1")
    weekday_index = ["mon", "tue", "wed", "thu", "fri"].index(slot["weekday"])
    # 2026-09-07 is a Monday; pick the matching weekday in session.
    starts = date(2026, 9, 7) + timedelta(days=weekday_index)
    created = client.post(
        "/api/disruptions",
        json={
            "kind": "room",
            "room_id": slot["room_id"],
            "reason": "LT1 overlap check",
            "starts_on": starts.isoformat(),
            "ends_on": starts.isoformat(),
            "start_period": slot["start_period"],
            "end_period": slot["end_period"],
        },
    )
    assert created.status_code == 201, created.text
    impact = created.json()["impact"]
    assert impact["published"] is True
    assert impact["classes_affected"] >= 1
    codes = {item["course_code"] for item in impact["classes"]}
    assert slot["course_code"] in codes
    cohort_ids = {item["cohort_code"] for item in impact["classes"]}
    expected_students = 0
    seen = set()
    for item in impact["classes"]:
        if item["cohort_code"] in seen:
            continue
        seen.add(item["cohort_code"])
        expected_students += item["cohort_size"]
    assert impact["students_affected"] == expected_students
    assert len(cohort_ids) >= 1


def test_non_overlapping_window_has_empty_impact(client: TestClient) -> None:
    generate_and_publish(client, seed=13)
    login(client, "admin@clashfree.test")
    rooms = {row["code"]: row["id"] for row in client.get("/api/rooms").json()}
    created = client.post(
        "/api/disruptions",
        json={
            "kind": "room",
            "room_id": rooms["LT1"],
            "reason": "Weekend only",
            "starts_on": "2026-09-05",
            "ends_on": "2026-09-06",
        },
    )
    assert created.status_code == 201, created.text
    impact = created.json()["impact"]
    assert impact["classes_affected"] == 0
    assert impact["students_affected"] == 0
    assert impact["classes"] == []


def test_lecturer_impact_matches_published_meetings(client: TestClient) -> None:
    published = generate_and_publish(client, seed=13)
    slot = next(item for item in published["slots"] if item["lecturer_name"] == "Dr. Amina Yusuf")
    login(client, "lecturer@clashfree.test")
    created = client.post(
        "/api/disruptions",
        json={
            "kind": "lecturer",
            "reason": "Conference week",
            "starts_on": "2026-09-01",
            "ends_on": "2026-09-30",
        },
    )
    assert created.status_code == 201, created.text
    impact = created.json()["impact"]
    assert impact["classes_affected"] >= 1
    assert any(item["course_code"] == slot["course_code"] for item in impact["classes"])
    assert all(item["lecturer_name"] == "Dr. Amina Yusuf" for item in impact["classes"])


def test_future_window_is_scheduled_and_maintenance_creates_block(client: TestClient) -> None:
    login(client, "facilities@clashfree.test")
    rooms = {row["code"]: row["id"] for row in client.get("/api/rooms").json()}
    created = client.post(
        "/api/disruptions",
        json={
            "kind": "room",
            "room_id": rooms["LT2"],
            "reason": "HVAC upgrade",
            "starts_on": "2026-12-10",
            "ends_on": "2026-12-12",
            "create_block": True,
        },
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["status"] == "scheduled"
    assert body["block_id"] is not None
    db = get_session_factory()()
    try:
        block = db.get(RoomAvailabilityBlock, body["block_id"])
        assert block is not None
        assert block.room_id == rooms["LT2"]
        assert block.kind == "maintenance"
        assert block.reason == "HVAC upgrade"
    finally:
        db.close()


def test_admin_can_acknowledge_open_disruption(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    rows = client.get("/api/disruptions", params={"status": "open"}).json()
    assert rows
    target = rows[0]
    patched = client.patch(f"/api/disruptions/{target['id']}", json={"status": "in_review"})
    assert patched.status_code == 200, patched.text
    assert patched.json()["status"] == "in_review"


def test_repair_remains_unimplemented(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    assert client.post("/api/timetables/repair").status_code == 501


def test_facilities_summary_is_room_only(client: TestClient) -> None:
    login(client, "facilities@clashfree.test")
    summary = client.get("/api/disruptions/summary")
    assert summary.status_code == 200
    body = summary.json()
    assert body["lecturer_active"] == 0
    listing = client.get("/api/disruptions").json()
    assert listing
    assert all(item["kind"] == "room" for item in listing)
