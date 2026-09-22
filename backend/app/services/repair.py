from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.disruption import Disruption
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


def run_repair(
    db: Session,
    user_id: int,
    disruption_id: int,
    time_limit_seconds: int,
    alternative_count: int,
    random_seed: int | None,
) -> TimetableRun:
    session = active_session(db)
    if session is None:
        raise RepairError("No active academic session")
    profile = current_profile(db)
    if profile is None:
        raise RepairError("No current constraint weight profile")
    version = current_version(db, session.id)
    if version is None:
        raise RepairError("No published timetable")
    row = db.get(Disruption, disruption_id)
    if row is None or row.session_id != session.id:
        raise RepairError("Disruption not found")
    if row.status not in REPAIRABLE:
        raise RepairError("Only open or in-review disruptions can be repaired")
    impact = impact_for(db, row)
    if impact["classes_affected"] == 0:
        raise RepairError("Disruption does not overlap the published timetable")

    snapshot = build_snapshot(db, time_limit_seconds, alternative_count, random_seed)
    snapshot.flags.preserve_published = True
    snapshot.published = load_published_map(db)
    apply_disruption_forbid(snapshot, row, forbidden_cells(db, row))

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
        purpose="repair",
        disruption_id=row.id,
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
