from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.academic import Course, CourseAssignment
from app.models.disruption import Disruption
from app.models.timetable import (
    TimetableVersion,
    TimetableVersionSlot,
)
from app.services.timetable import active_session, selected_solution


class PublishError(ValueError):
    pass


def version_slot_options():
    return (
        joinedload(TimetableVersion.slots).joinedload(TimetableVersionSlot.room),
        joinedload(TimetableVersion.slots)
        .joinedload(TimetableVersionSlot.assignment)
        .joinedload(CourseAssignment.course)
        .joinedload(Course.department),
        joinedload(TimetableVersion.slots)
        .joinedload(TimetableVersionSlot.assignment)
        .joinedload(CourseAssignment.cohort),
        joinedload(TimetableVersion.slots)
        .joinedload(TimetableVersionSlot.assignment)
        .joinedload(CourseAssignment.lecturer),
        joinedload(TimetableVersion.session),
        joinedload(TimetableVersion.publisher),
    )


def current_version(db: Session, session_id: int | None = None) -> TimetableVersion | None:
    query = db.query(TimetableVersion).options(*version_slot_options())
    if session_id is not None:
        query = query.filter(TimetableVersion.session_id == session_id)
    return (
        query.filter(TimetableVersion.is_current.is_(True))
        .order_by(TimetableVersion.id.desc())
        .first()
    )


def load_version(db: Session, version_id: int) -> TimetableVersion | None:
    return (
        db.query(TimetableVersion)
        .options(*version_slot_options())
        .filter(TimetableVersion.id == version_id)
        .one_or_none()
    )


def list_versions(db: Session) -> list[TimetableVersion]:
    return (
        db.query(TimetableVersion)
        .options(
            joinedload(TimetableVersion.session),
            joinedload(TimetableVersion.publisher),
        )
        .order_by(TimetableVersion.id.desc())
        .all()
    )


def _meeting_map(slots) -> dict[tuple[int, int], object]:
    return {(slot.assignment_id, slot.meeting_index): slot for slot in slots}


def _slot_label(slot) -> dict:
    assignment = getattr(slot, "assignment", None)
    course = assignment.course if assignment is not None else None
    room = getattr(slot, "room", None)
    return {
        "assignment_id": slot.assignment_id,
        "meeting_index": slot.meeting_index,
        "course_code": course.code if course is not None else None,
        "weekday": slot.weekday,
        "start_period": slot.start_period,
        "end_period": slot.end_period,
        "room_id": slot.room_id,
        "room_code": room.code if room is not None else None,
    }


def compute_changes(from_slots, to_slots) -> list[dict]:
    before = _meeting_map(from_slots)
    after = _meeting_map(to_slots)
    keys = sorted(set(before) | set(after))
    changes: list[dict] = []
    for key in keys:
        left = before.get(key)
        right = after.get(key)
        if left is None and right is not None:
            payload = _slot_label(right)
            payload["kind"] = "added"
            payload["from_weekday"] = None
            payload["from_start_period"] = None
            payload["from_room_code"] = None
            payload["to_weekday"] = right.weekday
            payload["to_start_period"] = right.start_period
            payload["to_room_code"] = payload["room_code"]
            changes.append(payload)
            continue
        if right is None and left is not None:
            payload = _slot_label(left)
            payload["kind"] = "removed"
            payload["from_weekday"] = left.weekday
            payload["from_start_period"] = left.start_period
            payload["from_room_code"] = payload["room_code"]
            payload["to_weekday"] = None
            payload["to_start_period"] = None
            payload["to_room_code"] = None
            changes.append(payload)
            continue
        if left is None or right is None:
            continue
        if (
            left.weekday != right.weekday
            or left.start_period != right.start_period
            or left.room_id != right.room_id
        ):
            payload = _slot_label(right)
            left_room = getattr(left, "room", None)
            payload["kind"] = "moved"
            payload["from_weekday"] = left.weekday
            payload["from_start_period"] = left.start_period
            payload["from_room_code"] = left_room.code if left_room is not None else None
            payload["to_weekday"] = right.weekday
            payload["to_start_period"] = right.start_period
            payload["to_room_code"] = payload["room_code"]
            changes.append(payload)
    return changes


def list_changes(
    db: Session,
    from_version_id: int | None = None,
    to_version_id: int | None = None,
) -> list[dict]:
    if from_version_id is not None and to_version_id is not None:
        source = load_version(db, from_version_id)
        target = load_version(db, to_version_id)
        if source is None or target is None:
            raise PublishError("Version not found")
        return compute_changes(source.slots, target.slots)

    session = active_session(db)
    draft = selected_solution(db)
    published = current_version(db, session.id if session is not None else None)
    if draft is None:
        raise PublishError("No draft timetable")
    from_slots = published.slots if published is not None else []
    return compute_changes(from_slots, draft.slots)


def publish_draft(db: Session, user_id: int, notes: str | None) -> TimetableVersion:
    session = active_session(db)
    if session is None:
        raise PublishError("No active academic session")
    solution = selected_solution(db)
    if solution is None:
        raise PublishError("No draft timetable")
    if solution.hard_violations > 0:
        raise PublishError("Cannot publish a draft with hard violations")
    existing = current_version(db, session.id)
    if existing is not None and existing.solution_id == solution.id:
        raise PublishError("This draft is already the current published version")

    next_number = (
        db.query(func.coalesce(func.max(TimetableVersion.version_number), 0))
        .filter(TimetableVersion.session_id == session.id)
        .scalar()
        or 0
    ) + 1
    if existing is not None:
        db.query(TimetableVersion).filter(TimetableVersion.session_id == session.id).update(
            {
                TimetableVersion.is_current: False,
                TimetableVersion.status: "superseded",
            },
            synchronize_session=False,
        )

    cleaned = notes.strip() if notes else None
    row = TimetableVersion(
        session_id=session.id,
        solution_id=solution.id,
        run_id=solution.run_id,
        version_number=next_number,
        status="published",
        is_current=True,
        notes=cleaned,
        published_at=datetime.now(UTC),
        published_by=user_id,
        slot_count=len(solution.slots),
        hard_violations=solution.hard_violations,
        soft_penalty=solution.soft_penalty,
        room_utilization_percent=solution.room_utilization_percent,
    )
    db.add(row)
    db.flush()
    for slot in solution.slots:
        db.add(
            TimetableVersionSlot(
                version_id=row.id,
                assignment_id=slot.assignment_id,
                meeting_index=slot.meeting_index,
                weekday=slot.weekday,
                start_period=slot.start_period,
                end_period=slot.end_period,
                room_id=slot.room_id,
            )
        )
    run = solution.run
    if run is not None and run.purpose == "repair" and run.disruption_id is not None:
        disruption = db.get(Disruption, run.disruption_id)
        if disruption is not None:
            disruption.status = "repaired"
            disruption.updated_at = datetime.now(UTC)
    db.commit()
    loaded = load_version(db, row.id)
    if loaded is None:
        raise PublishError("Published version could not be loaded")
    return loaded
