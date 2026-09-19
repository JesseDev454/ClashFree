from app.api import health as health_api
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError


def test_health_returns_503_when_the_database_is_down(client: TestClient, monkeypatch) -> None:
    def fail_probe(_session: object, *, source: str = "health-endpoint") -> None:
        raise OperationalError("SELECT 1", None, Exception("connection refused"))

    monkeypatch.setattr(health_api, "write_and_read_probe", fail_probe)
    response = client.get("/health")
    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "error"
    assert body["database"] == "unavailable"
    assert "Database is not reachable" in body["detail"]
