from uuid import uuid4

from fastapi.testclient import TestClient


def login(client: TestClient, email: str, password: str = "ClashFree!dev"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def test_facilities_can_create_update_and_delete_a_room(client: TestClient) -> None:
    login(client, "facilities@clashfree.test")
    code = f"P11-{uuid4().hex[:8]}"
    created = client.post(
        "/api/rooms",
        json={
            "code": code,
            "building": "Phase 11",
            "room_type": "seminar",
            "capacity": 24,
            "equipment": "board",
            "status": "available",
        },
    )
    assert created.status_code == 201, created.text
    room_id = created.json()["id"]
    updated = client.patch(
        f"/api/rooms/{room_id}",
        json={
            "code": code,
            "building": "Phase 11",
            "room_type": "seminar",
            "capacity": 30,
            "equipment": "board",
            "status": "available",
        },
    )
    assert updated.status_code == 200
    assert updated.json()["capacity"] == 30
    deleted = client.delete(f"/api/rooms/{room_id}")
    assert deleted.status_code == 204


def test_student_and_coordinator_cannot_write_rooms(client: TestClient) -> None:
    body = {
        "code": f"P11-{uuid4().hex[:8]}",
        "building": "Phase 11",
        "room_type": "seminar",
        "capacity": 20,
        "status": "available",
    }
    for email in ("student@clashfree.test", "coordinator@clashfree.test"):
        client.post("/api/auth/logout")
        login(client, email)
        assert client.post("/api/rooms", json=body).status_code == 403
