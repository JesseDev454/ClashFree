from app.core.database import get_session_factory
from app.models.disruption import Disruption
from app.models.timetable import TimetableRun, TimetableVersion
from app.services.disruption_seed import (
    SEED_REASON_LECTURER,
    SEED_REASON_LT2,
    SEED_REASON_MAINTENANCE,
)
from app.services.disruptions import period_span
from app.services.repair_seed import seed_phase8
from fastapi.testclient import TestClient

WEEKDAY_DATE = {
    "mon": "2026-09-07",
    "tue": "2026-09-01",
    "wed": "2026-09-02",
    "thu": "2026-09-03",
    "fri": "2026-09-04",
}
DENIED = (
    "lecturer@clashfree.test",
    "facilities@clashfree.test",
    "coordinator@clashfree.test",
    "student@clashfree.test",
)


def login(client: TestClient, email: str, password: str = "ClashFree!dev"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def generate_and_publish(client: TestClient, seed: int = 13) -> dict:
    login(client, "admin@clashfree.test")
    generated = client.post(
        "/api/timetables/generate",
        json={"time_limit_seconds": 10, "alternative_count": 1, "random_seed": seed},
    )
    assert generated.status_code == 200, generated.text
    assert generated.json()["status"] == "feasible"
    published = client.post("/api/timetables/publish", json={"notes": "phase-8"})
    assert published.status_code in {200, 409}, published.text
    current = client.get("/api/timetables/published")
    assert current.status_code == 200, current.text
    return current.json()


def repair_body(disruption_id: int) -> dict:
    return {
        "disruption_id": disruption_id,
        "time_limit_seconds": 10,
        "alternative_count": 1,
        "random_seed": 13,
    }


def test_seed_phase8_is_idempotent() -> None:
    session = get_session_factory()()
    try:
        before_disruptions = session.query(Disruption).count()
        before_runs = session.query(TimetableRun).count()
        before_repairs = (
            session.query(TimetableRun).filter(TimetableRun.purpose == "repair").count()
        )
        seed_phase8(session)
        seed_phase8(session)
        assert session.query(Disruption).count() == before_disruptions
        assert session.query(TimetableRun).count() == before_runs
        reasons = {SEED_REASON_LT2, SEED_REASON_LECTURER, SEED_REASON_MAINTENANCE}
        assert session.query(Disruption).filter(Disruption.reason.in_(reasons)).count() == 3
        assert (
            session.query(TimetableRun).filter(TimetableRun.purpose == "repair").count()
            == before_repairs
        )
    finally:
        session.close()


def test_repair_requires_authentication(client: TestClient) -> None:
    assert client.post("/api/timetables/repair", json=repair_body(1)).status_code == 401


def test_non_admin_roles_cannot_repair(client: TestClient) -> None:
    for email in DENIED:
        client.post("/api/auth/logout")
        login(client, email)
        response = client.post("/api/timetables/repair", json=repair_body(1))
        assert response.status_code == 403, email


def test_repair_without_published_version_is_conflict(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    rows = client.get("/api/disruptions").json()
    target = next(row for row in rows if row["status"] in {"open", "in_review"})
    db = get_session_factory()()
    current = db.query(TimetableVersion).filter(TimetableVersion.is_current.is_(True)).all()
    saved = [(row.id, row.status) for row in current]
    try:
        for row in current:
            row.is_current = False
        db.commit()
        response = client.post("/api/timetables/repair", json=repair_body(target["id"]))
        assert response.status_code == 409, response.text
        assert "published" in response.json()["detail"].lower()
    finally:
        for version_id, version_status in saved:
            row = db.get(TimetableVersion, version_id)
            if row is not None:
                row.is_current = True
                row.status = version_status
        db.commit()
        db.close()


def test_repair_rejects_scheduled_repaired_and_empty_impact(client: TestClient) -> None:
    published = generate_and_publish(client)
    login(client, "admin@clashfree.test")
    rows = client.get("/api/disruptions").json()
    scheduled = next(row for row in rows if row["status"] == "scheduled")
    denied = client.post("/api/timetables/repair", json=repair_body(scheduled["id"]))
    assert denied.status_code == 409, denied.text

    rooms = {row["code"]: row["id"] for row in client.get("/api/rooms").json()}
    weekend = client.post(
        "/api/disruptions",
        json={
            "kind": "room",
            "room_id": rooms["LT1"],
            "reason": "Weekend repair",
            "starts_on": "2026-09-05",
            "ends_on": "2026-09-06",
        },
    )
    assert weekend.status_code == 201, weekend.text
    empty = client.post("/api/timetables/repair", json=repair_body(weekend.json()["id"]))
    assert empty.status_code == 409, empty.text

    missing = client.post("/api/timetables/repair", json=repair_body(9_999_999))
    assert missing.status_code == 409

    slot = published["slots"][0]
    created = client.post(
        "/api/disruptions",
        json={
            "kind": "room",
            "room_id": slot["room_id"],
            "reason": "Already repaired target",
            "starts_on": WEEKDAY_DATE[slot["weekday"]],
            "ends_on": WEEKDAY_DATE[slot["weekday"]],
            "start_period": slot["start_period"],
            "end_period": slot["end_period"],
        },
    )
    assert created.status_code == 201, created.text
    disruption_id = created.json()["id"]
    db = get_session_factory()()
    try:
        row = db.get(Disruption, disruption_id)
        assert row is not None
        row.status = "repaired"
        db.commit()
    finally:
        db.close()
    repaired = client.post("/api/timetables/repair", json=repair_body(disruption_id))
    assert repaired.status_code == 409, repaired.text


def test_room_repair_moves_affected_meetings_and_preserves_others(client: TestClient) -> None:
    published = generate_and_publish(client)
    slot = published["slots"][0]
    login(client, "admin@clashfree.test")
    created = client.post(
        "/api/disruptions",
        json={
            "kind": "room",
            "room_id": slot["room_id"],
            "reason": "Repair one published slot",
            "starts_on": WEEKDAY_DATE[slot["weekday"]],
            "ends_on": WEEKDAY_DATE[slot["weekday"]],
            "start_period": slot["start_period"],
            "end_period": slot["end_period"],
        },
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["status"] in {"open", "in_review"}
    assert body["impact"]["classes_affected"] >= 1
    affected = {
        (item["assignment_id"], item["meeting_index"]) for item in body["impact"]["classes"]
    }
    forbidden = period_span(slot["start_period"], slot["end_period"])

    repaired = client.post("/api/timetables/repair", json=repair_body(body["id"]))
    assert repaired.status_code == 200, repaired.text
    run = repaired.json()
    assert run["status"] == "feasible"
    assert run["purpose"] == "repair"
    assert run["disruption_id"] == body["id"]
    assert run["solutions"]
    best = run["solutions"][0]
    assert best["preserved_count"] > 0
    assert best["hard_violations"] == 0
    assert best["is_selected"] is True

    loaded = client.get(f"/api/timetables/runs/{run['id']}")
    assert loaded.status_code == 200
    assert loaded.json()["purpose"] == "repair"
    assert loaded.json()["solutions"][0]["moved_count"] == best["moved_count"]

    draft = client.get("/api/timetables/draft")
    assert draft.status_code == 200, draft.text
    for item in draft.json()["slots"]:
        key = (item["assignment_id"], item["meeting_index"])
        if key not in affected:
            continue
        if item["weekday"] != slot["weekday"] or item["room_id"] != slot["room_id"]:
            continue
        occupied = period_span(item["start_period"], item["end_period"])
        assert occupied.isdisjoint(forbidden)


def test_publishing_repair_marks_disruption_repaired(client: TestClient) -> None:
    published = generate_and_publish(client)
    before_number = published["version_number"]
    slot = published["slots"][0]
    login(client, "admin@clashfree.test")
    created = client.post(
        "/api/disruptions",
        json={
            "kind": "room",
            "room_id": slot["room_id"],
            "reason": "Publish repair target",
            "starts_on": WEEKDAY_DATE[slot["weekday"]],
            "ends_on": WEEKDAY_DATE[slot["weekday"]],
            "start_period": slot["start_period"],
            "end_period": slot["end_period"],
        },
    )
    assert created.status_code == 201, created.text
    disruption_id = created.json()["id"]
    repaired = client.post("/api/timetables/repair", json=repair_body(disruption_id))
    assert repaired.status_code == 200, repaired.text
    assert repaired.json()["status"] == "feasible"
    solution_id = repaired.json()["solutions"][0]["id"]
    selected = client.post(f"/api/timetables/solutions/{solution_id}/select")
    assert selected.status_code == 200, selected.text
    published_again = client.post("/api/timetables/publish", json={"notes": "repair"})
    assert published_again.status_code == 200, published_again.text
    assert published_again.json()["version_number"] == before_number + 1
    row = client.get(f"/api/disruptions/{disruption_id}")
    assert row.status_code == 200
    assert row.json()["status"] == "repaired"


def test_generate_publish_does_not_mark_disruptions_repaired(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    before = {row["id"]: row["status"] for row in client.get("/api/disruptions").json()}
    generated = client.post(
        "/api/timetables/generate",
        json={"time_limit_seconds": 10, "alternative_count": 1, "random_seed": 13},
    )
    assert generated.status_code == 200, generated.text
    assert generated.json()["purpose"] == "generate"
    assert generated.json()["disruption_id"] is None
    published = client.post("/api/timetables/publish", json={"notes": "generate-only"})
    assert published.status_code in {200, 409}, published.text
    after = {row["id"]: row["status"] for row in client.get("/api/disruptions").json()}
    assert after == before
