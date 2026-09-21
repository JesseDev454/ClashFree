from app.core.database import get_session_factory
from app.services.academic_seed import seed_phase3
from fastapi.testclient import TestClient


def login(client: TestClient, email: str, password: str = "ClashFree!dev"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def admin(client: TestClient) -> TestClient:
    login(client, "admin@clashfree.test")
    return client


def test_summary_matches_seed(client: TestClient) -> None:
    admin(client)
    body = client.get("/api/academic/summary").json()
    assert body["courses"] == 8
    assert body["lecturers"] == 5
    assert body["cohorts"] == 4
    assert body["rooms"] == 7
    assert body["faculties"] == 1
    assert body["departments"] == 2
    assert body["active_session_label"] == "2026/2027"
    assert body["active_semester"] == "first"


def test_seed_phase3_is_idempotent() -> None:
    session = get_session_factory()()
    try:
        seed_phase3(session)
        seed_phase3(session)
    finally:
        session.close()


def test_course_crud_round_trip(client: TestClient) -> None:
    admin(client)
    departments = client.get("/api/departments").json()
    swe = next(item for item in departments if item["code"] == "SWE")
    created = client.post(
        "/api/courses",
        json={
            "code": "SWE 499",
            "title": "Capstone",
            "department_id": swe["id"],
            "level": 400,
            "units": 3,
            "expected_size": 40,
            "room_type": "seminar",
        },
    )
    assert created.status_code == 201
    course_id = created.json()["id"]
    assert created.json()["status"] == "draft"
    listed = client.get("/api/courses", params={"q": "SWE 499"})
    assert any(item["id"] == course_id for item in listed.json())
    updated = client.patch(
        f"/api/courses/{course_id}",
        json={
            "code": "SWE 499",
            "title": "Capstone Project",
            "department_id": swe["id"],
            "level": 400,
            "units": 4,
            "expected_size": 40,
            "room_type": "seminar",
        },
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Capstone Project"
    deleted = client.delete(f"/api/courses/{course_id}")
    assert deleted.status_code == 204


def test_duplicate_course_code_is_conflict(client: TestClient) -> None:
    admin(client)
    departments = client.get("/api/departments").json()
    swe = next(item for item in departments if item["code"] == "SWE")
    duplicate = client.post(
        "/api/courses",
        json={
            "code": "SWE 401",
            "title": "Duplicate",
            "department_id": swe["id"],
            "level": 400,
            "units": 3,
            "expected_size": 10,
            "room_type": "lecture_hall",
        },
    )
    assert duplicate.status_code == 409


def test_duplicate_room_and_cohort_codes(client: TestClient) -> None:
    admin(client)
    departments = client.get("/api/departments").json()
    swe = next(item for item in departments if item["code"] == "SWE")
    room = client.post(
        "/api/rooms",
        json={
            "code": "LT1",
            "building": "Engineering Block",
            "room_type": "lecture_hall",
            "capacity": 10,
            "status": "available",
        },
    )
    assert room.status_code == 409
    cohort = client.post(
        "/api/cohorts",
        json={
            "code": "SWE-400-A",
            "department_id": swe["id"],
            "level": 400,
            "size": 10,
            "status": "complete",
        },
    )
    assert cohort.status_code == 409


def test_only_one_active_session(client: TestClient) -> None:
    admin(client)
    sessions = client.get("/api/sessions").json()
    archived = next(item for item in sessions if item["status"] == "archived")
    activated = client.post(f"/api/sessions/{archived['id']}/activate")
    assert activated.status_code == 200
    assert activated.json()["status"] == "active"
    refreshed = client.get("/api/sessions").json()
    active = [item for item in refreshed if item["status"] == "active"]
    assert len(active) == 1
    assert active[0]["id"] == archived["id"]
    original = next(item for item in sessions if item["label"] == "2026/2027")
    restore = client.post(f"/api/sessions/{original['id']}/activate")
    assert restore.status_code == 200


def test_cannot_delete_course_with_assignments(client: TestClient) -> None:
    admin(client)
    courses = client.get("/api/courses").json()
    assigned = next(item for item in courses if item["code"] == "SWE 401")
    response = client.delete(f"/api/courses/{assigned['id']}")
    assert response.status_code == 409


def test_cannot_delete_department_in_use(client: TestClient) -> None:
    admin(client)
    departments = client.get("/api/departments").json()
    swe = next(item for item in departments if item["code"] == "SWE")
    response = client.delete(f"/api/departments/{swe['id']}")
    assert response.status_code == 409


def test_unauthenticated_academic_routes_are_401(client: TestClient) -> None:
    assert client.get("/api/academic/summary").status_code == 401
    assert client.get("/api/courses").status_code == 401
    assert client.post("/api/courses", json={}).status_code == 401


def test_non_admin_cannot_write_courses(client: TestClient) -> None:
    payload = {
        "code": "SWE 498",
        "title": "Forbidden",
        "department_id": 1,
        "level": 400,
        "units": 3,
        "expected_size": 10,
        "room_type": "lecture_hall",
    }
    for email in (
        "student@clashfree.test",
        "lecturer@clashfree.test",
        "coordinator@clashfree.test",
        "facilities@clashfree.test",
    ):
        client.post("/api/auth/logout")
        login(client, email)
        response = client.post("/api/courses", json=payload)
        assert response.status_code == 403, email


def test_facilities_can_patch_rooms_not_courses(client: TestClient) -> None:
    login(client, "facilities@clashfree.test")
    rooms = client.get("/api/rooms").json()
    target = next(item for item in rooms if item["code"] == "SR 4")
    patched = client.patch(
        f"/api/rooms/{target['id']}",
        json={
            "code": target["code"],
            "building": target["building"],
            "room_type": target["room_type"],
            "capacity": target["capacity"],
            "equipment": target["equipment"],
            "status": "maintenance",
        },
    )
    assert patched.status_code == 200
    assert patched.json()["status"] == "maintenance"
    restore = client.patch(
        f"/api/rooms/{target['id']}",
        json={
            "code": target["code"],
            "building": target["building"],
            "room_type": target["room_type"],
            "capacity": target["capacity"],
            "equipment": target["equipment"],
            "status": "available",
        },
    )
    assert restore.status_code == 200
    assert (
        client.post(
            "/api/courses",
            json={
                "code": "FAC 001",
                "title": "No",
                "department_id": 1,
                "level": 100,
                "units": 1,
                "expected_size": 10,
                "room_type": "lab",
            },
        ).status_code
        == 403
    )


def test_incomplete_assignment_keeps_course_draft(client: TestClient) -> None:
    admin(client)
    courses = {item["code"]: item for item in client.get("/api/courses").json()}
    assert courses["SWE 401"]["status"] == "ready"
    assert courses["GST 203"]["status"] == "draft"
    assert courses["CSC 201"]["status"] == "draft"


def test_faculty_department_and_assignment_crud(client: TestClient) -> None:
    admin(client)
    faculty = client.post("/api/faculties", json={"code": "ENG", "name": "Faculty of Engineering"})
    assert faculty.status_code == 201
    department = client.post(
        "/api/departments",
        json={"code": "EEE", "name": "Electrical Engineering", "faculty_id": faculty.json()["id"]},
    )
    assert department.status_code == 201
    lecturer = client.post(
        "/api/lecturers",
        json={
            "full_name": "Dr. Test Lecturer",
            "department_id": department.json()["id"],
            "max_weekly_hours": 16,
            "status": "available",
        },
    )
    assert lecturer.status_code == 201
    course = client.post(
        "/api/courses",
        json={
            "code": "EEE 101",
            "title": "Circuits",
            "department_id": department.json()["id"],
            "level": 100,
            "units": 3,
            "expected_size": 60,
            "room_type": "lecture_hall",
        },
    )
    cohort = client.post(
        "/api/cohorts",
        json={
            "code": "EEE-100-A",
            "department_id": department.json()["id"],
            "level": 100,
            "size": 60,
            "status": "complete",
        },
    )
    assignment = client.post(
        "/api/assignments",
        json={
            "course_id": course.json()["id"],
            "cohort_id": cohort.json()["id"],
            "lecturer_id": lecturer.json()["id"],
            "contact_pattern": "2 x 2h",
        },
    )
    assert assignment.status_code == 201
    ready = client.get("/api/courses", params={"q": "EEE 101"}).json()[0]
    assert ready["status"] == "ready"
    assert client.delete(f"/api/assignments/{assignment.json()['id']}").status_code == 204
    assert client.delete(f"/api/courses/{course.json()['id']}").status_code == 204
    assert client.delete(f"/api/cohorts/{cohort.json()['id']}").status_code == 204
    assert client.delete(f"/api/lecturers/{lecturer.json()['id']}").status_code == 204
    assert client.delete(f"/api/departments/{department.json()['id']}").status_code == 204
    assert client.delete(f"/api/faculties/{faculty.json()['id']}").status_code == 204
