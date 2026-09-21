from app.core.database import get_session_factory
from app.models.academic import Room
from app.services.solver import (
    LecturerOption,
    MeetingDemand,
    SoftFlags,
    SolverSnapshot,
    Weights,
    parse_contact_pattern,
    solve_snapshot,
)
from app.services.timetable_seed import seed_phase5
from fastapi.testclient import TestClient


def login(client: TestClient, email: str, password: str = "ClashFree!dev"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def occupied(item: dict) -> list[tuple[str, str]]:
    periods = ("08-10", "10-12", "12-14", "14-16", "16-18")
    start = periods.index(item["start_period"])
    end = periods.index(item["end_period"])
    return [(item["weekday"], periods[index]) for index in range(start, end + 1)]


def test_parse_contact_pattern() -> None:
    assert parse_contact_pattern("2 x 2h") == (2, 1)
    assert parse_contact_pattern("1 x 3h") == (1, 2)
    assert parse_contact_pattern("1 x 2h") == (1, 1)


def test_seed_phase5_is_idempotent() -> None:
    session = get_session_factory()()
    try:
        seed_phase5(session)
        seed_phase5(session)
        lab = session.query(Room).filter(Room.code == "Science Lab").one()
        ict = session.query(Room).filter(Room.code == "ICT Lab 1").one()
        assert lab.room_type == "lab"
        assert lab.capacity == 120
        assert ict.capacity == 90
    finally:
        session.close()


def test_preflight_matches_solver_ready_seed(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    body = client.get("/api/timetables/preflight").json()
    assert body["ready_assignments"] == 6
    assert body["incomplete_assignments"] == 2
    assert "GST 203" in body["incomplete_codes"]
    assert "CSC 201" in body["incomplete_codes"]
    assert body["can_generate"] is True
    rooms = client.get("/api/rooms").json()
    assert any(item["code"] == "Science Lab" for item in rooms)


def test_admin_generate_is_feasible(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    response = client.post(
        "/api/timetables/generate",
        json={"time_limit_seconds": 10, "alternative_count": 1, "random_seed": 7},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "feasible"
    assert body["solutions"]
    selected = next(item for item in body["solutions"] if item["is_selected"])
    assert selected["hard_violations"] == 0
    draft = client.get("/api/timetables/draft")
    assert draft.status_code == 200
    payload = draft.json()
    assert payload["solution"]["id"] == selected["id"]
    slots = payload["slots"]
    meetings = {(item["assignment_id"], item["meeting_index"]) for item in slots}
    assert len(meetings) == 10


def test_generated_slots_have_no_clashes(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    client.post(
        "/api/timetables/generate",
        json={"time_limit_seconds": 10, "alternative_count": 1, "random_seed": 11},
    )
    slots = client.get("/api/timetables/draft").json()["slots"]

    def unique(key_fn) -> None:
        keys = []
        for item in slots:
            for weekday, period in occupied(item):
                keys.append((*key_fn(item), weekday, period))
        assert len(keys) == len(set(keys))

    unique(lambda item: (item["room_id"],))
    unique(lambda item: (item["lecturer_name"],))
    unique(lambda item: (item["cohort_code"],))


def test_amina_has_no_wednesday_slots(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    client.post(
        "/api/timetables/generate",
        json={"time_limit_seconds": 10, "alternative_count": 1, "random_seed": 3},
    )
    slots = client.get("/api/timetables/draft").json()["slots"]
    amina = [item for item in slots if item["lecturer_name"] == "Dr. Amina Yusuf"]
    assert amina
    assert all(item["weekday"] != "wed" for item in amina)


def test_excluded_rooms_are_never_used(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    client.post(
        "/api/timetables/generate",
        json={"time_limit_seconds": 10, "alternative_count": 1, "random_seed": 5},
    )
    slots = client.get("/api/timetables/draft").json()["slots"]
    codes = {item["room_code"] for item in slots}
    assert "LT2" not in codes
    assert "ICT Lab 2" not in codes
    assert any(item["course_code"] == "PHY 301" for item in slots)
    phy = next(item for item in slots if item["course_code"] == "PHY 301")
    assert phy["room_code"] == "Science Lab"


def test_lecturer_cannot_generate(client: TestClient) -> None:
    login(client, "lecturer@clashfree.test")
    response = client.post("/api/timetables/generate", json={"time_limit_seconds": 5})
    assert response.status_code == 403


def test_student_cannot_read_draft(client: TestClient) -> None:
    login(client, "student@clashfree.test")
    assert client.get("/api/timetables/preflight").status_code == 403
    assert client.get("/api/timetables/draft").status_code == 403


def test_unauthenticated_timetable_routes_are_401(client: TestClient) -> None:
    assert client.get("/api/timetables/preflight").status_code == 401
    assert client.post("/api/timetables/generate").status_code == 401
    assert client.get("/api/timetables/draft").status_code == 401


def test_validate_round_trip(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    client.post(
        "/api/timetables/generate",
        json={"time_limit_seconds": 10, "alternative_count": 1, "random_seed": 9},
    )
    before = client.get("/api/timetables/conflicts").json()
    after = client.post("/api/timetables/validate").json()
    assert [item["kind"] for item in after] == [item["kind"] for item in before]


def test_infeasible_snapshot_does_not_raise() -> None:
    snapshot = SolverSnapshot(
        meetings=[
            MeetingDemand(
                assignment_id=1,
                meeting_index=0,
                span=1,
                lecturer_id=1,
                cohort_id=1,
                expected_size=40,
                room_type="lab",
                course_code="X 101",
                cohort_code="X-1",
                lecturer_name="A",
            )
        ],
        rooms=[],
        lecturers={
            1: LecturerOption(id=1, name="A", forbidden=set(), preferred=set()),
        },
        incomplete=[],
        weights=Weights(),
        flags=SoftFlags(),
        time_limit_seconds=2,
        alternative_count=1,
        random_seed=1,
    )
    result = solve_snapshot(snapshot)
    assert result.status == "infeasible"
    assert result.solutions == []


def test_select_solution_leaves_one_current(client: TestClient) -> None:
    login(client, "admin@clashfree.test")
    generated = client.post(
        "/api/timetables/generate",
        json={"time_limit_seconds": 10, "alternative_count": 2, "random_seed": 2},
    )
    assert generated.status_code == 200
    solutions = generated.json()["solutions"]
    assert solutions
    chosen = solutions[-1]
    activated = client.post(f"/api/timetables/solutions/{chosen['id']}/select")
    assert activated.status_code == 200
    assert activated.json()["is_selected"] is True
    refreshed = client.get("/api/timetables/runs").json()[0]["solutions"]
    currents = [item for item in refreshed if item["is_selected"]]
    assert len(currents) == 1
    assert currents[0]["id"] == chosen["id"]
