from app.core.database import get_session_factory
from app.models.academic import Room
from app.services.constraints_seed import seed_phase4
from fastapi.testclient import TestClient


def login(client: TestClient, email: str, password: str = "ClashFree!dev"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def all_slots(state: str = "available"):
    weekdays = ("mon", "tue", "wed", "thu", "fri")
    periods = ("08-10", "10-12", "12-14", "14-16", "16-18")
    return [
        {"weekday": weekday, "period": period, "state": state}
        for weekday in weekdays
        for period in periods
    ]


def test_summary_matches_seed(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    body = client.get("/api/constraints/summary").json()
    assert body["hard"] == 6
    assert body["soft"] == 5
    assert body["soft_enabled"] == 5
    assert body["department_rules"] == 0
    assert body["current_profile"] == "Balanced"
    assert body["validation_percent"] == 100


def test_seed_phase4_is_idempotent() -> None:
    session = get_session_factory()()
    try:
        seed_phase4(session)
        seed_phase4(session)
    finally:
        session.close()


def test_soft_constraint_toggle_round_trip(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    rows = client.get("/api/constraints").json()
    soft = next(item for item in rows if item["code"] == "minimize_student_idle_gaps")
    disabled = client.patch(f"/api/constraints/{soft['id']}", json={"enabled": False})
    assert disabled.status_code == 200
    assert disabled.json()["enabled"] is False
    enabled = client.patch(f"/api/constraints/{soft['id']}", json={"enabled": True})
    assert enabled.status_code == 200
    assert enabled.json()["enabled"] is True


def test_hard_constraint_cannot_be_disabled(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    rows = client.get("/api/constraints").json()
    hard = next(item for item in rows if item["code"] == "no_lecturer_clash")
    response = client.patch(f"/api/constraints/{hard['id']}", json={"enabled": False})
    assert response.status_code == 409


def test_only_one_current_weight_profile(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    profiles = client.get("/api/constraint-weights").json()
    current = next(item for item in profiles if item["is_current"])
    assert current["code"] == "balanced"
    other = next(item for item in profiles if item["code"] == "repair_stability")
    activated = client.post(f"/api/constraint-weights/{other['id']}/activate")
    assert activated.status_code == 200
    refreshed = client.get("/api/constraint-weights").json()
    currents = [item for item in refreshed if item["is_current"]]
    assert len(currents) == 1
    assert currents[0]["code"] == "repair_stability"
    restore = client.post(f"/api/constraint-weights/{current['id']}/activate")
    assert restore.status_code == 200


def test_save_weight_values(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    profiles = client.get("/api/constraint-weights").json()
    current = next(item for item in profiles if item["is_current"])
    patched = client.patch(
        f"/api/constraint-weights/{current['id']}",
        json={
            "schedule_stability": 8,
            "student_idle_gaps": 7,
            "room_utilization": 6,
            "lecturer_preferences": 5,
            "daily_balance": 4,
            "building_movement": 3,
        },
    )
    assert patched.status_code == 200
    assert patched.json()["schedule_stability"] == 8
    client.patch(
        f"/api/constraint-weights/{current['id']}",
        json={
            "schedule_stability": 9,
            "student_idle_gaps": 7,
            "room_utilization": 6,
            "lecturer_preferences": 5,
            "daily_balance": 4,
            "building_movement": 3,
        },
    )


def test_lecturer_can_update_own_availability(client: TestClient) -> None:
    login(client, "lecturer@clashfree.test")
    body = client.get("/api/me/availability").json()
    assert body["submitted"] is True
    assert body["lecturer_name"] == "Dr. Amina Yusuf"
    slots = all_slots("available")
    slots[0]["state"] = "preferred"
    saved = client.put("/api/me/availability", json={"slots": slots})
    assert saved.status_code == 200
    assert saved.json()["preferred_slots"] == 1
    restored = client.put("/api/me/availability", json={"slots": body["slots"]})
    assert restored.status_code == 200


def test_lecturer_cannot_write_another_lecturer_availability(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    lecturers = client.get("/api/lecturers").json()
    other = next(item for item in lecturers if item["full_name"] != "Dr. Amina Yusuf")
    client.post("/api/auth/logout")
    login(client, "lecturer@clashfree.test")
    forbidden = client.put(
        f"/api/lecturers/{other['id']}/availability",
        json={"slots": all_slots()},
    )
    assert forbidden.status_code == 403
    other_get = client.get(f"/api/lecturers/{other['id']}/availability")
    assert other_get.status_code == 403


def test_admin_can_read_lecturer_availability(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    lecturers = client.get("/api/lecturers").json()
    amina = next(item for item in lecturers if item["full_name"] == "Dr. Amina Yusuf")
    response = client.get(f"/api/lecturers/{amina['id']}/availability")
    assert response.status_code == 200
    assert response.json()["submitted"] is True


def test_lecturer_preferences_round_trip(client: TestClient) -> None:
    login(client, "lecturer@clashfree.test")
    current = client.get("/api/me/preferences").json()
    assert current["prefer_morning"] is True
    saved = client.put(
        "/api/me/preferences",
        json={
            "prefer_morning": True,
            "avoid_friday_afternoon": False,
            "no_early_after_late": True,
            "max_classes_per_day": 3,
            "max_consecutive_hours": 4,
            "min_break_minutes": 60,
            "preferred_days": ["mon", "tue", "thu"],
        },
    )
    assert saved.status_code == 200
    assert saved.json()["avoid_friday_afternoon"] is False
    client.put("/api/me/preferences", json={**current, "lecturer_id": current["lecturer_id"]})


def test_facilities_can_patch_room_availability(client: TestClient) -> None:
    login(client, "facilities@clashfree.test")
    rooms = client.get("/api/rooms").json()
    lt1 = next(item for item in rooms if item["code"] == "LT1")
    current = client.get(f"/api/rooms/{lt1['id']}/availability")
    assert current.status_code == 200
    slots = all_slots("available")
    saved = client.put(f"/api/rooms/{lt1['id']}/availability", json={"slots": slots})
    assert saved.status_code == 200
    restore = client.put(
        f"/api/rooms/{lt1['id']}/availability",
        json={"slots": current.json()["slots"]},
    )
    assert restore.status_code == 200


def test_lecturer_cannot_write_room_availability(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    rooms = client.get("/api/rooms").json()
    lt1 = next(item for item in rooms if item["code"] == "LT1")
    client.post("/api/auth/logout")
    login(client, "lecturer@clashfree.test")
    response = client.put(
        f"/api/rooms/{lt1['id']}/availability",
        json={"slots": all_slots()},
    )
    assert response.status_code == 403


def test_unauthenticated_constraint_routes_are_401(client: TestClient) -> None:
    assert client.get("/api/constraints").status_code == 401
    assert client.get("/api/me/availability").status_code == 401
    session = get_session_factory()()
    try:
        room = session.query(Room).filter(Room.code == "LT1").one()
        room_id = room.id
    finally:
        session.close()
    assert client.get(f"/api/rooms/{room_id}/availability").status_code == 401


def test_student_and_coordinator_cannot_write_constraints(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    rows = client.get("/api/constraints").json()
    soft = next(item for item in rows if item["kind"] == "soft")
    for email in ("student@clashfree.test", "coordinator@clashfree.test"):
        client.post("/api/auth/logout")
        login(client, email)
        response = client.patch(f"/api/constraints/{soft['id']}", json={"enabled": False})
        assert response.status_code == 403, email


def test_invalid_slot_state_is_422(client: TestClient) -> None:
    login(client, "lecturer@clashfree.test")
    slots = all_slots()
    slots[0]["state"] = "maybe"
    response = client.put("/api/me/availability", json={"slots": slots})
    assert response.status_code == 422


def test_invalid_period_is_422(client: TestClient) -> None:
    login(client, "lecturer@clashfree.test")
    slots = all_slots()
    slots[0]["period"] = "09-11"
    response = client.put("/api/me/availability", json={"slots": slots})
    assert response.status_code == 422


def test_lecturer_exception_crud(client: TestClient) -> None:
    login(client, "lecturer@clashfree.test")
    created = client.post(
        "/api/me/availability/exceptions",
        json={
            "starts_on": "2026-11-03",
            "ends_on": "2026-11-03",
            "reason": "Senate meeting",
            "kind": "unavailable",
        },
    )
    assert created.status_code == 201
    exception_id = created.json()["id"]
    deleted = client.delete(f"/api/me/availability/exceptions/{exception_id}")
    assert deleted.status_code == 204
