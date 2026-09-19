from datetime import datetime

from fastapi.testclient import TestClient


def test_root_describes_the_service(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    payload = response.json()
    assert payload["service"] == "clashfree-api"
    assert payload["health"] == "/health"


def test_health_writes_and_reads_a_database_row(client: TestClient) -> None:
    first = client.get("/health")
    assert first.status_code == 200
    body = first.json()
    assert body["status"] == "ok"
    assert body["database"] == "connected"
    assert body["probe"]["id"] == 1
    assert body["probe"]["source"] == "health-endpoint"
    first_seen = datetime.fromisoformat(body["probe"]["last_seen_at"])

    second = client.get("/health")
    assert second.status_code == 200
    second_seen = datetime.fromisoformat(second.json()["probe"]["last_seen_at"])
    assert second_seen >= first_seen
