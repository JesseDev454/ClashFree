from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import require_roles
from app.core.database import get_db
from app.models.activity import AuditEvent, Notification
from app.models.identity import User
from app.schemas.activity import AuditEventOut, NotificationOut, ReadAllOut, ReportOut
from app.services.activity import report_counts
from app.services.portals import PortalError, require_department

router = APIRouter(tags=["activity"])
admin_only = require_roles("timetable_administrator")
coordinator_only = require_roles("department_coordinator")
any_member = require_roles(
    "timetable_administrator",
    "department_coordinator",
    "lecturer",
    "facilities_manager",
    "student",
)


@router.get("/api/notifications", response_model=list[NotificationOut])
def list_notifications(
    db: Session = Depends(get_db),
    user: User = Depends(any_member),
) -> list[Notification]:
    return (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .all()
    )


@router.patch("/api/notifications/{notification_id}", response_model=NotificationOut)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(any_member),
) -> Notification:
    row = db.get(Notification, notification_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if row.read_at is None:
        row.read_at = datetime.now(UTC)
        db.commit()
        db.refresh(row)
    return row


@router.post("/api/notifications/read-all", response_model=ReadAllOut)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    user: User = Depends(any_member),
) -> ReadAllOut:
    now = datetime.now(UTC)
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.read_at.is_(None))
        .all()
    )
    for row in rows:
        row.read_at = now
    db.commit()
    return ReadAllOut(updated=len(rows))


@router.get("/api/audit", response_model=list[AuditEventOut])
def list_audit(
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> list[AuditEventOut]:
    rows = (
        db.query(AuditEvent)
        .options(joinedload(AuditEvent.actor))
        .order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc())
        .all()
    )
    return [
        AuditEventOut(
            id=row.id,
            actor_id=row.actor_id,
            actor_name=row.actor.full_name if row.actor is not None else None,
            action=row.action,
            entity_type=row.entity_type,
            entity_id=row.entity_id,
            summary=row.summary,
            created_at=row.created_at,
        )
        for row in rows
    ]


@router.get("/api/reports/university", response_model=ReportOut)
def university_report(
    db: Session = Depends(get_db),
    _user: User = Depends(admin_only),
) -> ReportOut:
    return ReportOut(**report_counts(db, department_id=None))


@router.get("/api/reports/department", response_model=ReportOut)
def department_report(
    db: Session = Depends(get_db),
    user: User = Depends(coordinator_only),
) -> ReportOut:
    try:
        department_id = require_department(user)
    except PortalError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    return ReportOut(**report_counts(db, department_id=department_id))
