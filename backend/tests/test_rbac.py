from fastapi.testclient import TestClient

ROLES = {
    "admin@clashfree.test": None,
    "coordinator@clashfree.test": 403,
    "lecturer@clashfree.test": 403,
    "facilities@clashfree.test": 403,
    "student@clashfree.test": 403,
}

STUBS = {
    "/api/timetables/repair": 501,
    "/api/timetables/publish": 501,
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


def test_repair_and_publish_remain_stubs(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    for path, code in STUBS.items():
        assert client.post(path).status_code == code
    client.post("/api/auth/logout")
    login(client, "lecturer@clashfree.test")
    for path in STUBS:
        assert client.post(path).status_code == 403


def test_unauthenticated_capability_routes_are_401(client: TestClient) -> None:
    for path in ("/api/timetables/generate", *STUBS):
        assert client.post(path).status_code == 401
