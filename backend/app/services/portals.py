from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.rbac import APP_ROLES
from app.core.schedule import PERIODS, WEEKDAYS
from app.core.security import hash_password
from app.models.academic import ROOM_TYPES, Cohort, Course, CourseAssignment, Lecturer
from app.models.constraints import LecturerAvailabilitySlot
from app.models.identity import Department, User
from app.models.portal import (
    CONSTRAINT_KINDS,
    REQUEST_KINDS,
    REQUEST_STATUSES,
    ScheduleRequest,
    UserSettings,
)
from app.schemas.portal import SettingsIn
from app.services.disruptions import period_span
from app.services.publish import compute_changes, current_version, version_slot_options
from app.services.timetable import active_session

SCOPED_ROLES = {"department_coordinator", "lecturer", "student"}
DEFAULT_SETTINGS = SettingsIn().model_dump()


class PortalError(ValueError):
    def __init__(self, message: str, status_code: int = 409) -> None:
        super().__init__(message)
        self.status_code = status_code


def ensure_role(role: str) -> str:
    if role not in APP_ROLES:
        raise PortalError(f"role must be one of: {', '.join(APP_ROLES)}", 422)
    return role


def ensure_scope(
    db: Session,
    role: str,
    department_id: int | None,
    cohort_id: int | None,
) -> tuple[int | None, int | None]:
    if role in SCOPED_ROLES and department_id is None:
        raise PortalError("This role requires a department", 422)
    if role == "student" and cohort_id is None:
        raise PortalError("Students require a cohort", 422)
    if role != "student":
        cohort_id = None
    if department_id is not None and db.get(Department, department_id) is None:
        raise PortalError("Department not found", 404)
    if cohort_id is not None:
        cohort = db.get(Cohort, cohort_id)
        if cohort is None:
            raise PortalError("Cohort not found", 404)
        if cohort.department_id != department_id:
            raise PortalError("Cohort must belong to the user's department", 422)
    return department_id, cohort_id


def link_lecturer(db: Session, user: User, lecturer_id: int | None) -> None:
    current = db.query(Lecturer).filter(Lecturer.user_id == user.id).one_or_none()
    if user.role != "lecturer":
        if current is not None:
            current.user_id = None
        return
    if lecturer_id is None:
        return
    lecturer = db.get(Lecturer, lecturer_id)
    if lecturer is None:
        raise PortalError("Lecturer not found", 404)
    if lecturer.department_id != user.department_id:
        raise PortalError("Lecturer must belong to the user's department", 422)
    holder = (
        db.query(Lecturer)
        .filter(Lecturer.user_id == user.id, Lecturer.id != lecturer.id)
        .one_or_none()
    )
    if holder is not None:
        holder.user_id = None
    if lecturer.user_id not in {None, user.id}:
        raise PortalError("That lecturer is already linked to another account", 409)
    lecturer.user_id = user.id
    if current is not None and current.id != lecturer.id:
        current.user_id = None


def assert_keeps_an_admin(db: Session, user: User, next_role: str, next_active: bool) -> None:
    if user.role != "timetable_administrator" or not user.is_active:
        return
    if next_role == "timetable_administrator" and next_active:
        return
    others = (
        db.query(User)
        .filter(
            User.role == "timetable_administrator",
            User.is_active.is_(True),
            User.id != user.id,
        )
        .count()
    )
    if others == 0:
        raise PortalError("The last active administrator cannot be removed", 409)


def apply_password(user: User, password: str | None) -> None:
    if password:
        user.password_hash = hash_password(password)


def settings_for(db: Session, user_id: int) -> dict:
    row = db.get(UserSettings, user_id)
    if row is None:
        return dict(DEFAULT_SETTINGS)
    merged = dict(DEFAULT_SETTINGS)
    merged.update(row.payload or {})
    return SettingsIn.model_validate(merged).model_dump()


def save_settings(db: Session, user_id: int, payload: SettingsIn) -> dict:
    data = payload.model_dump()
    row = db.get(UserSettings, user_id)
    if row is None:
        row = UserSettings(user_id=user_id, payload=data)
        db.add(row)
    else:
        row.payload = data
    db.commit()
    return data


def validate_constraint(payload) -> None:
    if payload.kind not in CONSTRAINT_KINDS:
        raise PortalError(f"kind must be one of: {', '.join(CONSTRAINT_KINDS)}", 422)
    if payload.kind in {"blocked_period", "preferred_period"}:
        if payload.weekday not in WEEKDAYS:
            raise PortalError(f"weekday must be one of: {', '.join(WEEKDAYS)}", 422)
        if payload.period not in PERIODS:
            raise PortalError(f"period must be one of: {', '.join(PERIODS)}", 422)
    if payload.room_type is not None and payload.room_type not in ROOM_TYPES:
        raise PortalError(f"room_type must be one of: {', '.join(ROOM_TYPES)}", 422)


def lecturer_for_user(db: Session, user: User) -> Lecturer:
    row = db.query(Lecturer).filter(Lecturer.user_id == user.id).one_or_none()
    if row is None:
        raise PortalError("No lecturer profile is linked to this account", 409)
    return row


def assignment_ids_for_viewer(db: Session, user: User) -> set[int]:
    if user.role == "lecturer":
        lecturer = lecturer_for_user(db, user)
        rows = db.query(CourseAssignment.id).filter(CourseAssignment.lecturer_id == lecturer.id)
        return {item[0] for item in rows}
    if user.role == "student":
        if user.cohort_id is None:
            raise PortalError("Student is not linked to a cohort", 409)
        rows = db.query(CourseAssignment.id).filter(CourseAssignment.cohort_id == user.cohort_id)
        return {item[0] for item in rows}
    raise PortalError("You do not have permission to perform this action.", 403)


def require_department(user: User) -> int:
    if user.department_id is None:
        raise PortalError("This account has no department", 409)
    return user.department_id


def filter_slots(slots, assignment_ids: set[int] | None = None, department_id: int | None = None):
    chosen = []
    for slot in slots:
        assignment = slot.assignment
        if assignment_ids is not None and slot.assignment_id not in assignment_ids:
            continue
        if department_id is not None:
            course = assignment.course if assignment is not None else None
            if course is None or course.department_id != department_id:
                continue
        chosen.append(slot)
    return chosen


def personal_changes(db: Session, user: User) -> list[dict]:
    session = active_session(db)
    current = current_version(db, session.id if session is not None else None)
    if current is None:
        raise PortalError("Published timetable not found", 404)
    allowed = assignment_ids_for_viewer(db, user)
    previous = (
        db.query(type(current))
        .options(*version_slot_options())
        .filter(
            type(current).session_id == current.session_id,
            type(current).version_number < current.version_number,
        )
        .order_by(type(current).version_number.desc())
        .first()
    )
    before = previous.slots if previous is not None else []
    changes = compute_changes(before, current.slots)
    return [item for item in changes if item.get("assignment_id") in allowed]


def published_conflicts(slots, department_id: int) -> list[dict]:
    relevant = []
    for slot in slots:
        course = slot.assignment.course if slot.assignment is not None else None
        if course is not None and course.department_id == department_id:
            relevant.append(slot)
    if not relevant:
        return []
    found: list[dict] = []
    seen: set[tuple] = set()
    for left in relevant:
        left_periods = period_span(left.start_period, left.end_period)
        left_lecturer = left.assignment.lecturer_id if left.assignment is not None else None
        left_cohort = left.assignment.cohort_id if left.assignment is not None else None
        for right in slots:
            if right.id == left.id:
                continue
            if right.weekday != left.weekday:
                continue
            overlap = left_periods & period_span(right.start_period, right.end_period)
            if not overlap:
                continue
            right_lecturer = right.assignment.lecturer_id if right.assignment is not None else None
            right_cohort = right.assignment.cohort_id if right.assignment is not None else None
            kind = None
            title = None
            if left.room_id == right.room_id:
                kind, title = "room", "Room double-booked"
            elif left_lecturer is not None and left_lecturer == right_lecturer:
                kind, title = "lecturer", "Lecturer double-booked"
            elif left_cohort is not None and left_cohort == right_cohort:
                kind, title = "cohort", "Cohort double-booked"
            if kind is None:
                continue
            period = sorted(overlap)[0]
            key = (kind, left.weekday, period, min(left.id, right.id), max(left.id, right.id))
            if key in seen:
                continue
            seen.add(key)
            found.append(
                {
                    "kind": kind,
                    "severity": "high",
                    "title": title,
                    "detail": f"{title} on {left.weekday} {period}.",
                    "weekday": left.weekday,
                    "period": period,
                    "assignment_ids": [left.assignment_id, right.assignment_id],
                }
            )
    return found


def create_request(db: Session, user: User, payload) -> ScheduleRequest:
    session = active_session(db)
    if session is None:
        raise PortalError("No active academic session")
    department_id = require_department(user)
    if payload.kind not in REQUEST_KINDS:
        raise PortalError(f"kind must be one of: {', '.join(REQUEST_KINDS)}", 422)
    if user.role == "lecturer" and payload.kind != "change":
        raise PortalError("Lecturers can only submit change requests", 422)
    if user.role not in {"lecturer", "department_coordinator"}:
        raise PortalError("You do not have permission to perform this action.", 403)
    if payload.assignment_id is not None:
        assignment = db.get(CourseAssignment, payload.assignment_id)
        if assignment is None:
            raise PortalError("Assignment not found", 404)
        course = db.get(Course, assignment.course_id)
        if course is None or course.department_id != department_id:
            raise PortalError("Assignment is outside this department", 403)
    row = ScheduleRequest(
        session_id=session.id,
        department_id=department_id,
        requester_id=user.id,
        kind=payload.kind,
        status="pending",
        title=payload.title.strip(),
        detail=payload.detail.strip(),
        assignment_id=payload.assignment_id,
        created_at=datetime.now(UTC),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_requests(db: Session, user: User) -> list[ScheduleRequest]:
    query = db.query(ScheduleRequest)
    if user.role == "lecturer":
        query = query.filter(ScheduleRequest.requester_id == user.id)
    elif user.role == "department_coordinator":
        query = query.filter(ScheduleRequest.department_id == require_department(user))
    else:
        raise PortalError("You do not have permission to perform this action.", 403)
    return query.order_by(ScheduleRequest.created_at.desc()).all()


def decide_request(db: Session, user: User, request_id: int, status: str) -> ScheduleRequest:
    if user.role != "department_coordinator":
        raise PortalError("You do not have permission to perform this action.", 403)
    if status not in REQUEST_STATUSES:
        raise PortalError(f"status must be one of: {', '.join(REQUEST_STATUSES)}", 422)
    row = db.get(ScheduleRequest, request_id)
    if row is None or row.department_id != require_department(user):
        raise PortalError("Request not found", 404)
    row.status = status
    row.decided_at = datetime.now(UTC)
    row.decided_by = user.id
    db.commit()
    db.refresh(row)
    return row


def availability_summary(db: Session, department_id: int) -> list[dict]:
    lecturers = (
        db.query(Lecturer)
        .filter(Lecturer.department_id == department_id)
        .order_by(Lecturer.full_name)
        .all()
    )
    counts: dict[int, int] = {}
    if lecturers:
        ids = [row.id for row in lecturers]
        for lecturer_id, _slot_id in (
            db.query(LecturerAvailabilitySlot.lecturer_id, LecturerAvailabilitySlot.id)
            .filter(LecturerAvailabilitySlot.lecturer_id.in_(ids))
            .all()
        ):
            counts[lecturer_id] = counts.get(lecturer_id, 0) + 1
    return [
        {
            "lecturer_id": row.id,
            "full_name": row.full_name,
            "slot_count": counts.get(row.id, 0),
            "submitted": counts.get(row.id, 0) > 0,
        }
        for row in lecturers
    ]
