from app.core.rbac import ROLE_HOME_PATH
from fastapi.testclient import TestClient


def login(client: TestClient, email: str, password: str = "ClashFree!dev"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def test_login_success_sets_cookie(client: TestClient) -> None:
    response = login(client, "admin@clashfree.test")
    assert response.status_code == 200
    body = response.json()["user"]
    assert body["role"] == "timetable_administrator"
    assert body["home_path"] == ROLE_HOME_PATH["timetable_administrator"]
    assert "generate" in body["capabilities"]
    assert client.cookies.get("clashfree_session")


def test_login_failure_is_generic(client: TestClient) -> None:
    response = login(client, "admin@clashfree.test", "wrong-password")
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"
    missing = login(client, "nobody@clashfree.test")
    assert missing.status_code == 401
    assert missing.json()["detail"] == "Invalid email or password"


def test_me_requires_session(client: TestClient) -> None:
    assert client.get("/api/me").status_code == 401
    login(client, "student@clashfree.test")
    me = client.get("/api/me")
    assert me.status_code == 200
    assert me.json()["role"] == "student"
    assert me.json()["capabilities"] == ["view"]


def test_logout_clears_session(client: TestClient) -> None:
    login(client, "lecturer@clashfree.test")
    assert client.get("/api/me").status_code == 200
    logout = client.post("/api/auth/logout")
    assert logout.status_code == 204
    assert client.get("/api/me").status_code == 401


def test_coordinator_has_department(client: TestClient) -> None:
    login(client, "coordinator@clashfree.test")
    body = client.get("/api/me").json()
    assert body["department_id"] is not None
    assert body["department_name"] == "Software Engineering"
    assert "generate" in body["capabilities"]
    assert "approveRepair" in body["capabilities"]
    assert "publish" not in body["capabilities"]
