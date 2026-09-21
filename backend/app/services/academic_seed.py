from datetime import date

from sqlalchemy.orm import Session

from app.models.academic import (
    AcademicSession,
    Cohort,
    Course,
    CourseAssignment,
    Faculty,
    Lecturer,
    Room,
)
from app.models.identity import Department, User
from app.services.seed import seed_phase2

SEED_FACULTY = ("FCS", "Faculty of Computing Studies")

SEED_DEPARTMENTS = (
    ("SWE", "Software Engineering"),
    ("CSC", "Computer Science"),
)

SEED_SESSIONS = (
    {
        "label": "2025/2026",
        "semester": "first",
        "starts_on": date(2025, 9, 1),
        "ends_on": date(2026, 1, 30),
        "status": "archived",
        "draft_opens_on": date(2025, 8, 1),
        "publish_deadline_on": date(2025, 10, 1),
    },
    {
        "label": "2026/2027",
        "semester": "first",
        "starts_on": date(2026, 9, 1),
        "ends_on": date(2027, 1, 31),
        "status": "active",
        "draft_opens_on": date(2026, 8, 20),
        "publish_deadline_on": date(2026, 10, 1),
    },
)

SEED_COURSES = (
    {
        "code": "SWE 401",
        "title": "Software Architecture",
        "department": "SWE",
        "level": 400,
        "units": 3,
        "expected_size": 86,
        "room_type": "lecture_hall",
    },
    {
        "code": "SWE 403",
        "title": "Cloud Computing",
        "department": "SWE",
        "level": 400,
        "units": 3,
        "expected_size": 82,
        "room_type": "computer_lab",
    },
    {
        "code": "SWE 301",
        "title": "Software Design",
        "department": "SWE",
        "level": 300,
        "units": 3,
        "expected_size": 90,
        "room_type": "lecture_hall",
    },
    {
        "code": "CSC 312",
        "title": "Algorithms II",
        "department": "CSC",
        "level": 300,
        "units": 3,
        "expected_size": 112,
        "room_type": "lecture_hall",
    },
    {
        "code": "CSC 201",
        "title": "Data Structures",
        "department": "CSC",
        "level": 200,
        "units": 3,
        "expected_size": 140,
        "room_type": "lecture_hall",
    },
    {
        "code": "MTH 201",
        "title": "Discrete Mathematics",
        "department": "CSC",
        "level": 200,
        "units": 3,
        "expected_size": 146,
        "room_type": "lecture_hall",
    },
    {
        "code": "PHY 301",
        "title": "Applied Physics",
        "department": "CSC",
        "level": 300,
        "units": 2,
        "expected_size": 74,
        "room_type": "lab",
    },
    {
        "code": "GST 203",
        "title": "Entrepreneurship",
        "department": "SWE",
        "level": 200,
        "units": 2,
        "expected_size": 320,
        "room_type": "auditorium",
    },
)

SEED_COHORTS = (
    {"code": "SWE-400-A", "department": "SWE", "level": 400, "size": 86, "status": "complete"},
    {"code": "SWE-300-A", "department": "SWE", "level": 300, "size": 94, "status": "complete"},
    {"code": "CSC-300-A", "department": "CSC", "level": 300, "size": 112, "status": "complete"},
    {"code": "CSC-200-A", "department": "CSC", "level": 200, "size": 138, "status": "needs_review"},
)

SEED_LECTURERS = (
    {
        "full_name": "Dr. Amina Yusuf",
        "department": "SWE",
        "user_email": "lecturer@clashfree.test",
        "max_weekly_hours": 18,
        "status": "available",
    },
    {
        "full_name": "Dr. K. Bello",
        "department": "SWE",
        "user_email": None,
        "max_weekly_hours": 20,
        "status": "available",
    },
    {
        "full_name": "Dr. S. Ibrahim",
        "department": "CSC",
        "user_email": None,
        "max_weekly_hours": 16,
        "status": "available",
    },
    {
        "full_name": "Dr. F. Lawal",
        "department": "CSC",
        "user_email": None,
        "max_weekly_hours": 22,
        "status": "limited",
    },
    {
        "full_name": "Dr. N. Okafor",
        "department": "CSC",
        "user_email": None,
        "max_weekly_hours": 12,
        "status": "overloaded",
    },
)

SEED_ROOMS = (
    {
        "code": "LT1",
        "building": "Engineering Block",
        "room_type": "lecture_hall",
        "capacity": 300,
        "equipment": "Projector, PA",
        "status": "available",
    },
    {
        "code": "LT2",
        "building": "Engineering Block",
        "room_type": "lecture_hall",
        "capacity": 220,
        "equipment": "Projector, AC",
        "status": "unavailable",
    },
    {
        "code": "ICT Lab 1",
        "building": "ICT Centre",
        "room_type": "computer_lab",
        "capacity": 80,
        "equipment": "80 PCs, Projector",
        "status": "available",
    },
    {
        "code": "ICT Lab 2",
        "building": "ICT Centre",
        "room_type": "computer_lab",
        "capacity": 72,
        "equipment": "72 PCs",
        "status": "maintenance",
    },
    {
        "code": "AUD 1",
        "building": "Admin Block",
        "room_type": "auditorium",
        "capacity": 500,
        "equipment": "PA, Projector",
        "status": "available",
    },
    {
        "code": "SR 4",
        "building": "Science Block",
        "room_type": "seminar",
        "capacity": 45,
        "equipment": "Projector",
        "status": "available",
    },
)

SEED_ASSIGNMENTS = (
    {
        "course": "SWE 401",
        "cohort": "SWE-400-A",
        "lecturer": "Dr. Amina Yusuf",
        "contact_pattern": "2 x 2h",
    },
    {
        "course": "SWE 403",
        "cohort": "SWE-400-A",
        "lecturer": "Dr. K. Bello",
        "contact_pattern": "1 x 3h",
    },
    {
        "course": "SWE 301",
        "cohort": "SWE-300-A",
        "lecturer": "Dr. Amina Yusuf",
        "contact_pattern": "2 x 2h",
    },
    {
        "course": "CSC 312",
        "cohort": "CSC-300-A",
        "lecturer": "Dr. S. Ibrahim",
        "contact_pattern": "2 x 2h",
    },
    {
        "course": "MTH 201",
        "cohort": "CSC-200-A",
        "lecturer": "Dr. F. Lawal",
        "contact_pattern": "2 x 2h",
    },
    {
        "course": "PHY 301",
        "cohort": "CSC-300-A",
        "lecturer": "Dr. N. Okafor",
        "contact_pattern": "1 x 3h",
    },
    {
        "course": "GST 203",
        "cohort": "SWE-300-A",
        "lecturer": None,
        "contact_pattern": "1 x 2h",
    },
    {
        "course": "CSC 201",
        "cohort": "CSC-200-A",
        "lecturer": None,
        "contact_pattern": "2 x 2h",
    },
)


def _upsert_by_code(session: Session, model, code: str, **values):
    row = session.query(model).filter(model.code == code).one_or_none()
    if row is None:
        row = model(code=code, **values)
        session.add(row)
        session.flush()
        return row
    for key, value in values.items():
        setattr(row, key, value)
    return row


def seed_phase3(session: Session) -> None:
    seed_phase2(session)

    faculty = _upsert_by_code(session, Faculty, SEED_FACULTY[0], name=SEED_FACULTY[1])
    departments: dict[str, Department] = {}
    for code, name in SEED_DEPARTMENTS:
        department = _upsert_by_code(session, Department, code, name=name, faculty_id=faculty.id)
        departments[code] = department

    for spec in SEED_SESSIONS:
        row = (
            session.query(AcademicSession)
            .filter(
                AcademicSession.label == spec["label"],
                AcademicSession.semester == spec["semester"],
            )
            .one_or_none()
        )
        if row is None:
            session.add(AcademicSession(**spec))
        else:
            for key, value in spec.items():
                setattr(row, key, value)
    session.flush()

    for spec in SEED_COURSES:
        department = departments[spec["department"]]
        _upsert_by_code(
            session,
            Course,
            spec["code"],
            title=spec["title"],
            department_id=department.id,
            level=spec["level"],
            units=spec["units"],
            expected_size=spec["expected_size"],
            room_type=spec["room_type"],
            status="draft",
        )

    for spec in SEED_COHORTS:
        department = departments[spec["department"]]
        _upsert_by_code(
            session,
            Cohort,
            spec["code"],
            department_id=department.id,
            level=spec["level"],
            size=spec["size"],
            status=spec["status"],
        )

    lecturers: dict[str, Lecturer] = {}
    for spec in SEED_LECTURERS:
        department = departments[spec["department"]]
        user_id = None
        if spec["user_email"]:
            user = session.query(User).filter(User.email == spec["user_email"]).one_or_none()
            user_id = user.id if user is not None else None
        row = session.query(Lecturer).filter(Lecturer.full_name == spec["full_name"]).one_or_none()
        if row is None:
            row = Lecturer(
                full_name=spec["full_name"],
                department_id=department.id,
                user_id=user_id,
                max_weekly_hours=spec["max_weekly_hours"],
                status=spec["status"],
            )
            session.add(row)
            session.flush()
        else:
            row.department_id = department.id
            row.user_id = user_id
            row.max_weekly_hours = spec["max_weekly_hours"]
            row.status = spec["status"]
        lecturers[spec["full_name"]] = row

    for spec in SEED_ROOMS:
        _upsert_by_code(
            session,
            Room,
            spec["code"],
            building=spec["building"],
            room_type=spec["room_type"],
            capacity=spec["capacity"],
            equipment=spec["equipment"],
            status=spec["status"],
        )
    session.flush()

    courses = {course.code: course for course in session.query(Course).all()}
    cohorts = {cohort.code: cohort for cohort in session.query(Cohort).all()}
    for spec in SEED_ASSIGNMENTS:
        course = courses[spec["course"]]
        cohort = cohorts[spec["cohort"]]
        lecturer = lecturers.get(spec["lecturer"]) if spec["lecturer"] else None
        row = (
            session.query(CourseAssignment)
            .filter(
                CourseAssignment.course_id == course.id,
                CourseAssignment.cohort_id == cohort.id,
            )
            .one_or_none()
        )
        if row is None:
            session.add(
                CourseAssignment(
                    course_id=course.id,
                    cohort_id=cohort.id,
                    lecturer_id=lecturer.id if lecturer is not None else None,
                    contact_pattern=spec["contact_pattern"],
                )
            )
        else:
            row.lecturer_id = lecturer.id if lecturer is not None else None
            row.contact_pattern = spec["contact_pattern"]
    session.flush()

    from app.services.academic import refresh_all_course_statuses

    refresh_all_course_statuses(session)
    session.commit()
