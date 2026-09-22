from uuid import uuid4

from app.core.database import get_session_factory
from app.models.portal import DepartmentConstraint
from app.services.portal_seed import DEMO_NOTE, seed_phase9
from app.services.solver import (
    LecturerOption,
    MeetingDemand,
    RoomOption,
    SoftFlags,
    SolverSnapshot,
    Weights,
    _solve_once,
)
from app.services.timetable import build_snapshot
from fastapi.testclient import TestClient


def login(client: TestClient, email: str, password: str = "ClashFree!dev"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def test_users_are_admin_only(client: TestClient) -> None:
    assert client.get("/api/users").status_code == 401
    login(client, "coordinator@clashfree.test")
    assert client.get("/api/users").status_code == 403
    client.post("/api/auth/logout")
    login(client, "admin@clashfree.test")
    listed = client.get("/api/users")
    assert listed.status_code == 200
    emails = {row["email"] for row in listed.json()}
    assert "student@clashfree.test" in emails


def test_student_requires_cohort_and_last_admin_stays(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    departments = client.get("/api/departments")
    assert departments.status_code == 200
    swe = next(row for row in departments.json() if row["code"] == "SWE")
    created = client.post(
        "/api/users",
        json={
            "email": "nocohort@clashfree.test",
            "full_name": "No Cohort",
            "role": "student",
            "password": "ClashFree!dev",
            "department_id": swe["id"],
        },
    )
    assert created.status_code == 422, created.text
    admin = next(
        row for row in client.get("/api/users").json() if row["role"] == "timetable_administrator"
    )
    blocked = client.patch(f"/api/users/{admin['id']}", json={"is_active": False})
    assert blocked.status_code == 409, blocked.text


def test_inactive_login_is_401(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    created = client.post(
        "/api/users",
        json={
            "email": f"inactive-{uuid4().hex[:8]}@clashfree.test",
            "full_name": "Inactive User",
            "role": "facilities_manager",
            "password": "ClashFree!dev",
        },
    )
    assert created.status_code == 201, created.text
    user_id = created.json()["id"]
    updated = client.patch(f"/api/users/{user_id}", json={"is_active": False})
    assert updated.status_code == 200, updated.text
    client.post("/api/auth/logout")
    denied = login(client, created.json()["email"])
    assert denied.status_code == 401


def test_coordinator_cannot_write_another_department(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    departments = client.get("/api/departments").json()
    other = next(row for row in departments if row["code"] != "SWE")
    client.post("/api/auth/logout")
    login(client, "coordinator@clashfree.test")
    created = client.post(
        "/api/department/courses",
        json={
            "code": "CSC 499",
            "title": "Outside",
            "department_id": other["id"],
            "level": 400,
            "units": 3,
            "expected_size": 20,
            "room_type": "lecture_hall",
        },
    )
    assert created.status_code == 403, created.text
    own = client.get("/api/department/courses")
    assert own.status_code == 200
    assert own.json()
    assert all(row["department_id"] != other["id"] for row in own.json())


def test_personal_and_department_timetables(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    generated = client.post(
        "/api/timetables/generate",
        json={"time_limit_seconds": 10, "alternative_count": 1, "random_seed": 13},
    )
    assert generated.status_code == 200, generated.text
    assert generated.json()["status"] == "feasible"
    published = client.post("/api/timetables/publish", json={"notes": "phase-9"})
    assert published.status_code in {200, 409}, published.text
    current = client.get("/api/timetables/published")
    assert current.status_code == 200, current.text
    slots = current.json()["slots"]
    assert slots
    assert slots[0]["lecturer_id"] is not None
    assert slots[0]["cohort_id"] is not None
    client.post("/api/auth/logout")

    login(client, "lecturer@clashfree.test")
    mine = client.get("/api/timetables/published/mine")
    assert mine.status_code == 200, mine.text
    assert mine.json()["slots"]
    assert all(slot["lecturer_name"] == "Dr. Amina Yusuf" for slot in mine.json()["slots"])
    courses = client.get("/api/me/courses")
    assert courses.status_code == 200, courses.text
    assert courses.json()
    client.post("/api/auth/logout")

    login(client, "student@clashfree.test")
    student = client.get("/api/timetables/published/mine")
    assert student.status_code == 200, student.text
    assert student.json()["slots"]
    assert all(slot["cohort_code"] == "SWE-300-A" for slot in student.json()["slots"])
    client.post("/api/auth/logout")

    login(client, "coordinator@clashfree.test")
    department = client.get("/api/timetables/published/department")
    assert department.status_code == 200, department.text
    assert department.json()["slots"]
    assert all(
        slot["department_name"] == "Software Engineering" for slot in department.json()["slots"]
    )
    client.post("/api/auth/logout")
    login(client, "student@clashfree.test")
    assert client.get("/api/timetables/published/department").status_code == 403


def test_scoped_generate_keeps_other_department(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    both = client.post(
        "/api/timetables/generate",
        json={
            "faculty_id": 1,
            "department_id": 1,
            "time_limit_seconds": 10,
            "alternative_count": 1,
        },
    )
    assert both.status_code == 422
    published = client.get("/api/timetables/published")
    if published.status_code != 200:
        generated = client.post(
            "/api/timetables/generate",
            json={"time_limit_seconds": 10, "alternative_count": 1, "random_seed": 13},
        )
        assert generated.status_code == 200, generated.text
        client.post("/api/timetables/publish", json={"notes": "scope"})
        published = client.get("/api/timetables/published")
    assert published.status_code == 200, published.text
    outside = next(
        slot
        for slot in published.json()["slots"]
        if slot["department_name"] != "Software Engineering"
    )
    swe = next(row for row in client.get("/api/departments").json() if row["code"] == "SWE")
    scoped = client.post(
        "/api/timetables/generate",
        json={
            "department_id": swe["id"],
            "time_limit_seconds": 10,
            "alternative_count": 1,
            "random_seed": 13,
        },
    )
    assert scoped.status_code == 200, scoped.text
    assert scoped.json()["status"] == "feasible"
    draft = client.get("/api/timetables/draft")
    assert draft.status_code == 200, draft.text
    match = next(
        slot
        for slot in draft.json()["slots"]
        if slot["assignment_id"] == outside["assignment_id"]
        and slot["meeting_index"] == outside["meeting_index"]
    )
    assert match["weekday"] == outside["weekday"]
    assert match["start_period"] == outside["start_period"]
    assert match["room_id"] == outside["room_id"]


def test_requests_follow_role_rules(client: TestClient) -> None:
    login(client, "student@clashfree.test")
    denied = client.post(
        "/api/requests",
        json={"kind": "change", "title": "Move class", "detail": "Please move Friday."},
    )
    assert denied.status_code == 403
    client.post("/api/auth/logout")
    login(client, "lecturer@clashfree.test")
    wrong = client.post(
        "/api/requests",
        json={"kind": "scheduling", "title": "Extra lab", "detail": "Need another lab."},
    )
    assert wrong.status_code == 422
    created = client.post(
        "/api/requests",
        json={"kind": "change", "title": "Move class", "detail": "Please move Friday."},
    )
    assert created.status_code == 201, created.text
    request_id = created.json()["id"]
    own = client.get("/api/requests")
    assert own.status_code == 200
    assert any(row["id"] == request_id for row in own.json())
    client.post("/api/auth/logout")
    login(client, "coordinator@clashfree.test")
    decided = client.patch(f"/api/requests/{request_id}", json={"status": "approved"})
    assert decided.status_code == 200, decided.text
    assert decided.json()["status"] == "approved"


def test_settings_roundtrip(client: TestClient) -> None:
    login(client, "lecturer@clashfree.test")
    saved = client.put(
        "/api/me/settings",
        json={
            "display_density": "compact",
            "week_starts_on": "mon",
            "notify_timetable_changes": False,
            "notify_requests": True,
        },
    )
    assert saved.status_code == 200, saved.text
    loaded = client.get("/api/me/settings")
    assert loaded.status_code == 200
    assert loaded.json()["display_density"] == "compact"
    assert loaded.json()["notify_timetable_changes"] is False
    profile = client.patch("/api/me", json={"full_name": "Dr. Amina Yusuf"})
    assert profile.status_code == 200
    assert profile.json()["full_name"] == "Dr. Amina Yusuf"


def test_blocked_period_is_not_a_solver_option() -> None:
    meeting = MeetingDemand(
        assignment_id=1,
        meeting_index=0,
        span=1,
        lecturer_id=1,
        cohort_id=1,
        expected_size=20,
        room_type="lecture_hall",
        course_code="SWE101",
        cohort_code="SWE-300-A",
        lecturer_name="Ada",
        department_id=1,
        blocked={("mon", "08-10")},
    )
    room = RoomOption(
        id=1,
        code="LT1",
        building="Main",
        room_type="lecture_hall",
        capacity=40,
        forbidden=set(),
    )
    snapshot = SolverSnapshot(
        meetings=[meeting],
        rooms=[room],
        lecturers={1: LecturerOption(id=1, name="Ada", forbidden=set(), preferred=set())},
        incomplete=[],
        weights=Weights(),
        flags=SoftFlags(),
        time_limit_seconds=5,
        alternative_count=1,
        random_seed=1,
    )
    (status, _message, solution), _elapsed = _solve_once(snapshot, 1)
    assert status == "feasible"
    assert solution is not None
    placement = solution.placements[0]
    assert (placement.weekday, placement.start_period) != ("mon", "08-10")


def test_department_block_is_attached_to_snapshot() -> None:
    session = get_session_factory()()
    try:
        from app.models.identity import Department

        swe = session.query(Department).filter(Department.code == "SWE").one()
        row = DepartmentConstraint(
            department_id=swe.id,
            kind="blocked_period",
            weekday="fri",
            period="16-18",
            note="phase9-test-block",
        )
        session.add(row)
        session.commit()
        snapshot = build_snapshot(session, 5, 1, 1)
        swe_meetings = [item for item in snapshot.meetings if item.department_id == swe.id]
        assert swe_meetings
        assert all(("fri", "16-18") in item.blocked for item in swe_meetings)
        session.delete(row)
        session.commit()
    finally:
        session.close()


def test_seed_phase9_is_idempotent() -> None:
    session = get_session_factory()()
    try:
        seed_phase9(session)
        seed_phase9(session)
        count = (
            session.query(DepartmentConstraint)
            .filter(DepartmentConstraint.note == DEMO_NOTE)
            .count()
        )
        assert count == 1
        from app.models.identity import User

        student = session.query(User).filter(User.email == "student@clashfree.test").one()
        assert student.cohort_id is not None
    finally:
        session.close()
