"""Seeds for phases 11–15. Each command calls the previous phase."""

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.academic import Cohort, Course, CourseAssignment, Room
from app.models.identity import User
from app.models.timetable import (
    TimetableRun,
    TimetableSlot,
    TimetableSolution,
    TimetableVersion,
    TimetableVersionSlot,
)
from app.services.activity_seed import seed_phase10
from app.services.timetable import active_session, current_profile

CURRENT_NOTES = "Phase 12 current"
SUPERSEDED_NOTES = "Phase 12 superseded"


def seed_phase11(session: Session) -> None:
    """Rooms already exist from the academic catalogue."""
    seed_phase10(session)


def _assignment_and_rooms(session: Session) -> tuple[CourseAssignment, Room, Room] | None:
    assignment = (
        session.query(CourseAssignment)
        .join(Course, CourseAssignment.course_id == Course.id)
        .join(Cohort, CourseAssignment.cohort_id == Cohort.id)
        .filter(Course.code == "SWE 301", Cohort.code == "SWE-300-A")
        .one_or_none()
    )
    rooms = session.query(Room).filter(Room.status == "available").order_by(Room.id).limit(2).all()
    if assignment is None or len(rooms) < 2:
        return None
    return assignment, rooms[0], rooms[1]


def _ensure_version(
    session: Session,
    *,
    notes: str,
    version_number: int,
    is_current: bool,
    status: str,
    assignment: CourseAssignment,
    room: Room,
    academic_id: int,
    profile_id: int,
    admin_id: int,
) -> None:
    if session.query(TimetableVersion).filter(TimetableVersion.notes == notes).one_or_none():
        return
    if is_current:
        session.query(TimetableVersion).filter(
            TimetableVersion.session_id == academic_id,
            TimetableVersion.is_current.is_(True),
        ).update(
            {TimetableVersion.is_current: False, TimetableVersion.status: "superseded"},
            synchronize_session=False,
        )
    now = datetime.now(UTC)
    run = TimetableRun(
        session_id=academic_id,
        weight_profile_id=profile_id,
        status="feasible",
        time_limit_seconds=1,
        alternative_count=1,
        random_seed=12,
        started_at=now,
        finished_at=now,
        solve_time_ms=0,
        message=notes,
        created_by=admin_id,
        purpose="generate",
    )
    session.add(run)
    session.flush()
    solution = TimetableSolution(
        run_id=run.id,
        label="A",
        objective=0,
        hard_violations=0,
        soft_penalty=0,
        room_utilization_percent=0,
        student_gap_hours=0,
        is_selected=False,
    )
    session.add(solution)
    session.flush()
    session.add(
        TimetableSlot(
            solution_id=solution.id,
            assignment_id=assignment.id,
            meeting_index=0,
            weekday="mon",
            start_period="08-10",
            end_period="08-10",
            room_id=room.id,
        )
    )
    version = TimetableVersion(
        session_id=academic_id,
        solution_id=solution.id,
        run_id=run.id,
        version_number=version_number,
        status=status,
        is_current=is_current,
        notes=notes,
        published_at=now,
        published_by=admin_id,
        slot_count=1,
        hard_violations=0,
        soft_penalty=0,
        room_utilization_percent=0,
    )
    session.add(version)
    session.flush()
    session.add(
        TimetableVersionSlot(
            version_id=version.id,
            assignment_id=assignment.id,
            meeting_index=0,
            weekday="mon",
            start_period="08-10",
            end_period="08-10",
            room_id=room.id,
        )
    )
    session.commit()


def seed_phase12(session: Session) -> None:
    """One current version and one superseded version, without the solver."""
    seed_phase11(session)
    parts = _assignment_and_rooms(session)
    academic = active_session(session)
    profile = current_profile(session)
    admin = session.query(User).filter(User.email == "admin@clashfree.test").one_or_none()
    if parts is None or academic is None or profile is None or admin is None:
        return
    assignment, first_room, second_room = parts
    highest = (
        session.query(TimetableVersion.version_number)
        .filter(TimetableVersion.session_id == academic.id)
        .order_by(TimetableVersion.version_number.desc())
        .limit(1)
        .scalar()
    )
    next_number = int(highest or 0) + 1
    _ensure_version(
        session,
        notes=SUPERSEDED_NOTES,
        version_number=next_number,
        is_current=False,
        status="superseded",
        assignment=assignment,
        room=first_room,
        academic_id=academic.id,
        profile_id=profile.id,
        admin_id=admin.id,
    )
    _ensure_version(
        session,
        notes=CURRENT_NOTES,
        version_number=next_number + 1,
        is_current=True,
        status="published",
        assignment=assignment,
        room=second_room,
        academic_id=academic.id,
        profile_id=profile.id,
        admin_id=admin.id,
    )


def seed_phase13(session: Session) -> None:
    seed_phase12(session)


def seed_phase14(session: Session) -> None:
    seed_phase13(session)


def seed_phase15(session: Session) -> None:
    seed_phase14(session)
