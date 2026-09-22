from uuid import uuid4

from fastapi.testclient import TestClient


def test_student_can_register_verify_and_sign_in(client: TestClient) -> None:
    email = f"student.{uuid4().hex[:8]}@clashfree.test"
    created = client.post(
        "/api/auth/register",
        json={"email": email, "password": "ClashFree!dev", "full_name": "Ada Tester"},
    )
    assert created.status_code == 201, created.text
    assert created.json()["user"]["role"] == "student"
    blocked = client.post("/api/auth/login", json={"email": email, "password": "ClashFree!dev"})
    assert blocked.status_code == 403
    token = client.get("/api/auth/debug/last-token", params={"email": email})
    assert token.status_code == 200
    verified = client.post("/api/auth/verify-email", json={"token": token.json()["token"]})
    assert verified.status_code == 204
    signed_in = client.post(
        "/api/auth/login",
        json={"email": email, "password": "ClashFree!dev"},
    )
    assert signed_in.status_code == 200
    assert signed_in.json()["user"]["role"] == "student"


def test_duplicate_email_is_409(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register",
        json={
            "email": "student@clashfree.test",
            "password": "ClashFree!dev",
            "full_name": "Duplicate",
        },
    )
    assert response.status_code == 409


def test_register_rejects_a_role_field(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register",
        json={
            "email": f"role.{uuid4().hex[:8]}@clashfree.test",
            "password": "ClashFree!dev",
            "full_name": "Not Admin",
            "role": "timetable_administrator",
        },
    )
    assert response.status_code == 422
