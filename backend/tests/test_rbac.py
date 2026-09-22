from fastapi.testclient import TestClient

ROLES = {
    "admin@clashfree.test": None,
    "coordinator@clashfree.test": 403,
    "lecturer@clashfree.test": 403,
    "facilities@clashfree.test": 403,
    "student@clashfree.test": 403,
}


def login(client: TestClient, email: str, password: str = "ClashFree!dev"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def test_generate_is_admin_only(client: TestClient) -> None:
    for email, expected in ROLES.items():
        client.post("/api/auth/logout")
        login(client, email)
        response = client.post(
            "/api/timetables/generate",
            json={"time_limit_seconds": 8, "alternative_count": 1, "random_seed": 1},
        )
        if expected is None:
            assert response.status_code == 200, email
            assert response.json()["status"] in {"feasible", "infeasible", "failed"}
        else:
            assert response.status_code == expected, email


def test_publish_is_admin_only(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    generate = client.post(
        "/api/timetables/generate",
        json={"time_limit_seconds": 8, "alternative_count": 1, "random_seed": 4},
    )
    assert generate.status_code == 200
    for email, expected in ROLES.items():
        client.post("/api/auth/logout")
        login(client, email)
        response = client.post("/api/timetables/publish", json={"notes": "RBAC"})
        if expected is None:
            assert response.status_code in {200, 409}, email
        else:
            assert response.status_code == expected, email


def test_repair_is_admin_only(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    missing = client.post(
        "/api/timetables/repair",
        json={"disruption_id": 9_999_999, "time_limit_seconds": 10, "alternative_count": 1},
    )
    assert missing.status_code == 409
    client.post("/api/auth/logout")
    login(client, "lecturer@clashfree.test")
    denied = client.post(
        "/api/timetables/repair",
        json={"disruption_id": 1, "time_limit_seconds": 10, "alternative_count": 1},
    )
    assert denied.status_code == 403


def test_unauthenticated_capability_routes_are_401(client: TestClient) -> None:
    for path in (
        "/api/timetables/generate",
        "/api/timetables/publish",
        "/api/timetables/repair",
        "/api/disruptions",
    ):
        assert client.post(path).status_code == 401


def test_disruption_post_is_forbidden_for_coordinator(client: TestClient) -> None:
    login(client, "coordinator@clashfree.test")
    response = client.post(
        "/api/disruptions",
        json={
            "kind": "room",
            "room_id": 1,
            "reason": "blocked",
            "starts_on": "2026-09-22",
            "ends_on": "2026-09-23",
        },
    )
    assert response.status_code == 403
