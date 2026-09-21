from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session, joinedload

from app.core.schedule import PERIODS, WEEKDAYS
from app.models.academic import AcademicSession, Course, CourseAssignment, Lecturer, Room
from app.models.constraints import (
    ConstraintWeightProfile,
    LecturerAvailabilityException,
    LecturerAvailabilitySlot,
    LecturerPreference,
    RoomAvailabilityBlock,
    RoomAvailabilitySlot,
    SchedulingConstraint,
)
from app.models.timetable import (
    TimetableConflict,
    TimetableRun,
    TimetableSlot,
    TimetableSolution,
    TimetableVersion,
    TimetableVersionSlot,
)
from app.services.solver import (
    LecturerOption,
    MeetingDemand,
    Placement,
    RoomOption,
    SoftFlags,
    SolverResult,
    SolverSnapshot,
    Weights,
    parse_contact_pattern,
    score_placements,
    solve_snapshot,
)

SOLUTION_LABELS = ("A", "B", "C")


def _weekday_from_date(value) -> str | None:
    index = value.weekday()
    if index > 4:
        return None
    return WEEKDAYS[index]


def _period_window(start: str | None, end: str | None) -> list[str]:
    if not start:
        return list(PERIODS)
    if start not in PERIODS:
        return list(PERIODS)
    begin = PERIODS.index(start)
    finish = PERIODS.index(end) if end in PERIODS else begin
    if finish < begin:
        begin, finish = finish, begin
    return list(PERIODS[begin : finish + 1])


def active_session(db: Session) -> AcademicSession | None:
    return db.query(AcademicSession).filter(AcademicSession.status == "active").one_or_none()


def current_profile(db: Session) -> ConstraintWeightProfile | None:
    return (
        db.query(ConstraintWeightProfile)
        .filter(ConstraintWeightProfile.is_current.is_(True))
        .one_or_none()
    )


def enabled_soft_codes(db: Session) -> set[str]:
    rows = (
        db.query(SchedulingConstraint)
        .filter(
            SchedulingConstraint.kind == "soft",
            SchedulingConstraint.enabled.is_(True),
        )
        .all()
    )
    return {row.code for row in rows}


def build_preflight(db: Session) -> dict:
    session = active_session(db)
    profile = current_profile(db)
    assignments = (
        db.query(CourseAssignment)
        .options(
            joinedload(CourseAssignment.course),
            joinedload(CourseAssignment.cohort),
            joinedload(CourseAssignment.lecturer),
        )
        .all()
    )
    ready = [row for row in assignments if row.lecturer_id is not None]
    incomplete = [row for row in assignments if row.lecturer_id is None]
    rooms = db.query(Room).all()
    usable = [room for room in rooms if room.status == "available"]
    lecturers = db.query(Lecturer).all()
    submitted_ids = {
        row.lecturer_id for row in db.query(LecturerAvailabilitySlot.lecturer_id).distinct()
    }
    constraints = db.query(SchedulingConstraint).all()
    hard = [row for row in constraints if row.kind == "hard"]
    soft = [row for row in constraints if row.kind == "soft"]
    return {
        "session_label": session.label if session else None,
        "semester": session.semester if session else None,
        "profile_name": profile.name if profile else None,
        "ready_assignments": len(ready),
        "incomplete_assignments": len(incomplete),
        "incomplete_codes": [
            row.course.code if row.course is not None else f"assignment-{row.id}"
            for row in incomplete
        ],
        "rooms_total": len(rooms),
        "rooms_usable": len(usable),
        "rooms_excluded": len(rooms) - len(usable),
        "lecturers_total": len(lecturers),
        "lecturers_submitted": len(submitted_ids),
        "hard_constraints": len(hard),
        "soft_constraints": len(soft),
        "soft_enabled": sum(1 for row in soft if row.enabled),
        "can_generate": session is not None and profile is not None and len(ready) > 0,
    }


def build_snapshot(
    db: Session,
    time_limit_seconds: int,
    alternative_count: int,
    random_seed: int | None,
) -> SolverSnapshot:
    assignments = (
        db.query(CourseAssignment)
        .options(
            joinedload(CourseAssignment.course),
            joinedload(CourseAssignment.cohort),
            joinedload(CourseAssignment.lecturer),
        )
        .all()
    )
    rooms = db.query(Room).all()
    lecturers = {row.id: row for row in db.query(Lecturer).all()}
    lecturer_slots = db.query(LecturerAvailabilitySlot).all()
    lecturer_exceptions = db.query(LecturerAvailabilityException).all()
    lecturer_prefs = {row.lecturer_id: row for row in db.query(LecturerPreference).all()}
    room_slots = db.query(RoomAvailabilitySlot).all()
    room_blocks = db.query(RoomAvailabilityBlock).all()
    profile = current_profile(db)
    soft_codes = enabled_soft_codes(db)

    slot_state: dict[tuple[int, str, str], str] = {
        (row.lecturer_id, row.weekday, row.period): row.state for row in lecturer_slots
    }
    room_state: dict[tuple[int, str, str], str] = {
        (row.room_id, row.weekday, row.period): row.state for row in room_slots
    }

    lecturer_options: dict[int, LecturerOption] = {}
    for lecturer in lecturers.values():
        forbidden: set[tuple[str, str]] = set()
        preferred: set[tuple[str, str]] = set()
        for weekday in WEEKDAYS:
            for period in PERIODS:
                state = slot_state.get((lecturer.id, weekday, period), "available")
                if state == "unavailable":
                    forbidden.add((weekday, period))
                elif state == "preferred":
                    preferred.add((weekday, period))
        for exception in lecturer_exceptions:
            if exception.lecturer_id != lecturer.id:
                continue
            weekday = _weekday_from_date(exception.starts_on)
            if weekday is None:
                continue
            for period in _period_window(exception.start_period, exception.end_period):
                forbidden.add((weekday, period))
        prefs = lecturer_prefs.get(lecturer.id)
        lecturer_options[lecturer.id] = LecturerOption(
            id=lecturer.id,
            name=lecturer.full_name,
            forbidden=forbidden,
            preferred=preferred,
            prefer_morning=prefs.prefer_morning if prefs is not None else True,
            avoid_friday_afternoon=(prefs.avoid_friday_afternoon if prefs is not None else True),
        )

    room_options: list[RoomOption] = []
    for room in rooms:
        if room.status != "available":
            continue
        forbidden: set[tuple[str, str]] = set()
        for weekday in WEEKDAYS:
            for period in PERIODS:
                state = room_state.get((room.id, weekday, period), "available")
                if state in {"unavailable", "reserved"}:
                    forbidden.add((weekday, period))
        for block in room_blocks:
            if block.room_id != room.id:
                continue
            weekday = _weekday_from_date(block.starts_on)
            if weekday is None:
                continue
            for period in _period_window(block.start_period, block.end_period):
                forbidden.add((weekday, period))
        room_options.append(
            RoomOption(
                id=room.id,
                code=room.code,
                building=room.building,
                room_type=room.room_type,
                capacity=room.capacity,
                forbidden=forbidden,
            )
        )

    meetings: list[MeetingDemand] = []
    incomplete: list[str] = []
    for row in assignments:
        course = row.course
        cohort = row.cohort
        if row.lecturer_id is None or course is None or cohort is None:
            code = course.code if course is not None else f"assignment-{row.id}"
            incomplete.append(code)
            continue
        count, span = parse_contact_pattern(row.contact_pattern)
        needed = max(course.expected_size, cohort.size)
        for meeting_index in range(count):
            meetings.append(
                MeetingDemand(
                    assignment_id=row.id,
                    meeting_index=meeting_index,
                    span=span,
                    lecturer_id=row.lecturer_id,
                    cohort_id=row.cohort_id,
                    expected_size=needed,
                    room_type=course.room_type,
                    course_code=course.code,
                    cohort_code=cohort.code,
                    lecturer_name=row.lecturer.full_name if row.lecturer else "",
                )
            )

    weights = Weights()
    if profile is not None:
        weights = Weights(
            student_idle_gaps=profile.student_idle_gaps,
            lecturer_preferences=profile.lecturer_preferences,
            daily_balance=profile.daily_balance,
            building_movement=profile.building_movement,
            room_utilization=profile.room_utilization,
            schedule_stability=profile.schedule_stability,
        )
    flags = SoftFlags(
        idle_gaps="minimize_student_idle_gaps" in soft_codes,
        lecturer_preferences="respect_lecturer_preferences" in soft_codes,
        daily_balance="balance_classes_across_week" in soft_codes,
        building_movement="minimize_building_movement" in soft_codes,
        room_utilization=True,
        preserve_published="preserve_published_assignments" in soft_codes,
    )
    published: dict[tuple[int, int], tuple[str, str, int]] = {}
    if flags.preserve_published:
        current = (
            db.query(TimetableVersion)
            .filter(TimetableVersion.is_current.is_(True))
            .order_by(TimetableVersion.id.desc())
            .first()
        )
        if current is not None:
            for slot in (
                db.query(TimetableVersionSlot)
                .filter(TimetableVersionSlot.version_id == current.id)
                .all()
            ):
                published[(slot.assignment_id, slot.meeting_index)] = (
                    slot.weekday,
                    slot.start_period,
                    slot.room_id,
                )
    return SolverSnapshot(
        meetings=meetings,
        rooms=room_options,
        lecturers=lecturer_options,
        incomplete=incomplete,
        weights=weights,
        flags=flags,
        time_limit_seconds=time_limit_seconds,
        alternative_count=alternative_count,
        random_seed=random_seed,
        published=published,
    )


def clear_selected_for_session(db: Session, session_id: int) -> None:
    run_ids = [
        item[0] for item in db.query(TimetableRun.id).filter(TimetableRun.session_id == session_id)
    ]
    if not run_ids:
        return
    db.query(TimetableSolution).filter(TimetableSolution.run_id.in_(run_ids)).update(
        {TimetableSolution.is_selected: False},
        synchronize_session=False,
    )


def persist_result(
    db: Session,
    run: TimetableRun,
    result: SolverResult,
) -> TimetableRun:
    run.status = result.status
    run.finished_at = datetime.now(UTC)
    run.solve_time_ms = result.solve_time_ms
    run.message = result.message
    db.flush()
    if not result.solutions:
        return run
    clear_selected_for_session(db, run.session_id)
    best_index = 0
    for index, solution in enumerate(result.solutions):
        row = TimetableSolution(
            run_id=run.id,
            label=SOLUTION_LABELS[index],
            objective=solution.objective,
            hard_violations=solution.hard_violations,
            soft_penalty=solution.soft_penalty,
            room_utilization_percent=solution.room_utilization_percent,
            student_gap_hours=solution.student_gap_hours,
            is_selected=index == best_index,
        )
        db.add(row)
        db.flush()
        for placement in solution.placements:
            db.add(
                TimetableSlot(
                    solution_id=row.id,
                    assignment_id=placement.assignment_id,
                    meeting_index=placement.meeting_index,
                    weekday=placement.weekday,
                    start_period=placement.start_period,
                    end_period=placement.end_period,
                    room_id=placement.room_id,
                )
            )
        for conflict in solution.conflicts:
            db.add(
                TimetableConflict(
                    solution_id=row.id,
                    kind=conflict.kind,
                    severity=conflict.severity,
                    title=conflict.title,
                    detail=conflict.detail,
                    weekday=conflict.weekday,
                    period=conflict.period,
                    assignment_ids=conflict.assignment_ids,
                )
            )
    return run


def selected_solution(db: Session) -> TimetableSolution | None:
    return (
        db.query(TimetableSolution)
        .options(
            joinedload(TimetableSolution.run),
            joinedload(TimetableSolution.slots).joinedload(TimetableSlot.room),
            joinedload(TimetableSolution.slots)
            .joinedload(TimetableSlot.assignment)
            .joinedload(CourseAssignment.course)
            .joinedload(Course.department),
            joinedload(TimetableSolution.slots)
            .joinedload(TimetableSlot.assignment)
            .joinedload(CourseAssignment.cohort),
            joinedload(TimetableSolution.slots)
            .joinedload(TimetableSlot.assignment)
            .joinedload(CourseAssignment.lecturer),
            joinedload(TimetableSolution.conflicts),
        )
        .filter(TimetableSolution.is_selected.is_(True))
        .order_by(TimetableSolution.id.desc())
        .first()
    )


def select_solution(db: Session, solution: TimetableSolution) -> TimetableSolution:
    run = db.get(TimetableRun, solution.run_id)
    if run is None:
        return solution
    clear_selected_for_session(db, run.session_id)
    db.expire(solution, ["is_selected"])
    solution.is_selected = True
    return solution


def recompute_conflicts(db: Session, solution: TimetableSolution) -> list[TimetableConflict]:
    snapshot = build_snapshot(db, 10, 1, None)
    room_codes = {room.id: room for room in snapshot.rooms}
    placements = []

    for slot in solution.slots:
        room = room_codes.get(slot.room_id)
        placements.append(
            Placement(
                assignment_id=slot.assignment_id,
                meeting_index=slot.meeting_index,
                weekday=slot.weekday,
                start_period=slot.start_period,
                end_period=slot.end_period,
                room_id=slot.room_id,
                room_code=room.code if room else "",
                building=room.building if room else "",
            )
        )
    scored = score_placements(snapshot, placements)
    db.query(TimetableConflict).filter(TimetableConflict.solution_id == solution.id).delete()
    rows: list[TimetableConflict] = []
    for conflict in scored.conflicts:
        row = TimetableConflict(
            solution_id=solution.id,
            kind=conflict.kind,
            severity=conflict.severity,
            title=conflict.title,
            detail=conflict.detail,
            weekday=conflict.weekday,
            period=conflict.period,
            assignment_ids=conflict.assignment_ids,
        )
        db.add(row)
        rows.append(row)
    solution.hard_violations = scored.hard_violations
    solution.soft_penalty = scored.soft_penalty
    solution.room_utilization_percent = scored.room_utilization_percent
    solution.student_gap_hours = scored.student_gap_hours
    db.flush()
    return rows


def run_generation(
    db: Session,
    user_id: int,
    time_limit_seconds: int,
    alternative_count: int,
    random_seed: int | None,
) -> TimetableRun:
    session = active_session(db)
    profile = current_profile(db)
    if session is None:
        raise ValueError("No active academic session")
    if profile is None:
        raise ValueError("No current constraint weight profile")
    started = datetime.now(UTC)
    run = TimetableRun(
        session_id=session.id,
        weight_profile_id=profile.id,
        status="running",
        time_limit_seconds=time_limit_seconds,
        alternative_count=alternative_count,
        random_seed=random_seed,
        started_at=started,
        created_by=user_id,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    try:
        snapshot = build_snapshot(
            db,
            time_limit_seconds,
            alternative_count,
            random_seed,
        )
        result = solve_snapshot(snapshot)
        persist_result(db, run, result)
        db.commit()
    except Exception as exc:  # noqa: BLE001
        run.status = "failed"
        run.finished_at = datetime.now(UTC)
        run.message = str(exc)[:500]
        db.commit()
    db.refresh(run)
    return run
