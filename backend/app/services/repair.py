from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.disruption import Disruption
from app.models.identity import User
from app.models.timetable import TimetableRun, TimetableSolution, TimetableVersionSlot
from app.services.disruptions import impact_for, period_span, weekdays_in_window
from app.services.publish import current_version
from app.services.solver import SolverSnapshot, SolverSolution
from app.services.timetable import (
    active_session,
    build_snapshot,
    current_profile,
    persist_result,
    solve_snapshot,
)

REPAIRABLE = {"open", "in_review"}


class RepairError(ValueError):
    def __init__(self, message: str, status_code: int = 409) -> None:
        super().__init__(message)
        self.status_code = status_code


def forbidden_cells(db: Session, row: Disruption) -> set[tuple[str, str]]:
    session = active_session(db)
    if session is None:
        return set()
    days = weekdays_in_window(row.starts_on, row.ends_on, session)
    periods = period_span(row.start_period, row.end_period)
    return {(day, period) for day in days for period in periods}


def movement_against(
    solution: SolverSolution,
    published: dict[tuple[int, int], tuple[str, str, int]],
) -> int:
    moved = 0
    for placement in solution.placements:
        current = published.get((placement.assignment_id, placement.meeting_index))
        proposed = (placement.weekday, placement.start_period, placement.room_id)
        if current != proposed:
            moved += 1
    return moved


def solution_movement(db: Session, solution: TimetableSolution) -> tuple[int, int]:
    session = active_session(db)
    version = current_version(db, session.id if session is not None else None)
    published: dict[tuple[int, int], tuple[str, str, int]] = {}
    if version is not None:
        for slot in version.slots:
            published[(slot.assignment_id, slot.meeting_index)] = (
                slot.weekday,
                slot.start_period,
                slot.room_id,
            )
    moved = 0
    total = 0
    for slot in solution.slots:
        total += 1
        current = published.get((slot.assignment_id, slot.meeting_index))
        proposed = (slot.weekday, slot.start_period, slot.room_id)
        if current != proposed:
            moved += 1
    return moved, total - moved


def apply_disruption_forbid(
    snapshot: SolverSnapshot,
    row: Disruption,
    cells: set[tuple[str, str]],
) -> None:
    if row.kind == "room" and row.room_id is not None:
        for room in snapshot.rooms:
            if room.id == row.room_id:
                room.forbidden.update(cells)
        return
    if row.kind == "lecturer" and row.lecturer_id is not None:
        lecturer = snapshot.lecturers.get(row.lecturer_id)
        if lecturer is not None:
            lecturer.forbidden.update(cells)


def load_published_map(db: Session) -> dict[tuple[int, int], tuple[str, str, int]]:
    session = active_session(db)
    version = current_version(db, session.id if session is not None else None)
    published: dict[tuple[int, int], tuple[str, str, int]] = {}
    if version is None:
        return published
    slots = version.slots
    if not slots:
        slots = (
            db.query(TimetableVersionSlot)
            .filter(TimetableVersionSlot.version_id == version.id)
            .all()
        )
    for slot in slots:
        published[(slot.assignment_id, slot.meeting_index)] = (
            slot.weekday,
            slot.start_period,
            slot.room_id,
        )
    return published


def locked_meetings(
    published: dict[tuple[int, int], tuple[str, str, int]],
    impacted: set[tuple[int, int]],
) -> dict[tuple[int, int], tuple[str, str, int]]:
    """Hard-pin published meetings that are outside the repair impact set."""
    return {key: placed for key, placed in published.items() if key not in impacted}


def _impacted_keys(impact: dict) -> set[tuple[int, int]]:
    keys: set[tuple[int, int]] = set()
    for item in impact.get("classes") or []:
        assignment_id = item.get("assignment_id")
        meeting_index = item.get("meeting_index")
        if isinstance(assignment_id, int) and isinstance(meeting_index, int):
            keys.add((assignment_id, meeting_index))
    return keys


def _hits_department(impact: dict, department_id: int) -> bool:
    for item in impact.get("classes") or []:
        if item.get("department_id") == department_id:
            return True
    return False


def prepare_repair(
    db: Session,
    user: User,
    disruption_id: int | None,
    all_open: bool,
    time_limit_seconds: int,
    alternative_count: int,
    random_seed: int | None,
) -> tuple:
    session = active_session(db)
    if session is None:
        raise RepairError("No active academic session")
    profile = current_profile(db)
    if profile is None:
        raise RepairError("No current constraint weight profile")
    if current_version(db, session.id) is None:
        raise RepairError("No published timetable")
    query = db.query(Disruption).filter(
        Disruption.session_id == session.id,
        Disruption.status.in_(tuple(REPAIRABLE)),
    )
    if all_open:
        rows = query.order_by(Disruption.id).all()
    else:
        row = query.filter(Disruption.id == disruption_id).one_or_none()
        if row is None:
            raise RepairError("Disruption not found")
        rows = [row]
    usable: list[tuple[Disruption, dict]] = []
    for candidate in rows:
        impact = impact_for(db, candidate)
        if impact["classes_affected"] == 0:
            continue
        usable.append((candidate, impact))
    if not usable:
        raise RepairError("Disruption does not overlap the published timetable")
    if user.role == "department_coordinator":
        if user.department_id is None:
            raise RepairError("Your account has no department")
        usable = [item for item in usable if _hits_department(item[1], user.department_id)]
        if not usable:
            raise RepairError("No open disruptions in your department", 403)
    snapshot = build_snapshot(db, time_limit_seconds, alternative_count, random_seed)
    snapshot.flags.preserve_published = True
    snapshot.published = load_published_map(db)
    impacted: set[tuple[int, int]] = set()
    targets: list[Disruption] = []
    for candidate, impact in usable:
        impacted.update(_impacted_keys(impact))
        apply_disruption_forbid(snapshot, candidate, forbidden_cells(db, candidate))
        targets.append(candidate)
    snapshot.locked = locked_meetings(snapshot.published, impacted)
    return snapshot, targets, profile, session


def run_repair(
    db: Session,
    user: User,
    disruption_id: int | None,
    all_open: bool,
    time_limit_seconds: int,
    alternative_count: int,
    random_seed: int | None,
) -> TimetableRun:
    snapshot, targets, profile, session = prepare_repair(
        db,
        user,
        disruption_id,
        all_open,
        time_limit_seconds,
        alternative_count,
        random_seed,
    )
    started = datetime.now(UTC)
    run = TimetableRun(
        session_id=session.id,
        weight_profile_id=profile.id,
        status="running",
        time_limit_seconds=time_limit_seconds,
        alternative_count=alternative_count,
        random_seed=random_seed,
        started_at=started,
        created_by=user.id,
        purpose="repair",
        disruption_id=targets[0].id,
        disruption_ids=[target.id for target in targets],
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    try:
        result = solve_snapshot(snapshot)
        result.solutions.sort(
            key=lambda item: (
                movement_against(item, snapshot.published),
                item.hard_violations,
                item.soft_penalty,
            )
        )
        if result.status == "feasible":
            result.message = "Feasible repair generated."
        persist_result(db, run, result)
        db.commit()
    except Exception as exc:  # noqa: BLE001
        run.status = "failed"
        run.finished_at = datetime.now(UTC)
        run.message = str(exc)[:500]
        db.commit()
    db.refresh(run)
    return run
