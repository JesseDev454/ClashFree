from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.activity import AuditEvent, Notification
from app.models.identity import User
from app.services.portal_seed import seed_phase9

STUDENT_NOTICE = "Phase 10 timetable notice"
ADMIN_NOTICE = "Phase 10 admin notice"
AUDIT_SUMMARY = "Phase 10 catalogue"


def seed_phase10(session: Session) -> None:
    """Record one student notice, one admin notice, and one audit row."""
    seed_phase9(session)
    now = datetime.now(UTC)
    student = session.query(User).filter(User.email == "student@clashfree.test").one_or_none()
    admin = session.query(User).filter(User.email == "admin@clashfree.test").one_or_none()
    if student is not None and _missing_notice(session, STUDENT_NOTICE):
        session.add(
            Notification(
                user_id=student.id,
                kind="timetable_change",
                title=STUDENT_NOTICE,
                body="Your cohort timetable has a seeded notice.",
                href="/student/notifications",
                email_sent=False,
                created_at=now,
            )
        )
    if admin is not None and _missing_notice(session, ADMIN_NOTICE):
        session.add(
            Notification(
                user_id=admin.id,
                kind="timetable_change",
                title=ADMIN_NOTICE,
                body="Administrator catalogue notice.",
                href="/admin/notifications",
                email_sent=False,
                created_at=now,
            )
        )
    existing_audit = (
        session.query(AuditEvent).filter(AuditEvent.summary == AUDIT_SUMMARY).one_or_none()
    )
    if existing_audit is None:
        session.add(
            AuditEvent(
                actor_id=admin.id if admin is not None else None,
                action="catalogue.seeded",
                entity_type="catalogue",
                entity_id=None,
                summary=AUDIT_SUMMARY,
                created_at=now,
            )
        )
    session.commit()


def _missing_notice(session: Session, title: str) -> bool:
    return session.query(Notification).filter(Notification.title == title).one_or_none() is None
