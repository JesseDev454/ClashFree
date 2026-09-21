from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

from sqlalchemy.orm import Session, joinedload

from app.core.schedule import PERIODS, WEEKDAYS
from app.models.academic import AcademicSession, Lecturer, Room
from app.models.constraints import RoomAvailabilityBlock
from app.models.disruption import (
    DISRUPTION_KINDS,
    DISRUPTION_SEVERITIES,
    DISRUPTION_STATUSES,
    Disruption,
)
from app.models.identity import User
from app.services.publish import current_version
from app.services.timetable import active_session

WEEKDAY_FROM_INDEX = {0: "mon", 1: "tue", 2: "wed", 3: "thu", 4: "fri"}
ACTIVE_STATUSES = ("open", "in_review")
ADMIN_ROLE = "timetable_administrator"
LECTURER_ROLE = "lecturer"
FACILITIES_ROLE = "facilities_manager"
VIEW_ROLES = (ADMIN_ROLE, LECTURER_ROLE, FACILITIES_ROLE)


class DisruptionError(ValueError):
    def __init__(self, message: str, status_code: int = 409) -> None:
        super().__init__(message)
        self.status_code = status_code


def display_code(disruption_id: int) -> str:
    return f"D-{disruption_id:03d}"


def implied_status(starts_on: date, today: date | None = None) -> str:
    current = today or date.today()
    if starts_on > current:
        return "scheduled"
    return "open"


def period_span(start: str | None, end: str | None) -> set[str]:
    if start is None:
        return set(PERIODS)
    if start not in PERIODS:
        raise DisruptionError(f"start_period must be one of: {', '.join(PERIODS)}", 422)
    finish = end or start
    if finish not in PERIODS:
        raise DisruptionError(f"end_period must be one of: {', '.join(PERIODS)}", 422)
    start_index = PERIODS.index(start)
    end_index = PERIODS.index(finish)
    if end_index < start_index:
        start_index, end_index = end_index, start_index
    return set(PERIODS[start_index : end_index + 1])


def weekdays_in_window(
    starts_on: date,
    ends_on: date,
    session: AcademicSession,
) -> set[str]:
    low = max(starts_on, session.starts_on)
    high = min(ends_on, session.ends_on)
    found: set[str] = set()
    cursor = low
    while cursor <= high:
        weekday = WEEKDAY_FROM_INDEX.get(cursor.weekday())
        if weekday in WEEKDAYS:
            found.add(weekday)
            if len(found) == len(WEEKDAYS):
                break
        cursor += timedelta(days=1)
    return found


def disruption_options():
    return (
        joinedload(Disruption.session),
        joinedload(Disruption.room),
        joinedload(Disruption.lecturer),
        joinedload(Disruption.reporter),
    )


def load_disruption(db: Session, disruption_id: int) -> Disruption | None:
    return (
        db.query(Disruption)
        .options(*disruption_options())
        .filter(Disruption.id == disruption_id)
        .one_or_none()
    )


def visible_query(db: Session, user: User):
    query = db.query(Disruption).options(*disruption_options())
    if user.role == LECTURER_ROLE:
        return query.filter(Disruption.reported_by == user.id)
    if user.role == FACILITIES_ROLE:
        return query.filter(Disruption.kind == "room")
    return query


def can_view(user: User, row: Disruption) -> bool:
    if user.role == ADMIN_ROLE:
        return True
    if user.role == LECTURER_ROLE:
        return row.reported_by == user.id
    if user.role == FACILITIES_ROLE:
        return row.kind == "room"
    return False


def resource_label(row: Disruption) -> str:
    if row.kind == "room" and row.room is not None:
        return row.room.code
    if row.kind == "lecturer" and row.lecturer is not None:
        return row.lecturer.full_name
    return "Unknown"


def compute_impact(
    db: Session,
    *,
    kind: str,
    room_id: int | None,
    lecturer_id: int | None,
    starts_on: date,
    ends_on: date,
    start_period: str | None,
    end_period: str | None,
    session: AcademicSession | None = None,
) -> dict:
    current_session = session or active_session(db)
    version = current_version(db, current_session.id) if current_session is not None else None
    if current_session is None or version is None:
        return {
            "classes_affected": 0,
            "students_affected": 0,
            "published": version is not None,
            "classes": [],
        }
    target_days = weekdays_in_window(starts_on, ends_on, current_session)
    target_periods = period_span(start_period, end_period)
    classes: list[dict] = []
    cohort_sizes: dict[int, int] = {}
    for slot in version.slots:
        if slot.weekday not in target_days:
            continue
        if period_span(slot.start_period, slot.end_period).isdisjoint(target_periods):
            continue
        assignment = slot.assignment
        if kind == "room" and slot.room_id != room_id:
            continue
        if kind == "lecturer":
            assigned = assignment.lecturer_id if assignment is not None else None
            if assigned != lecturer_id:
                continue
        course = assignment.course if assignment is not None else None
        cohort = assignment.cohort if assignment is not None else None
        lecturer = assignment.lecturer if assignment is not None else None
        room = slot.room
        size = cohort.size if cohort is not None else 0
        if cohort is not None:
            cohort_sizes[cohort.id] = size
        classes.append(
            {
                "assignment_id": slot.assignment_id,
                "meeting_index": slot.meeting_index,
                "course_code": course.code if course is not None else None,
                "course_title": course.title if course is not None else None,
                "cohort_code": cohort.code if cohort is not None else None,
                "cohort_size": size,
                "weekday": slot.weekday,
                "start_period": slot.start_period,
                "end_period": slot.end_period,
                "room_code": room.code if room is not None else None,
                "lecturer_name": lecturer.full_name if lecturer is not None else None,
            }
        )
    classes.sort(
        key=lambda item: (
            item["weekday"],
            item["start_period"],
            item["course_code"] or "",
        )
    )
    return {
        "classes_affected": len(classes),
        "students_affected": sum(cohort_sizes.values()),
        "published": True,
        "classes": classes,
    }


def validate_window(
    starts_on: date,
    ends_on: date,
    start_period: str | None,
    end_period: str | None,
) -> None:
    if ends_on < starts_on:
        raise DisruptionError("ends_on must be on or after starts_on", 422)
    period_span(start_period, end_period)
    if start_period is None and end_period is not None:
        raise DisruptionError("end_period requires start_period", 422)


def scoped_payload(user: User, payload: dict, db: Session) -> dict:
    kind = payload.get("kind")
    if kind not in DISRUPTION_KINDS:
        raise DisruptionError(f"kind must be one of: {', '.join(DISRUPTION_KINDS)}", 422)
    if user.role == LECTURER_ROLE:
        if kind != "lecturer" or payload.get("room_id") is not None:
            raise DisruptionError("Lecturers can only report their own unavailability", 403)
        lecturer = db.query(Lecturer).filter(Lecturer.user_id == user.id).one_or_none()
        if lecturer is None:
            raise DisruptionError("No lecturer record is linked to this account", 404)
        if payload.get("lecturer_id") not in (None, lecturer.id):
            raise DisruptionError("Lecturers can only report their own unavailability", 403)
        payload["kind"] = "lecturer"
        payload["lecturer_id"] = lecturer.id
        payload["room_id"] = None
        payload["create_block"] = False
        return payload
    if user.role == FACILITIES_ROLE:
        if kind != "room" or payload.get("lecturer_id") is not None:
            raise DisruptionError("Facilities can only report room disruptions", 403)
        payload["kind"] = "room"
        payload["lecturer_id"] = None
        return payload
    return payload


def apply_resource(db: Session, payload: dict) -> None:
    kind = payload["kind"]
    if kind == "room":
        if payload.get("room_id") is None:
            raise DisruptionError("room_id is required for room disruptions", 422)
        if payload.get("lecturer_id") is not None:
            raise DisruptionError("lecturer_id must be empty for room disruptions", 422)
        if db.get(Room, payload["room_id"]) is None:
            raise DisruptionError("Room not found", 404)
        return
    if payload.get("lecturer_id") is None:
        raise DisruptionError("lecturer_id is required for lecturer disruptions", 422)
    if payload.get("room_id") is not None:
        raise DisruptionError("room_id must be empty for lecturer disruptions", 422)
    if db.get(Lecturer, payload["lecturer_id"]) is None:
        raise DisruptionError("Lecturer not found", 404)


def create_disruption(db: Session, user: User, payload: dict) -> Disruption:
    session = active_session(db)
    if session is None:
        raise DisruptionError("No active academic session")
    data = scoped_payload(user, dict(payload), db)
    validate_window(
        data["starts_on"],
        data["ends_on"],
        data.get("start_period"),
        data.get("end_period"),
    )
    severity = data.get("severity") or "medium"
    if severity not in DISRUPTION_SEVERITIES:
        raise DisruptionError(
            f"severity must be one of: {', '.join(DISRUPTION_SEVERITIES)}",
            422,
        )
    apply_resource(db, data)
    now = datetime.now(UTC)
    block_id = None
    if data.get("create_block"):
        if data["kind"] != "room":
            raise DisruptionError("create_block is only valid for room disruptions", 422)
        block = RoomAvailabilityBlock(
            room_id=data["room_id"],
            starts_on=data["starts_on"],
            ends_on=data["ends_on"],
            start_period=data.get("start_period"),
            end_period=data.get("end_period"),
            reason=data["reason"],
            kind="maintenance",
            recurring=False,
        )
        db.add(block)
        db.flush()
        block_id = block.id
    row = Disruption(
        session_id=session.id,
        kind=data["kind"],
        room_id=data.get("room_id"),
        lecturer_id=data.get("lecturer_id"),
        reason=data["reason"].strip(),
        description=(data.get("description") or None),
        severity=severity,
        starts_on=data["starts_on"],
        ends_on=data["ends_on"],
        start_period=data.get("start_period"),
        end_period=data.get("end_period"),
        status=implied_status(data["starts_on"]),
        reported_by=user.id,
        block_id=block_id,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    loaded = load_disruption(db, row.id)
    if loaded is None:
        raise DisruptionError("Disruption could not be loaded")
    return loaded


def patch_disruption(db: Session, user: User, row: Disruption, payload: dict) -> Disruption:
    now = datetime.now(UTC)
    if user.role == ADMIN_ROLE:
        if payload.get("status") is not None:
            if payload["status"] not in DISRUPTION_STATUSES:
                raise DisruptionError(
                    f"status must be one of: {', '.join(DISRUPTION_STATUSES)}",
                    422,
                )
            if payload["status"] != "in_review" or row.status != "open":
                raise DisruptionError(
                    "Administrators can only acknowledge open disruptions as in review"
                )
            row.status = "in_review"
            row.updated_at = now
            db.commit()
            loaded = load_disruption(db, row.id)
            assert loaded is not None
            return loaded
        raise DisruptionError("No acknowledged fields to update", 422)
    if user.role != FACILITIES_ROLE or row.kind != "room" or row.reported_by != user.id:
        raise DisruptionError("You cannot update this disruption", 403)
    if row.status not in {"open", "scheduled"}:
        raise DisruptionError("Only open or scheduled disruptions can be edited")
    starts_on = payload.get("starts_on") or row.starts_on
    ends_on = payload.get("ends_on") or row.ends_on
    start_period = (
        row.start_period if "start_period" not in payload else payload.get("start_period")
    )
    end_period = row.end_period if "end_period" not in payload else payload.get("end_period")
    validate_window(starts_on, ends_on, start_period, end_period)
    if payload.get("reason"):
        row.reason = payload["reason"].strip()
    if "description" in payload:
        row.description = payload.get("description") or None
    if payload.get("severity"):
        if payload["severity"] not in DISRUPTION_SEVERITIES:
            raise DisruptionError(
                f"severity must be one of: {', '.join(DISRUPTION_SEVERITIES)}",
                422,
            )
        row.severity = payload["severity"]
    row.starts_on = starts_on
    row.ends_on = ends_on
    row.start_period = start_period
    row.end_period = end_period
    if row.status != "in_review":
        row.status = implied_status(starts_on)
    row.updated_at = now
    db.commit()
    loaded = load_disruption(db, row.id)
    assert loaded is not None
    return loaded


def list_disruptions(
    db: Session,
    user: User,
    *,
    status: str | None = None,
    kind: str | None = None,
) -> list[Disruption]:
    query = visible_query(db, user).order_by(Disruption.id.desc())
    if status:
        query = query.filter(Disruption.status == status)
    if kind:
        query = query.filter(Disruption.kind == kind)
    return query.all()


def preview_impact(db: Session, user: User, payload: dict) -> dict:
    session = active_session(db)
    data = scoped_payload(user, dict(payload), db)
    validate_window(
        data["starts_on"],
        data["ends_on"],
        data.get("start_period"),
        data.get("end_period"),
    )
    apply_resource(db, data)
    return compute_impact(
        db,
        kind=data["kind"],
        room_id=data.get("room_id"),
        lecturer_id=data.get("lecturer_id"),
        starts_on=data["starts_on"],
        ends_on=data["ends_on"],
        start_period=data.get("start_period"),
        end_period=data.get("end_period"),
        session=session,
    )


def impact_for(db: Session, row: Disruption) -> dict:
    return compute_impact(
        db,
        kind=row.kind,
        room_id=row.room_id,
        lecturer_id=row.lecturer_id,
        starts_on=row.starts_on,
        ends_on=row.ends_on,
        start_period=row.start_period,
        end_period=row.end_period,
        session=row.session,
    )


def summarise(db: Session, user: User) -> dict:
    rows = list_disruptions(db, user)
    active_rows = [row for row in rows if row.status in ACTIVE_STATUSES]
    scheduled = sum(1 for row in rows if row.status == "scheduled")
    classes_keys: set[tuple[int, int]] = set()
    students = 0
    published = False
    student_total = 0
    seen_cohorts: set[tuple[int, str]] = set()
    for row in active_rows:
        impact = impact_for(db, row)
        published = published or impact["published"]
        for item in impact["classes"]:
            key = (item["assignment_id"], item["meeting_index"])
            classes_keys.add(key)
            cohort_key = (item["assignment_id"], item["cohort_code"] or "")
            if cohort_key not in seen_cohorts:
                seen_cohorts.add(cohort_key)
                student_total += item["cohort_size"]
        students = student_total
    return {
        "active": len(active_rows),
        "scheduled": scheduled,
        "open": sum(1 for row in rows if row.status == "open"),
        "in_review": sum(1 for row in rows if row.status == "in_review"),
        "room_active": sum(1 for row in active_rows if row.kind == "room"),
        "lecturer_active": sum(1 for row in active_rows if row.kind == "lecturer"),
        "classes_affected": len(classes_keys),
        "students_affected": students,
        "published": published or current_version(db) is not None,
    }
