import os
from collections.abc import Generator

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient


def pytest_configure() -> None:
    os.environ.setdefault(
        "DATABASE_URL",
        "postgresql+psycopg://clashfree:clashfree@127.0.0.1:5433/clashfree",
    )
    os.environ.setdefault("SESSION_SECRET", "test-session-secret")
    os.environ.setdefault("AUTH_DEBUG", "true")
    os.environ.setdefault("SEED_PASSWORD", "ClashFree!dev")
    os.environ.setdefault("COOKIE_SECURE", "false")


@pytest.fixture(scope="session", autouse=True)
def apply_migrations() -> None:
    from app.core.config import get_settings
    from app.core.database import get_session_factory, reset_engine
    from app.services.disruption_seed import seed_phase7
    from app.services.seed import seed_phase2

    get_settings.cache_clear()
    reset_engine()
    config = Config("alembic.ini")
    command.upgrade(config, "head")
    session = get_session_factory()()
    try:
        seed_phase2(session)
        seed_phase7(session)
    finally:
        session.close()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    from app.core.config import get_settings
    from app.main import app

    get_settings.cache_clear()
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def seed_password() -> str:
    return "ClashFree!dev"
