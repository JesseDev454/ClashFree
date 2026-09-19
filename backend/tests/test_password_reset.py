from datetime import UTC, datetime, timedelta

import pytest
from app.core.config import get_settings
from app.core.database import get_session_factory
from app.core.security import hash_token
from app.models.identity import EmailToken
from app.services.seed import seed_phase2
from app.services.tokens import get_debug_token
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


def test_forgot_password_does_not_reveal_accounts(client: TestClient) -> None:
    known = client.post("/api/auth/forgot-password", json={"email": "admin@clashfree.test"})
    unknown = client.post("/api/auth/forgot-password", json={"email": "missing@clashfree.test"})
    assert known.status_code == 204
    assert unknown.status_code == 204


def test_reset_password_with_debug_token(client: TestClient) -> None:
    assert (
        client.post(
            "/api/auth/forgot-password", json={"email": "lecturer@clashfree.test"}
        ).status_code
        == 204
    )
    stored = get_debug_token("lecturer@clashfree.test")
    assert stored is not None
    debug = client.get(
        "/api/auth/debug/last-token",
        params={"email": "lecturer@clashfree.test"},
    )
    assert debug.status_code == 200
    assert debug.json()["token"] == stored["token"]

    reset = client.post(
        "/api/auth/reset-password",
        json={"token": stored["token"], "password": "ClashFree!new1"},
    )
    assert reset.status_code == 204
    old = client.post(
        "/api/auth/login",
        json={"email": "lecturer@clashfree.test", "password": "ClashFree!dev"},
    )
    assert old.status_code == 401
    new = client.post(
        "/api/auth/login",
        json={"email": "lecturer@clashfree.test", "password": "ClashFree!new1"},
    )
    assert new.status_code == 200

    reused = client.post(
        "/api/auth/reset-password",
        json={"token": stored["token"], "password": "ClashFree!again"},
    )
    assert reused.status_code == 400

    session = get_session_factory()()
    try:
        seed_phase2(session)
    finally:
        session.close()


def test_expired_reset_token_is_rejected(client: TestClient) -> None:
    assert (
        client.post(
            "/api/auth/forgot-password", json={"email": "student@clashfree.test"}
        ).status_code
        == 204
    )
    stored = get_debug_token("student@clashfree.test")
    assert stored is not None
    session: Session = get_session_factory()()
    try:
        row = (
            session.query(EmailToken)
            .filter(EmailToken.token_hash == hash_token(stored["token"]))
            .one()
        )
        row.expires_at = datetime.now(UTC) - timedelta(hours=1)
        session.commit()
    finally:
        session.close()
    response = client.post(
        "/api/auth/reset-password",
        json={"token": stored["token"], "password": "ClashFree!expired"},
    )
    assert response.status_code == 400


def test_debug_token_hidden_when_debug_disabled(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AUTH_DEBUG", "false")
    get_settings.cache_clear()
    try:
        response = client.get(
            "/api/auth/debug/last-token",
            params={"email": "admin@clashfree.test"},
        )
        assert response.status_code == 404
    finally:
        get_settings.cache_clear()
