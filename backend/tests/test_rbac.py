import pytest
from fastapi.testclient import TestClient

ROLES = {
    "admin@clashfree.test": 501,
    "coordinator@clashfree.test": 403,
    "lecturer@clashfree.test": 403,
    "facilities@clashfree.test": 403,
    "student@clashfree.test": 403,
}

ENDPOINTS = (
    "/api/timetables/generate",
    "/api/timetables/repair",
    "/api/timetables/publish",
)


@pytest.mark.parametrize("email,expected", list(ROLES.items()))
@pytest.mark.parametrize("path", ENDPOINTS)
def test_capability_stubs(client: TestClient, email: str, expected: int, path: str) -> None:
    client.post("/api/auth/login", json={"email": email, "password": "ClashFree!dev"})
    response = client.post(path)
    assert response.status_code == expected


def test_unauthenticated_capability_routes_are_401(client: TestClient) -> None:
    for path in ENDPOINTS:
        assert client.post(path).status_code == 401
