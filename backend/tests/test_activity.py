from datetime import UTC, datetime
from types import SimpleNamespace
from uuid import uuid4

from app.core.database import get_session_factory
from app.models.activity import AuditEvent, Notification
from app.models.identity import Department, User
from app.models.portal import ScheduleRequest, UserSettings
from app.models.timetable import TimetableVersion, TimetableVersionSlot
from app.services.activity_seed import AUDIT_SUMMARY, STUDENT_NOTICE, seed_phase10
from app.services.timetable import active_session
from fastapi.testclient import TestClient

SETTINGS = {
    "display_density": "comfortable",
    "week_starts_on": "mon",
    "notify_timetable_changes": True,
    "notify_requests": True,
}


def login(client: TestClient, email: str, password: str = "ClashFree!dev"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def generate_and_publish(client: TestClient) -> None:
    db = get_session_factory()()
    try:
        db.query(TimetableVersionSlot).delete()
        db.query(TimetableVersion).delete()
        db.commit()
    finally:
        db.close()
    login(client, "admin@clashfree.test")
    generated = client.post(
        "/api/timetables/generate",
        json={"time_limit_seconds": 10, "alternative_count": 1, "random_seed": 13},
    )
    assert generated.status_code == 200, generated.text
    assert generated.json()["status"] == "feasible"
    published = client.post("/api/timetables/publish", json={"notes": "Phase 10"})
    assert published.status_code == 200, published.text


def set_toggle(user_id: int, **flags: bool) -> None:
    db = get_session_factory()()
    try:
        row = db.get(UserSettings, user_id)
        payload = dict(SETTINGS)
        if row is not None and row.payload:
            payload.update(row.payload)
        payload.update(flags)
        if row is None:
            db.add(UserSettings(user_id=user_id, payload=payload))
        else:
            row.payload = payload
        db.commit()
    finally:
        db.close()


def silence_timetable_mail() -> None:
    db = get_session_factory()()
    try:
        for user in db.query(User).all():
            row = db.get(UserSettings, user.id)
            payload = dict(SETTINGS)
            payload["notify_timetable_changes"] = False
            if row is None:
                db.add(UserSettings(user_id=user.id, payload=payload))
            else:
                merged = dict(row.payload or {})
                merged.update(payload)
                row.payload = merged
        db.commit()
    finally:
        db.close()


def test_publish_notifies_without_email_when_toggle_is_off(client: TestClient, monkeypatch) -> None:
    sent: list[str] = []

    def fake_mailer():
        return SimpleNamespace(send=lambda to, subject, body: sent.append(to))

    monkeypatch.setattr("app.services.activity.get_mailer", fake_mailer)
    silence_timetable_mail()
    generate_and_publish(client)
    assert sent == []
    client.post("/api/auth/logout")
    for email in ("lecturer@clashfree.test", "student@clashfree.test"):
        login(client, email)
        titles = [row["title"] for row in client.get("/api/notifications").json()]
        assert any(title.startswith("Timetable v") for title in titles)
        client.post("/api/auth/logout")


def test_request_decision_emails_only_when_enabled(client: TestClient, monkeypatch) -> None:
    sent: list[str] = []

    def fake_mailer():
        return SimpleNamespace(send=lambda to, subject, body: sent.append(to))

    monkeypatch.setattr("app.services.activity.get_mailer", fake_mailer)
    login(client, "lecturer@clashfree.test")
    lecturer = client.get("/api/me").json()
    set_toggle(lecturer["id"], notify_requests=True)
    created = client.post(
        "/api/requests",
        json={"kind": "change", "title": f"Move {uuid4().hex[:6]}", "detail": "Please move it."},
    )
    assert created.status_code == 201, created.text
    request_id = created.json()["id"]
    client.post("/api/auth/logout")
    login(client, "coordinator@clashfree.test")
    decided = client.patch(f"/api/requests/{request_id}", json={"status": "approved"})
    assert decided.status_code == 200, decided.text
    assert "lecturer@clashfree.test" in sent
    sent.clear()
    client.post("/api/auth/logout")
    login(client, "lecturer@clashfree.test")
    set_toggle(lecturer["id"], notify_requests=False)
    second = client.post(
        "/api/requests",
        json={"kind": "change", "title": f"Move {uuid4().hex[:6]}", "detail": "Again."},
    )
    assert second.status_code == 201, second.text
    client.post("/api/auth/logout")
    login(client, "coordinator@clashfree.test")
    again = client.patch(f"/api/requests/{second.json()['id']}", json={"status": "rejected"})
    assert again.status_code == 200, again.text
    assert "lecturer@clashfree.test" not in sent
    client.post("/api/auth/logout")
    login(client, "lecturer@clashfree.test")
    titles = [row["title"] for row in client.get("/api/notifications").json()]
    assert any(title.startswith("Request approved:") for title in titles)
    assert any(title.startswith("Request rejected:") for title in titles)


def test_audit_and_university_report_are_admin_only(client: TestClient) -> None:
    login(client, "student@clashfree.test")
    assert client.get("/api/audit").status_code == 403
    assert client.get("/api/reports/university").status_code == 403


def test_department_report_hides_other_departments(client: TestClient) -> None:
    login(client, "lecturer@clashfree.test")
    created = client.post(
        "/api/requests",
        json={"kind": "change", "title": f"SWE {uuid4().hex[:6]}", "detail": "Department only."},
    )
    assert created.status_code == 201, created.text
    db = get_session_factory()()
    try:
        session = active_session(db)
        assert session is not None
        csc = db.query(Department).filter(Department.code == "CSC").one()
        lecturer = db.query(User).filter(User.email == "lecturer@clashfree.test").one()
        db.add(
            ScheduleRequest(
                session_id=session.id,
                department_id=csc.id,
                requester_id=lecturer.id,
                kind="change",
                status="pending",
                title="CSC only",
                detail="Other department",
                created_at=datetime.now(UTC),
            )
        )
        db.commit()
    finally:
        db.close()
    client.post("/api/auth/logout")
    login(client, "coordinator@clashfree.test")
    department = client.get("/api/reports/department")
    assert department.status_code == 200, department.text
    client.post("/api/auth/logout")
    login(client, "admin@clashfree.test")
    university = client.get("/api/reports/university")
    assert university.status_code == 200, university.text
    assert university.json()["pending_requests"] > department.json()["pending_requests"]


def test_mark_read_of_another_user_is_404(client: TestClient) -> None:
    db = get_session_factory()()
    try:
        admin_note = (
            db.query(Notification).filter(Notification.title == "Phase 10 admin notice").one()
        )
        admin_id = admin_note.id
    finally:
        db.close()
    login(client, "student@clashfree.test")
    denied = client.patch(f"/api/notifications/{admin_id}")
    assert denied.status_code == 404
    own = client.get("/api/notifications")
    assert own.status_code == 200
    student_note = next(row for row in own.json() if row["title"] == STUDENT_NOTICE)
    marked = client.patch(f"/api/notifications/{student_note['id']}")
    assert marked.status_code == 200
    assert marked.json()["read_at"] is not None


def test_seed_phase10_is_idempotent() -> None:
    session = get_session_factory()()
    try:
        seed_phase10(session)
        seed_phase10(session)
        notices = session.query(Notification).filter(Notification.title == STUDENT_NOTICE).count()
        audits = session.query(AuditEvent).filter(AuditEvent.summary == AUDIT_SUMMARY).count()
        assert notices == 1
        assert audits == 1
    finally:
        session.close()
