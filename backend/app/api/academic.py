from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.academic import (
    COHORT_STATUSES,
    COURSE_LEVELS,
    LECTURER_STATUSES,
    ROOM_STATUSES,
    ROOM_TYPES,
    SEMESTERS,
    SESSION_STATUSES,
    AcademicSession,
    Cohort,
    Course,
    CourseAssignment,
    Faculty,
    Lecturer,
    Room,
)
from app.models.identity import Department, User
from app.schemas.academic import (
    AcademicSessionIn,
    AcademicSessionOut,
    AcademicSummary,
    AssignmentIn,
    AssignmentOut,
    CohortIn,
    CohortOut,
    CourseIn,
    CourseOut,
    DepartmentIn,
    DepartmentOut,
    FacultyIn,
    FacultyOut,
    LecturerIn,
    LecturerOut,
    RoomIn,
    RoomOut,
)
from app.services.academic import (
    ConflictError,
    activate_session,
    commit_or_conflict,
    refresh_course_status,
)

admin_only = require_roles("timetable_administrator")
room_editors = require_roles("timetable_administrator", "facilities_manager")

router = APIRouter(prefix="/api", tags=["academic"])


def conflict(exc: ConflictError) -> None:
    raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=exc.detail) from exc


def not_found(entity: str) -> None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{entity} not found")


def ensure_choice(value: str, allowed: tuple[str, ...], label: str) -> str:
    if value not in allowed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{label} must be one of: {', '.join(allowed)}",
        )
    return value


def ensure_level(level: int) -> int:
    if level not in COURSE_LEVELS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Level must be 100, 200, 300, 400 or 500",
        )
    return level


def get_department(db: Session, department_id: int) -> Department:
    row = db.get(Department, department_id)
    if row is None:
        not_found("Department")
        raise AssertionError
    return row


def session_out(row: AcademicSession) -> AcademicSessionOut:
    return AcademicSessionOut(
        id=row.id,
        label=row.label,
        semester=row.semester,
        starts_on=row.starts_on,
        ends_on=row.ends_on,
        status=row.status,
        draft_opens_on=row.draft_opens_on,
        publish_deadline_on=row.publish_deadline_on,
        duration_days=(row.ends_on - row.starts_on).days,
    )


def faculty_out(row: Faculty) -> FacultyOut:
    return FacultyOut(
        id=row.id,
        code=row.code,
        name=row.name,
        department_count=len(row.departments),
    )


def department_out(row: Department) -> DepartmentOut:
    return DepartmentOut(
        id=row.id,
        code=row.code,
        name=row.name,
        faculty_id=row.faculty_id,
        faculty_name=row.faculty.name if row.faculty is not None else None,
    )


def course_out(row: Course) -> CourseOut:
    lecturer_name = None
    for assignment in row.assignments:
        if assignment.lecturer is not None:
            lecturer_name = assignment.lecturer.full_name
            break
    return CourseOut(
        id=row.id,
        code=row.code,
        title=row.title,
        department_id=row.department_id,
        department_name=row.department.name if row.department is not None else None,
        level=row.level,
        units=row.units,
        expected_size=row.expected_size,
        room_type=row.room_type,
        status=row.status,
        lecturer_name=lecturer_name,
    )


def cohort_out(row: Cohort) -> CohortOut:
    return CohortOut(
        id=row.id,
        code=row.code,
        department_id=row.department_id,
        department_name=row.department.name if row.department is not None else None,
        level=row.level,
        size=row.size,
        status=row.status,
        course_count=len(row.assignments),
    )


def lecturer_out(row: Lecturer) -> LecturerOut:
    return LecturerOut(
        id=row.id,
        full_name=row.full_name,
        department_id=row.department_id,
        department_name=row.department.name if row.department is not None else None,
        user_id=row.user_id,
        max_weekly_hours=row.max_weekly_hours,
        status=row.status,
        course_count=len({item.course_id for item in row.assignments}),
    )


def room_out(row: Room) -> RoomOut:
    return RoomOut.model_validate(row)


def assignment_out(row: CourseAssignment) -> AssignmentOut:
    ready = row.lecturer_id is not None
    return AssignmentOut(
        id=row.id,
        course_id=row.course_id,
        course_code=row.course.code if row.course is not None else None,
        course_title=row.course.title if row.course is not None else None,
        cohort_id=row.cohort_id,
        cohort_code=row.cohort.code if row.cohort is not None else None,
        lecturer_id=row.lecturer_id,
        lecturer_name=row.lecturer.full_name if row.lecturer is not None else None,
        contact_pattern=row.contact_pattern,
        room_type=row.course.room_type if row.course is not None else None,
        expected_size=row.course.expected_size if row.course is not None else None,
        status="complete" if ready else "needs_attention",
        department_id=row.course.department_id if row.course is not None else None,
    )


def load_course(db: Session, course_id: int) -> Course:
    row = (
        db.query(Course)
        .options(
            joinedload(Course.department),
            joinedload(Course.assignments).joinedload(CourseAssignment.lecturer),
        )
        .filter(Course.id == course_id)
        .one_or_none()
    )
    if row is None:
        not_found("Course")
        raise AssertionError
    return row


@router.get("/academic/summary", response_model=AcademicSummary)
def academic_summary(
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> AcademicSummary:
    active = db.query(AcademicSession).filter(AcademicSession.status == "active").one_or_none()
    return AcademicSummary(
        courses=db.query(Course).count(),
        lecturers=db.query(Lecturer).count(),
        cohorts=db.query(Cohort).count(),
        rooms=db.query(Room).count(),
        faculties=db.query(Faculty).count(),
        departments=db.query(Department).count(),
        active_session_label=active.label if active is not None else None,
        active_semester=active.semester if active is not None else None,
    )


@router.get("/sessions", response_model=list[AcademicSessionOut])
def list_sessions(
    q: Annotated[str | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> list[AcademicSessionOut]:
    query = db.query(AcademicSession)
    if status_filter:
        query = query.filter(AcademicSession.status == status_filter)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(AcademicSession.label.ilike(like))
    return [session_out(row) for row in query.order_by(AcademicSession.starts_on.desc())]


@router.post("/sessions", response_model=AcademicSessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: AcademicSessionIn,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> AcademicSessionOut:
    ensure_choice(payload.semester, SEMESTERS, "semester")
    ensure_choice(payload.status, SESSION_STATUSES, "status")
    if payload.ends_on < payload.starts_on:
        raise HTTPException(status_code=422, detail="End date must be on or after start date")
    row = AcademicSession(**payload.model_dump())
    db.add(row)
    if payload.status == "active":
        db.flush()
        activate_session(db, row)
    try:
        commit_or_conflict(db, "Could not create that academic session")
    except ConflictError as exc:
        conflict(exc)
    db.refresh(row)
    return session_out(row)


@router.get("/sessions/{session_id}", response_model=AcademicSessionOut)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> AcademicSessionOut:
    row = db.get(AcademicSession, session_id)
    if row is None:
        not_found("Academic session")
    return session_out(row)


@router.patch("/sessions/{session_id}", response_model=AcademicSessionOut)
def patch_session(
    session_id: int,
    payload: AcademicSessionIn,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> AcademicSessionOut:
    row = db.get(AcademicSession, session_id)
    if row is None:
        not_found("Academic session")
    ensure_choice(payload.semester, SEMESTERS, "semester")
    ensure_choice(payload.status, SESSION_STATUSES, "status")
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    if payload.status == "active":
        activate_session(db, row)
    db.commit()
    db.refresh(row)
    return session_out(row)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> Response:
    row = db.get(AcademicSession, session_id)
    if row is None:
        not_found("Academic session")
    db.delete(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/sessions/{session_id}/activate", response_model=AcademicSessionOut)
def activate_academic_session(
    session_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> AcademicSessionOut:
    row = db.get(AcademicSession, session_id)
    if row is None:
        not_found("Academic session")
    activate_session(db, row)
    db.commit()
    db.refresh(row)
    return session_out(row)


@router.get("/faculties", response_model=list[FacultyOut])
def list_faculties(
    q: Annotated[str | None, Query()] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> list[FacultyOut]:
    query = db.query(Faculty).options(joinedload(Faculty.departments))
    if q:
        like = f"%{q.strip()}%"
        query = query.filter((Faculty.code.ilike(like)) | (Faculty.name.ilike(like)))
    return [faculty_out(row) for row in query.order_by(Faculty.name)]


@router.post("/faculties", response_model=FacultyOut, status_code=status.HTTP_201_CREATED)
def create_faculty(
    payload: FacultyIn,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> FacultyOut:
    row = Faculty(code=payload.code.strip().upper(), name=payload.name.strip())
    db.add(row)
    try:
        commit_or_conflict(db, "A faculty with that code already exists")
    except ConflictError as exc:
        conflict(exc)
    db.refresh(row)
    row.departments = []
    return faculty_out(row)


@router.patch("/faculties/{faculty_id}", response_model=FacultyOut)
def patch_faculty(
    faculty_id: int,
    payload: FacultyIn,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> FacultyOut:
    row = (
        db.query(Faculty)
        .options(joinedload(Faculty.departments))
        .filter(Faculty.id == faculty_id)
        .one_or_none()
    )
    if row is None:
        not_found("Faculty")
    row.code = payload.code.strip().upper()
    row.name = payload.name.strip()
    try:
        commit_or_conflict(db, "A faculty with that code already exists")
    except ConflictError as exc:
        conflict(exc)
    db.refresh(row)
    return faculty_out(row)


@router.delete("/faculties/{faculty_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_faculty(
    faculty_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> Response:
    row = db.get(Faculty, faculty_id)
    if row is None:
        not_found("Faculty")
    db.delete(row)
    try:
        commit_or_conflict(db, "Cannot delete a faculty that still has departments")
    except ConflictError as exc:
        conflict(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/departments", response_model=list[DepartmentOut])
def list_departments(
    q: Annotated[str | None, Query()] = None,
    faculty_id: Annotated[int | None, Query()] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> list[DepartmentOut]:
    query = db.query(Department).options(joinedload(Department.faculty))
    if faculty_id is not None:
        query = query.filter(Department.faculty_id == faculty_id)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter((Department.code.ilike(like)) | (Department.name.ilike(like)))
    return [department_out(row) for row in query.order_by(Department.name)]


@router.post("/departments", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentIn,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> DepartmentOut:
    if db.get(Faculty, payload.faculty_id) is None:
        not_found("Faculty")
    row = Department(
        code=payload.code.strip().upper(),
        name=payload.name.strip(),
        faculty_id=payload.faculty_id,
    )
    db.add(row)
    try:
        commit_or_conflict(db, "A department with that code already exists")
    except ConflictError as exc:
        conflict(exc)
    db.refresh(row)
    row = (
        db.query(Department)
        .options(joinedload(Department.faculty))
        .filter(Department.id == row.id)
        .one()
    )
    return department_out(row)


@router.patch("/departments/{department_id}", response_model=DepartmentOut)
def patch_department(
    department_id: int,
    payload: DepartmentIn,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> DepartmentOut:
    row = db.get(Department, department_id)
    if row is None:
        not_found("Department")
    if db.get(Faculty, payload.faculty_id) is None:
        not_found("Faculty")
    row.code = payload.code.strip().upper()
    row.name = payload.name.strip()
    row.faculty_id = payload.faculty_id
    try:
        commit_or_conflict(db, "A department with that code already exists")
    except ConflictError as exc:
        conflict(exc)
    row = (
        db.query(Department)
        .options(joinedload(Department.faculty))
        .filter(Department.id == department_id)
        .one()
    )
    return department_out(row)


@router.delete("/departments/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    department_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> Response:
    row = db.get(Department, department_id)
    if row is None:
        not_found("Department")
    db.delete(row)
    try:
        commit_or_conflict(db, "Cannot delete a department that is still in use")
    except ConflictError as exc:
        conflict(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/courses", response_model=list[CourseOut])
def list_courses(
    q: Annotated[str | None, Query()] = None,
    department_id: Annotated[int | None, Query()] = None,
    level: Annotated[int | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> list[CourseOut]:
    query = db.query(Course).options(
        joinedload(Course.department),
        joinedload(Course.assignments).joinedload(CourseAssignment.lecturer),
    )
    if department_id is not None:
        query = query.filter(Course.department_id == department_id)
    if level is not None:
        query = query.filter(Course.level == level)
    if status_filter:
        query = query.filter(Course.status == status_filter)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter((Course.code.ilike(like)) | (Course.title.ilike(like)))
    return [course_out(row) for row in query.order_by(Course.code)]


@router.post("/courses", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseIn,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> CourseOut:
    get_department(db, payload.department_id)
    ensure_level(payload.level)
    ensure_choice(payload.room_type, ROOM_TYPES, "room_type")
    row = Course(
        code=payload.code.strip().upper(),
        title=payload.title.strip(),
        department_id=payload.department_id,
        level=payload.level,
        units=payload.units,
        expected_size=payload.expected_size,
        room_type=payload.room_type,
        status="draft",
    )
    db.add(row)
    try:
        commit_or_conflict(db, "A course with that code already exists")
    except ConflictError as exc:
        conflict(exc)
    return course_out(load_course(db, row.id))


@router.patch("/courses/{course_id}", response_model=CourseOut)
def patch_course(
    course_id: int,
    payload: CourseIn,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> CourseOut:
    row = db.get(Course, course_id)
    if row is None:
        not_found("Course")
    get_department(db, payload.department_id)
    ensure_level(payload.level)
    ensure_choice(payload.room_type, ROOM_TYPES, "room_type")
    row.code = payload.code.strip().upper()
    row.title = payload.title.strip()
    row.department_id = payload.department_id
    row.level = payload.level
    row.units = payload.units
    row.expected_size = payload.expected_size
    row.room_type = payload.room_type
    refresh_course_status(db, row)
    try:
        commit_or_conflict(db, "A course with that code already exists")
    except ConflictError as exc:
        conflict(exc)
    return course_out(load_course(db, course_id))


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> Response:
    row = db.get(Course, course_id)
    if row is None:
        not_found("Course")
    db.delete(row)
    try:
        commit_or_conflict(db, "Cannot delete a course that still has assignments")
    except ConflictError as exc:
        conflict(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/cohorts", response_model=list[CohortOut])
def list_cohorts(
    q: Annotated[str | None, Query()] = None,
    department_id: Annotated[int | None, Query()] = None,
    level: Annotated[int | None, Query()] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> list[CohortOut]:
    query = db.query(Cohort).options(
        joinedload(Cohort.department),
        joinedload(Cohort.assignments),
    )
    if department_id is not None:
        query = query.filter(Cohort.department_id == department_id)
    if level is not None:
        query = query.filter(Cohort.level == level)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(Cohort.code.ilike(like))
    return [cohort_out(row) for row in query.order_by(Cohort.code)]


@router.post("/cohorts", response_model=CohortOut, status_code=status.HTTP_201_CREATED)
def create_cohort(
    payload: CohortIn,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> CohortOut:
    get_department(db, payload.department_id)
    ensure_level(payload.level)
    ensure_choice(payload.status, COHORT_STATUSES, "status")
    row = Cohort(
        code=payload.code.strip().upper(),
        department_id=payload.department_id,
        level=payload.level,
        size=payload.size,
        status=payload.status,
    )
    db.add(row)
    try:
        commit_or_conflict(db, "A cohort with that code already exists")
    except ConflictError as exc:
        conflict(exc)
    row = (
        db.query(Cohort)
        .options(joinedload(Cohort.department), joinedload(Cohort.assignments))
        .filter(Cohort.id == row.id)
        .one()
    )
    return cohort_out(row)


@router.patch("/cohorts/{cohort_id}", response_model=CohortOut)
def patch_cohort(
    cohort_id: int,
    payload: CohortIn,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> CohortOut:
    row = db.get(Cohort, cohort_id)
    if row is None:
        not_found("Cohort")
    get_department(db, payload.department_id)
    ensure_level(payload.level)
    ensure_choice(payload.status, COHORT_STATUSES, "status")
    row.code = payload.code.strip().upper()
    row.department_id = payload.department_id
    row.level = payload.level
    row.size = payload.size
    row.status = payload.status
    try:
        commit_or_conflict(db, "A cohort with that code already exists")
    except ConflictError as exc:
        conflict(exc)
    row = (
        db.query(Cohort)
        .options(joinedload(Cohort.department), joinedload(Cohort.assignments))
        .filter(Cohort.id == cohort_id)
        .one()
    )
    return cohort_out(row)


@router.delete("/cohorts/{cohort_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cohort(
    cohort_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> Response:
    row = db.get(Cohort, cohort_id)
    if row is None:
        not_found("Cohort")
    db.delete(row)
    try:
        commit_or_conflict(db, "Cannot delete a cohort that still has assignments")
    except ConflictError as exc:
        conflict(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/lecturers", response_model=list[LecturerOut])
def list_lecturers(
    q: Annotated[str | None, Query()] = None,
    department_id: Annotated[int | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> list[LecturerOut]:
    query = db.query(Lecturer).options(
        joinedload(Lecturer.department),
        joinedload(Lecturer.assignments),
    )
    if department_id is not None:
        query = query.filter(Lecturer.department_id == department_id)
    if status_filter:
        query = query.filter(Lecturer.status == status_filter)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(Lecturer.full_name.ilike(like))
    return [lecturer_out(row) for row in query.order_by(Lecturer.full_name)]


@router.post("/lecturers", response_model=LecturerOut, status_code=status.HTTP_201_CREATED)
def create_lecturer(
    payload: LecturerIn,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> LecturerOut:
    get_department(db, payload.department_id)
    ensure_choice(payload.status, LECTURER_STATUSES, "status")
    row = Lecturer(
        full_name=payload.full_name.strip(),
        department_id=payload.department_id,
        user_id=payload.user_id,
        max_weekly_hours=payload.max_weekly_hours,
        status=payload.status,
    )
    db.add(row)
    try:
        commit_or_conflict(db, "Could not create that lecturer")
    except ConflictError as exc:
        conflict(exc)
    row = (
        db.query(Lecturer)
        .options(joinedload(Lecturer.department), joinedload(Lecturer.assignments))
        .filter(Lecturer.id == row.id)
        .one()
    )
    return lecturer_out(row)


@router.patch("/lecturers/{lecturer_id}", response_model=LecturerOut)
def patch_lecturer(
    lecturer_id: int,
    payload: LecturerIn,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> LecturerOut:
    row = db.get(Lecturer, lecturer_id)
    if row is None:
        not_found("Lecturer")
    get_department(db, payload.department_id)
    ensure_choice(payload.status, LECTURER_STATUSES, "status")
    row.full_name = payload.full_name.strip()
    row.department_id = payload.department_id
    row.user_id = payload.user_id
    row.max_weekly_hours = payload.max_weekly_hours
    row.status = payload.status
    try:
        commit_or_conflict(db, "Could not update that lecturer")
    except ConflictError as exc:
        conflict(exc)
    row = (
        db.query(Lecturer)
        .options(joinedload(Lecturer.department), joinedload(Lecturer.assignments))
        .filter(Lecturer.id == lecturer_id)
        .one()
    )
    return lecturer_out(row)


@router.delete("/lecturers/{lecturer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lecturer(
    lecturer_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> Response:
    row = db.get(Lecturer, lecturer_id)
    if row is None:
        not_found("Lecturer")
    db.delete(row)
    try:
        commit_or_conflict(db, "Cannot delete a lecturer that still has assignments")
    except ConflictError as exc:
        conflict(exc)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/rooms", response_model=list[RoomOut])
def list_rooms(
    q: Annotated[str | None, Query()] = None,
    building: Annotated[str | None, Query()] = None,
    room_type: Annotated[str | None, Query()] = None,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(room_editors),
) -> list[RoomOut]:
    query = db.query(Room)
    if building:
        query = query.filter(Room.building == building)
    if room_type:
        query = query.filter(Room.room_type == room_type)
    if status_filter:
        query = query.filter(Room.status == status_filter)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter((Room.code.ilike(like)) | (Room.building.ilike(like)))
    return [room_out(row) for row in query.order_by(Room.code)]


@router.post("/rooms", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
def create_room(
    payload: RoomIn,
    db: Session = Depends(get_db),
    _user: User = Depends(room_editors),
) -> RoomOut:
    ensure_choice(payload.room_type, ROOM_TYPES, "room_type")
    ensure_choice(payload.status, ROOM_STATUSES, "status")
    row = Room(
        code=payload.code.strip(),
        building=payload.building.strip(),
        room_type=payload.room_type,
        capacity=payload.capacity,
        equipment=payload.equipment,
        status=payload.status,
    )
    db.add(row)
    try:
        commit_or_conflict(db, "A room with that code already exists")
    except ConflictError as exc:
        conflict(exc)
    db.refresh(row)
    return room_out(row)


@router.patch("/rooms/{room_id}", response_model=RoomOut)
def patch_room(
    room_id: int,
    payload: RoomIn,
    db: Session = Depends(get_db),
    _user: User = Depends(room_editors),
) -> RoomOut:
    row = db.get(Room, room_id)
    if row is None:
        not_found("Room")
    ensure_choice(payload.room_type, ROOM_TYPES, "room_type")
    ensure_choice(payload.status, ROOM_STATUSES, "status")
    row.code = payload.code.strip()
    row.building = payload.building.strip()
    row.room_type = payload.room_type
    row.capacity = payload.capacity
    row.equipment = payload.equipment
    row.status = payload.status
    try:
        commit_or_conflict(db, "A room with that code already exists")
    except ConflictError as exc:
        conflict(exc)
    db.refresh(row)
    return room_out(row)


@router.delete("/rooms/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(
    room_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(room_editors),
) -> Response:
    row = db.get(Room, room_id)
    if row is None:
        not_found("Room")
    db.delete(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def load_assignment(db: Session, assignment_id: int) -> CourseAssignment:
    row = (
        db.query(CourseAssignment)
        .options(
            joinedload(CourseAssignment.course),
            joinedload(CourseAssignment.cohort),
            joinedload(CourseAssignment.lecturer),
        )
        .filter(CourseAssignment.id == assignment_id)
        .one_or_none()
    )
    if row is None:
        not_found("Assignment")
    return row


@router.get("/assignments", response_model=list[AssignmentOut])
def list_assignments(
    q: Annotated[str | None, Query()] = None,
    department_id: Annotated[int | None, Query()] = None,
    needs_attention: Annotated[bool | None, Query()] = None,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> list[AssignmentOut]:
    query = db.query(CourseAssignment).options(
        joinedload(CourseAssignment.course),
        joinedload(CourseAssignment.cohort),
        joinedload(CourseAssignment.lecturer),
    )
    rows = [assignment_out(row) for row in query.order_by(CourseAssignment.id)]
    if department_id is not None:
        rows = [row for row in rows if row.department_id == department_id]
    if needs_attention:
        rows = [row for row in rows if row.status == "needs_attention"]
    if q:
        needle = q.strip().lower()
        rows = [
            row
            for row in rows
            if needle in (row.course_code or "").lower()
            or needle in (row.course_title or "").lower()
            or needle in (row.cohort_code or "").lower()
            or needle in (row.lecturer_name or "").lower()
        ]
    return rows


@router.post("/assignments", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
def create_assignment(
    payload: AssignmentIn,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> AssignmentOut:
    if db.get(Course, payload.course_id) is None:
        not_found("Course")
    if db.get(Cohort, payload.cohort_id) is None:
        not_found("Cohort")
    if payload.lecturer_id is not None and db.get(Lecturer, payload.lecturer_id) is None:
        not_found("Lecturer")
    row = CourseAssignment(
        course_id=payload.course_id,
        cohort_id=payload.cohort_id,
        lecturer_id=payload.lecturer_id,
        contact_pattern=payload.contact_pattern.strip(),
    )
    db.add(row)
    db.flush()
    refresh_course_status(db, db.get(Course, payload.course_id))
    try:
        commit_or_conflict(db, "That course is already assigned to this cohort")
    except ConflictError as exc:
        conflict(exc)
    return assignment_out(load_assignment(db, row.id))


@router.patch("/assignments/{assignment_id}", response_model=AssignmentOut)
def patch_assignment(
    assignment_id: int,
    payload: AssignmentIn,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> AssignmentOut:
    row = db.get(CourseAssignment, assignment_id)
    if row is None:
        not_found("Assignment")
    previous_course_id = row.course_id
    if db.get(Course, payload.course_id) is None:
        not_found("Course")
    if db.get(Cohort, payload.cohort_id) is None:
        not_found("Cohort")
    if payload.lecturer_id is not None and db.get(Lecturer, payload.lecturer_id) is None:
        not_found("Lecturer")
    row.course_id = payload.course_id
    row.cohort_id = payload.cohort_id
    row.lecturer_id = payload.lecturer_id
    row.contact_pattern = payload.contact_pattern.strip()
    db.flush()
    refresh_course_status(db, db.get(Course, payload.course_id))
    if previous_course_id != payload.course_id:
        previous = db.get(Course, previous_course_id)
        if previous is not None:
            refresh_course_status(db, previous)
    try:
        commit_or_conflict(db, "That course is already assigned to this cohort")
    except ConflictError as exc:
        conflict(exc)
    return assignment_out(load_assignment(db, assignment_id))


@router.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> Response:
    row = db.get(CourseAssignment, assignment_id)
    if row is None:
        not_found("Assignment")
    course_id = row.course_id
    db.delete(row)
    db.flush()
    course = db.get(Course, course_id)
    if course is not None:
        refresh_course_status(db, course)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
