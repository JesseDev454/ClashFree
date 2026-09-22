from datetime import UTC, datetime
from uuid import uuid4

from app.core.database import get_session_factory
from app.models.identity import User
from fastapi.testclient import TestClient


def test_neon_login_links_auth_subject(client: TestClient, monkeypatch) -> None:
    subject = f"neon-{uuid4().hex}"
    email = f"{subject}@clashfree.test"
    db = get_session_factory()()
    try:
        db.add(
            User(
                email=email,
                password_hash=None,
                full_name="Neon Tester",
                role="student",
                is_active=True,
                email_verified_at=datetime.now(UTC),
                auth_subject=subject,
                created_at=datetime.now(UTC),
            )
        )
        db.commit()
    finally:
        db.close()

    def verify(token: str) -> dict:
        if token != "good-token":
            raise ValueError("bad")
        return {"sub": subject}

    monkeypatch.setattr("app.api.auth.neon_configured", lambda: True)
    monkeypatch.setattr("app.api.auth.verify_neon_token", verify)
    signed_in = client.post("/api/auth/neon", json={"token": "good-token"})
    assert signed_in.status_code == 200, signed_in.text
    assert signed_in.json()["user"]["email"] == email
    unknown = client.post("/api/auth/neon", json={"token": "other-token"})
    assert unknown.status_code == 401
    password = client.post("/api/auth/login", json={"email": email, "password": "ClashFree!dev"})
    assert password.status_code == 401
    register = client.post(
        "/api/auth/register",
        json={
            "email": f"new.{uuid4().hex[:8]}@clashfree.test",
            "password": "ClashFree!dev",
            "full_name": "No",
        },
    )
    assert register.status_code == 501
