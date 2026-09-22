from __future__ import annotations

import csv
import io
from datetime import UTC, datetime
from types import SimpleNamespace

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.academic import Course, CourseAssignment
from app.models.disruption import Disruption
from app.models.timetable import (
    TimetableRun,
    TimetableSlot,
    TimetableSolution,
    TimetableVersion,
    TimetableVersionSlot,
)
from app.services.timetable import active_session, current_profile, selected_solution


class PublishError(ValueError):
    def __init__(self, message: str, status_code: int = 409) -> None:
        super().__init__(message)
        self.status_code = status_code


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
    repaired_rows = mark_repaired_disruptions(db, run)
    previous_slots = _snap(existing.slots) if existing is not None else []
    new_slots = _snap(solution.slots)
    db.commit()
    loaded = load_version(db, row.id)
    if loaded is None:
        raise PublishError("Published version could not be loaded")
    from app.services.activity import notify_disruption, notify_publish

    notify_publish(
        db,
        actor_id=user_id,
        version=loaded,
        previous_slots=previous_slots,
        new_slots=new_slots,
    )
    for repaired in repaired_rows:
        notify_disruption(db, actor_id=user_id, row=repaired, created=False)
    return loaded


def mark_repaired_disruptions(db: Session, run) -> list[Disruption]:
    if run is None or run.purpose != "repair":
        return []
    ids: list[int] = []
    raw = run.disruption_ids or []
    if isinstance(raw, list):
        ids.extend(int(item) for item in raw)
    if run.disruption_id is not None and run.disruption_id not in ids:
        ids.append(run.disruption_id)
    repaired: list[Disruption] = []
    now = datetime.now(UTC)
    for disruption_id in ids:
        disruption = db.get(Disruption, disruption_id)
        if disruption is None or disruption.status == "repaired":
            continue
        disruption.status = "repaired"
        disruption.updated_at = now
        repaired.append(disruption)
    return repaired


def _snap(slots) -> list[SimpleNamespace]:
    return [
        SimpleNamespace(
            assignment_id=slot.assignment_id,
            meeting_index=slot.meeting_index,
            weekday=slot.weekday,
            start_period=slot.start_period,
            end_period=slot.end_period,
            room_id=slot.room_id,
            assignment=getattr(slot, "assignment", None),
            room=getattr(slot, "room", None),
        )
        for slot in slots
    ]


def version_csv(row: TimetableVersion) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "course_code",
            "cohort",
            "lecturer",
            "weekday",
            "start_period",
            "end_period",
            "room_code",
        ]
    )
    for slot in row.slots:
        assignment = slot.assignment
        course = assignment.course if assignment is not None else None
        cohort = assignment.cohort if assignment is not None else None
        lecturer = assignment.lecturer if assignment is not None else None
        room = slot.room
        writer.writerow(
            [
                course.code if course is not None else "",
                cohort.code if cohort is not None else "",
                lecturer.full_name if lecturer is not None else "",
                slot.weekday,
                slot.start_period,
                slot.end_period,
                room.code if room is not None else "",
            ]
        )
    return buffer.getvalue()


def unpublish_version(db: Session, user_id: int, version_id: int) -> TimetableVersion:
    row = load_version(db, version_id)
    if row is None:
        raise PublishError("Timetable version not found", 404)
    if not row.is_current:
        raise PublishError("Only the current version can be unpublished")
    row.is_current = False
    row.status = "unpublished"
    from app.services.activity import _active_ids, add_audit, add_notifications, deliver_email

    add_audit(
        db,
        actor_id=user_id,
        action="timetable.unpublished",
        entity_type="timetable_version",
        entity_id=row.id,
        summary=f"Unpublished timetable v{row.version_number}",
    )
    note_ids = add_notifications(
        db,
        _active_ids(db, "timetable_administrator"),
        kind="timetable_change",
        title=f"Timetable v{row.version_number} unpublished",
        body="The current published timetable was taken down.",
        href_for_role={"timetable_administrator": "/admin/timetable-versions"},
    )
    db.commit()
    deliver_email(db, note_ids, "notify_timetable_changes")
    loaded = load_version(db, row.id)
    if loaded is None:
        raise PublishError("Unpublished version could not be loaded")
    return loaded


def restore_version(db: Session, user_id: int, version_id: int) -> TimetableSolution:
    row = load_version(db, version_id)
    if row is None or not row.slots:
        raise PublishError("Timetable version not found", 404)
    academic = active_session(db)
    profile = current_profile(db)
    if academic is None or profile is None:
        raise PublishError("No active academic session")
    db.query(TimetableSolution).update(
        {TimetableSolution.is_selected: False},
        synchronize_session=False,
    )
    now = datetime.now(UTC)
    run = TimetableRun(
        session_id=academic.id,
        weight_profile_id=profile.id,
        status="feasible",
        time_limit_seconds=1,
        alternative_count=1,
        random_seed=0,
        started_at=now,
        finished_at=now,
        solve_time_ms=0,
        message=f"Restored from v{row.version_number}",
        created_by=user_id,
        purpose="generate",
    )
    db.add(run)
    db.flush()
    solution = TimetableSolution(
        run_id=run.id,
        label="A",
        objective=0,
        hard_violations=row.hard_violations,
        soft_penalty=row.soft_penalty,
        room_utilization_percent=row.room_utilization_percent,
        student_gap_hours=0,
        is_selected=True,
    )
    db.add(solution)
    db.flush()
    for slot in row.slots:
        db.add(
            TimetableSlot(
                solution_id=solution.id,
                assignment_id=slot.assignment_id,
                meeting_index=slot.meeting_index,
                weekday=slot.weekday,
                start_period=slot.start_period,
                end_period=slot.end_period,
                room_id=slot.room_id,
            )
        )
    from app.services.activity import add_audit

    add_audit(
        db,
        actor_id=user_id,
        action="timetable.restored",
        entity_type="timetable_version",
        entity_id=row.id,
        summary=f"Restored timetable v{row.version_number} as a draft",
    )
    db.commit()
    db.refresh(solution)
    return solution
