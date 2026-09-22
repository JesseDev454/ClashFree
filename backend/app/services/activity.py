"""In-app notifications, audit rows, and toggle-gated email."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session, joinedload

from app.core.schedule import PERIODS, SLOT_COUNT
from app.models.academic import Course, CourseAssignment, Lecturer, Room
from app.models.activity import AuditEvent, Notification
from app.models.constraints import RoomAvailabilityBlock
from app.models.disruption import Disruption
from app.models.identity import User
from app.models.portal import ScheduleRequest
from app.models.timetable import TimetableVersion
from app.services.mailer import get_mailer
from app.services.publish import compute_changes, current_version
from app.services.timetable import active_session

TIMETABLE_HREF = {
    "timetable_administrator": "/admin/timetable-versions",
    "department_coordinator": "/coordinator/department-timetable",
    "lecturer": "/lecturer/timetable-changes",
    "student": "/student/timetable-changes",
    "facilities_manager": "/facilities/affected-classes",
}
REQUEST_HREF = {
    "department_coordinator": "/coordinator/change-requests",
    "lecturer": "/lecturer/change-requests",
}
DISRUPTION_HREF = {
    "timetable_administrator": "/admin/disruption-centre",
    "facilities_manager": "/facilities/affected-classes",
}
OPEN_DISRUPTION_STATUSES = ("open", "in_review")


def add_audit(
    db: Session,
    *,
    actor_id: int | None,
    action: str,
    entity_type: str,
    entity_id: int | None,
    summary: str,
) -> None:
    db.add(
        AuditEvent(
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            summary=summary[:255],
            created_at=datetime.now(UTC),
        )
    )


def add_notifications(
    db: Session,
    user_ids: set[int],
    *,
    kind: str,
    title: str,
    body: str,
    href_for_role: dict[str, str],
) -> list[int]:
    if not user_ids:
        return []
    users = db.query(User).filter(User.id.in_(user_ids), User.is_active.is_(True)).all()
    now = datetime.now(UTC)
    rows: list[Notification] = []
    for user in users:
        row = Notification(
            user_id=user.id,
            kind=kind,
            title=title[:255],
            body=body,
            href=href_for_role.get(user.role),
            email_sent=False,
            created_at=now,
        )
        db.add(row)
        rows.append(row)
    db.flush()
    return [row.id for row in rows]


def deliver_email(db: Session, notification_ids: list[int], toggle: str) -> None:
    if not notification_ids:
        return
    from app.services.portals import settings_for

    rows = (
        db.query(Notification)
        .options(joinedload(Notification.user))
        .filter(Notification.id.in_(notification_ids))
        .all()
    )
    mailer = get_mailer()
    for row in rows:
        user = row.user
        if user is None or not user.is_active:
            continue
        if not settings_for(db, user.id).get(toggle):
            continue
        try:
            mailer.send(user.email, row.title, row.body)
        except Exception:
            row.email_sent = False
            continue
        row.email_sent = True
    db.commit()


def _active_ids(db: Session, role: str, **filters) -> set[int]:
    query = db.query(User.id).filter(User.role == role, User.is_active.is_(True))
    for column, value in filters.items():
        query = query.filter(getattr(User, column) == value)
    return {row[0] for row in query.all()}


def audience_for_assignments(db: Session, assignment_ids: set[int]) -> set[int]:
    recipients = _active_ids(db, "timetable_administrator")
    if not assignment_ids:
        return recipients
    assignments = (
        db.query(CourseAssignment)
        .options(
            joinedload(CourseAssignment.course),
            joinedload(CourseAssignment.lecturer),
        )
        .filter(CourseAssignment.id.in_(assignment_ids))
        .all()
    )
    lecturer_user_ids = {
        row.lecturer.user_id
        for row in assignments
        if row.lecturer is not None and row.lecturer.user_id is not None
    }
    if lecturer_user_ids:
        recipients.update(
            row[0]
            for row in db.query(User.id)
            .filter(
                User.id.in_(lecturer_user_ids),
                User.role == "lecturer",
                User.is_active.is_(True),
            )
            .all()
        )
    cohort_ids = {row.cohort_id for row in assignments}
    if cohort_ids:
        recipients.update(
            row[0]
            for row in db.query(User.id)
            .filter(
                User.role == "student",
                User.is_active.is_(True),
                User.cohort_id.in_(cohort_ids),
            )
            .all()
        )
    department_ids = {row.course.department_id for row in assignments if row.course is not None}
    if department_ids:
        recipients.update(
            row[0]
            for row in db.query(User.id)
            .filter(
                User.role == "department_coordinator",
                User.is_active.is_(True),
                User.department_id.in_(department_ids),
            )
            .all()
        )
    return recipients


def notify_publish(
    db: Session,
    *,
    actor_id: int,
    version: TimetableVersion,
    previous_slots,
    new_slots,
) -> None:
    changes = compute_changes(previous_slots, new_slots)
    assignment_ids = {item["assignment_id"] for item in changes}
    title = f"Timetable v{version.version_number} published"
    body = f"{len(changes)} meetings changed."
    note_ids = add_notifications(
        db,
        audience_for_assignments(db, assignment_ids),
        kind="timetable_change",
        title=title,
        body=body,
        href_for_role=TIMETABLE_HREF,
    )
    add_audit(
        db,
        actor_id=actor_id,
        action="timetable.published",
        entity_type="timetable_version",
        entity_id=version.id,
        summary=title,
    )
    db.commit()
    deliver_email(db, note_ids, "notify_timetable_changes")


def notify_request(db: Session, *, actor_id: int, row: ScheduleRequest, created: bool) -> None:
    if created:
        recipients = _active_ids(db, "department_coordinator", department_id=row.department_id)
        title = f"Request submitted: {row.title}"
        action = "request.created"
    else:
        recipients = {row.requester_id}
        title = f"Request {row.status}: {row.title}"
        action = "request.decided"
    note_ids = add_notifications(
        db,
        recipients,
        kind="request",
        title=title,
        body=row.detail,
        href_for_role=REQUEST_HREF,
    )
    add_audit(
        db,
        actor_id=actor_id,
        action=action,
        entity_type="schedule_request",
        entity_id=row.id,
        summary=title,
    )
    db.commit()
    deliver_email(db, note_ids, "notify_requests")


def notify_disruption(db: Session, *, actor_id: int, row: Disruption, created: bool) -> None:
    recipients: set[int] = set()
    recipients.update(_active_ids(db, "timetable_administrator"))
    recipients.update(_active_ids(db, "facilities_manager"))
    verb = "reported" if created else row.status
    title = f"Disruption {verb}: {row.reason}"
    note_ids = add_notifications(
        db,
        recipients,
        kind="disruption",
        title=title,
        body=row.description or row.reason,
        href_for_role=DISRUPTION_HREF,
    )
    add_audit(
        db,
        actor_id=actor_id,
        action="disruption.created" if created else "disruption.updated",
        entity_type="disruption",
        entity_id=row.id,
        summary=title,
    )
    db.commit()
    deliver_email(db, note_ids, "notify_timetable_changes")


def _period_span(start: str, end: str) -> int:
    begin = PERIODS.index(start) if start in PERIODS else 0
    finish = PERIODS.index(end) if end in PERIODS else begin
    if finish < begin:
        finish = begin
    return finish - begin + 1


def _previous_version(db: Session, current: TimetableVersion) -> TimetableVersion | None:
    return (
        db.query(TimetableVersion)
        .options(joinedload(TimetableVersion.slots))
        .filter(
            TimetableVersion.session_id == current.session_id,
            TimetableVersion.version_number < current.version_number,
        )
        .order_by(TimetableVersion.version_number.desc())
        .first()
    )


def _department_assignment_ids(db: Session, department_id: int) -> set[int]:
    rows = (
        db.query(CourseAssignment.id)
        .join(Course, Course.id == CourseAssignment.course_id)
        .filter(Course.department_id == department_id)
        .all()
    )
    return {row[0] for row in rows}


def report_counts(db: Session, *, department_id: int | None) -> dict:
    session = active_session(db)
    published = current_version(db, session.id if session is not None else None)
    assignment_ids = (
        _department_assignment_ids(db, department_id) if department_id is not None else None
    )
    meeting_count = 0
    utilization = 0
    change_count = 0
    if published is not None:
        slots = published.slots
        if assignment_ids is not None:
            slots = [slot for slot in slots if slot.assignment_id in assignment_ids]
        meeting_count = len(slots)
        if department_id is None:
            utilization = published.room_utilization_percent
        else:
            occupied: dict[int, int] = {}
            for slot in slots:
                occupied[slot.room_id] = occupied.get(slot.room_id, 0) + _period_span(
                    slot.start_period, slot.end_period
                )
            if occupied:
                utilization = round(100 * sum(occupied.values()) / (len(occupied) * SLOT_COUNT))
        previous = _previous_version(db, published)
        changes = compute_changes(previous.slots if previous is not None else [], published.slots)
        if assignment_ids is not None:
            changes = [item for item in changes if item["assignment_id"] in assignment_ids]
        change_count = len(changes)

    disruption_query = db.query(Disruption).filter(Disruption.status.in_(OPEN_DISRUPTION_STATUSES))
    request_query = db.query(ScheduleRequest).filter(ScheduleRequest.status == "pending")
    if department_id is not None:
        request_query = request_query.filter(ScheduleRequest.department_id == department_id)
        lecturer_ids = {
            row[0]
            for row in db.query(Lecturer.id).filter(Lecturer.department_id == department_id).all()
        }
        room_ids: set[int] = set()
        if published is not None and assignment_ids is not None:
            room_ids = {
                slot.room_id for slot in published.slots if slot.assignment_id in assignment_ids
            }
        disruption_ids = [
            row.id
            for row in disruption_query.all()
            if (row.lecturer_id is not None and row.lecturer_id in lecturer_ids)
            or (row.room_id is not None and row.room_id in room_ids)
        ]
        open_disruptions = len(disruption_ids)
    else:
        open_disruptions = disruption_query.count()
    return {
        "meeting_count": meeting_count,
        "room_utilization_percent": utilization,
        "change_count": change_count,
        "open_disruptions": open_disruptions,
        "pending_requests": request_query.count(),
    }


def room_utilization(db: Session) -> list[dict]:
    session = active_session(db)
    published = current_version(db, session.id if session is not None else None)
    occupied: dict[int, int] = {}
    if published is not None:
        for slot in published.slots:
            occupied[slot.room_id] = occupied.get(slot.room_id, 0) + _period_span(
                slot.start_period, slot.end_period
            )
    rooms = db.query(Room).order_by(Room.code).all()
    rows = []
    for room in rooms:
        used = min(occupied.get(room.id, 0), SLOT_COUNT)
        rows.append(
            {
                "room_id": room.id,
                "room_code": room.code,
                "building": room.building,
                "status": room.status,
                "occupied_slots": used,
                "week_slots": SLOT_COUNT,
                "utilization_percent": round(100 * used / SLOT_COUNT),
            }
        )
    return rows


def facility_history(db: Session) -> list[dict]:
    items: list[dict] = []
    disruptions = (
        db.query(Disruption)
        .options(joinedload(Disruption.room))
        .order_by(Disruption.created_at.desc())
        .all()
    )
    for row in disruptions:
        items.append(
            {
                "id": f"disruption-{row.id}",
                "source": "disruption",
                "title": row.reason,
                "detail": row.description or row.reason,
                "room_code": row.room.code if row.room is not None else None,
                "occurred_at": row.created_at,
                "status": row.status,
            }
        )
    blocks = (
        db.query(RoomAvailabilityBlock)
        .options(joinedload(RoomAvailabilityBlock.room))
        .filter(RoomAvailabilityBlock.kind == "maintenance")
        .all()
    )
    for row in blocks:
        items.append(
            {
                "id": f"maintenance-{row.id}",
                "source": "maintenance",
                "title": row.reason,
                "detail": row.reason,
                "room_code": row.room.code if row.room is not None else None,
                "occurred_at": datetime.combine(row.starts_on, datetime.min.time(), tzinfo=UTC),
                "status": row.kind,
            }
        )
    items.sort(key=lambda item: item["occurred_at"], reverse=True)
    return items
